import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { LoadingState } from '../components/Loader.jsx';
import { LightProduct, LightShell, PinIcon, placeText, stamp } from '../components/LightShell.jsx';
import { rememberReturn } from '../utils/returnTo';

// What a light QR opens (public): the product, this unit's QR ID, the scan just recorded (with
// where, once the browser shares it), and the way to add an update or see the history.

// One scan per opening of the page (React's development double-run, or a quick reload, isn't
// counted twice). Resolves to { scannedAt, location } as they become known.
const recent = new Map();
const recordScan = (token, onScan, onLocation) => {
  const last = recent.get(token);
  if (last && Date.now() - last.at < 5000) {
    last.listeners.push([onScan, onLocation]);
    if (last.scan) onScan(last.scan);
    if (last.location !== undefined) onLocation(last.location);
    return;
  }
  const entry = { at: Date.now(), listeners: [[onScan, onLocation]], scan: null, location: undefined };
  recent.set(token, entry);
  const emitLocation = (location) => {
    entry.location = location;
    entry.listeners.forEach(([, l]) => l(location));
  };
  api
    .post(`/light-qr/public/${token}/scans`)
    .then(({ data }) => {
      entry.scan = data;
      entry.listeners.forEach(([s]) => s(data));
      if (!navigator.geolocation) return emitLocation(null);
      navigator.geolocation.getCurrentPosition(
        ({ coords }) =>
          api
            .patch(`/light-qr/public/scans/${data.scanToken}/location`, { latitude: coords.latitude, longitude: coords.longitude })
            .then(({ data: body }) => emitLocation(body.location))
            .catch(() => emitLocation(null)),
        () => emitLocation(null),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
      return null;
    })
    .catch(() => {});
};

const CheckCircle = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 12.5 4 4L18 8.5" />
  </svg>
);
const CameraIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9Z" />
    <circle cx="12" cy="13" r="3.2" />
  </svg>
);
const ListIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
  </svg>
);

const LightView = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [status, setStatus] = useState('loading');
  const [scan, setScan] = useState(null);
  const [location, setLocation] = useState(undefined); // undefined = still finding out

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    api
      .get(`/light-qr/public/${encodeURIComponent(token)}`)
      .then(({ data }) => {
        if (cancelled) return;
        setInfo(data);
        setStatus('ready');
        recordScan(
          data.token,
          (s) => !cancelled && setScan(s),
          (l) => !cancelled && setLocation(l)
        );
      })
      .catch(() => !cancelled && setStatus('missing'));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const addUpdate = () => {
    if (info.signedIn) return navigate(`/l/${info.token}/update`);
    rememberReturn(`/l/${info.token}/update`);
    return navigate('/login');
  };

  return (
    <LightShell>
      {status === 'loading' && <LoadingState className="olq-loading" label="Checking this QR code…" />}

      {status === 'missing' && (
        <div className="olq-missing">
          <span aria-hidden="true">✕</span>
          <h2>QR code not found</h2>
          <p>This code isn&apos;t in OriginHash records. It may not be a genuine OriginHash label.</p>
        </div>
      )}

      {status === 'ready' && info && (
        <div className="olq-body">
          <LightProduct info={info} />

          <section className="olq-qrid">
            <span>QR ID</span>
            <strong>{info.code}</strong>
          </section>

          <section className="olq-row">
            <span className="olq-tick">
              <CheckCircle />
            </span>
            <div>
              <strong>Verified product</strong>
              <span>This is a valid OriginHash QR code.</span>
            </div>
          </section>

          <section className="olq-row recorded" aria-live="polite">
            <span className="olq-tick">
              <CheckCircle />
            </span>
            <div>
              <strong>{scan ? 'Scan recorded' : 'Recording your scan…'}</strong>
              {scan && <span>{stamp(scan.scannedAt)}</span>}
              {scan && (
                <span className="olq-place">
                  <PinIcon />
                  {location === undefined ? 'Finding your location…' : placeText(location) || 'Location not shared'}
                </span>
              )}
            </div>
          </section>

          <p className="olq-note">
            This scan is linked to this specific QR code ({info.code}).
          </p>

          {info.myUpdate ? (
            <section className="olq-mine">
              <img src={info.myUpdate.photoUrl} alt="Your update" />
              <div>
                <strong>You added your update</strong>
                <span>{stamp(info.myUpdate.at)}</span>
                <p>{info.myUpdate.comment}</p>
              </div>
            </section>
          ) : (
            <button type="button" className="olq-btn primary" onClick={addUpdate}>
              <CameraIcon /> {info.signedIn ? 'Add update' : 'Sign in to add an update'}
            </button>
          )}
          {info.canSeeHistory && (
            <button type="button" className="olq-btn ghost" onClick={() => navigate(`/l/${info.token}/history`)}>
              <ListIcon /> View history
            </button>
          )}
          <p className="olq-privacy">Opening this page is recorded for the brand, with your approximate location if you allow it.</p>
        </div>
      )}
    </LightShell>
  );
};

export default LightView;
