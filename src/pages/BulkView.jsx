import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../api/axios';
import BrandLogo from '../components/BrandLogo.jsx';
import { LoadingState } from '../components/Loader.jsx';
import '../styles/bulk-view.css';

// Records one scan per opening of the page (React's development double-run, a quick reload or the
// back button within a few seconds don't count twice), then adds where it happened if the person
// allows the browser to share their location.
const recentScans = new Map();
const recordScan = (code) => {
  const last = recentScans.get(code);
  if (last && Date.now() - last < 5000) return;
  recentScans.set(code, Date.now());
  api
    .post(`/bulk-qr/public/${encodeURIComponent(code)}/scans`)
    .then(({ data }) => {
      if (!data?.scanToken || !navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        ({ coords }) =>
          api
            .patch(`/bulk-qr/public/scans/${data.scanToken}/location`, { latitude: coords.latitude, longitude: coords.longitude })
            .catch(() => {}),
        () => {},
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
    })
    .catch(() => {});
};

const longDate = (value) =>
  new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

// What a bulk (identical) QR label opens: everything recorded when the labels were generated.
// Public — anyone holding the product can read it, signed in or not.
const BulkView = () => {
  const { code } = useParams();
  const preview = useSearchParams()[0].get('preview') === '1';
  const navigate = useNavigate();
  const signedIn = useSelector((s) => Boolean(s.auth.token));
  const [status, setStatus] = useState('loading');
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    api
      .get(`/bulk-qr/public/${encodeURIComponent(code)}`, { params: preview ? { preview: 1 } : {} })
      .then(({ data: body }) => {
        if (cancelled) return;
        setData(body);
        setStatus('ready');
        // The creator's own previews (?preview=1) aren't scans.
        if (!preview) recordScan(body.code);
      })
      .catch(() => !cancelled && setStatus('missing'));
    return () => {
      cancelled = true;
    };
  }, [code, preview]);

  const rows = data
    ? [
        ['Brand', data.brandName],
        ['Product', data.productName],
        ['Batch', data.batchNo],
        ['Pack size', data.packSize],
        data.purposeLabel && ['Purpose', data.purposeLabel],
        ['Generated on', longDate(data.generatedAt)],
        ['Labels in this batch', data.quantity.toLocaleString('en-IN')],
      ].filter(Boolean)
    : [];

  return (
    <div className="obv-page">
      <main className="obv-card" aria-busy={status === 'loading'}>
        <header className="obv-head">
          <span className="obv-brand">
            <span className="obv-logo">
              <BrandLogo size={16} />
            </span>
            OriginHash
          </span>
          {signedIn && window.history.length > 1 && (
            <button type="button" className="obv-back" onClick={() => navigate(-1)}>
              ← Back
            </button>
          )}
        </header>

        {status === 'loading' && <LoadingState className="obv-loading" label="Loading product details…" />}

        {status === 'missing' && (
          <div className="obv-missing">
            <span className="obv-missing-icon" aria-hidden="true">
              ✕
            </span>
            <h1>QR code not found</h1>
            <p>This code isn&apos;t in OriginHash records. Check that you scanned the right label.</p>
          </div>
        )}

        {status === 'ready' && data && (
          <>
            <section className="obv-hero">
              <span className="obv-eyebrow">{data.brandName}</span>
              <h1>{data.productName}</h1>
              <p className="obv-pack">{data.packSize}</p>
              {data.expiryDate && (
                <span className={`obv-expiry ${data.expired ? 'expired' : ''}`}>
                  {data.expired ? 'Expired on ' : 'Best before '}
                  {longDate(data.expiryDate)}
                </span>
              )}
            </section>

            <dl className="obv-details">
              {rows.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>

            <footer className="obv-foot">
              <span>Reference</span>
              <code>{data.code}</code>
            </footer>
            <p className="obv-privacy">
              Opening this page is recorded for the brand, with your approximate location if you allow it.
            </p>
          </>
        )}
      </main>
    </div>
  );
};

export default BulkView;
