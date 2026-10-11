import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { LoadingState, Spinner } from '../components/Loader.jsx';
import { LightProduct, LightShell, stamp } from '../components/LightShell.jsx';
import { rememberReturn } from '../utils/returnTo';

// A signed-in user's one update on a light QR code: a photo (camera or gallery) and a comment,
// with where it was taken when the browser shares it.

const COMMENT_MAX = 500;
const MAX_SIDE = 1600; // photos are shrunk to this before upload (phone photos are often 5–12 MB)

// A smaller JPEG of the chosen photo, so it uploads quickly and stays under the 5 MB limit.
const shrink = (file) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => resolve(blob ? new File([blob], 'update.jpg', { type: 'image/jpeg' }) : file), 'image/jpeg', 0.85);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });

const CameraIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9Z" />
    <circle cx="12" cy="13" r="3.2" />
  </svg>
);
const GalleryIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <circle cx="9" cy="10" r="1.7" />
    <path d="m4.5 17.5 4.5-4.5 3 3 2.5-2.5 5 4.5" />
  </svg>
);

const LightUpdate = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const signedIn = Boolean(localStorage.getItem('oh_token'));
  const [info, setInfo] = useState(null);
  const [status, setStatus] = useState('loading');
  const [photo, setPhoto] = useState(null); // { file, url }
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const whereRef = useRef(null);

  // Not signed in: sign in first, then come straight back here.
  useEffect(() => {
    if (!signedIn) {
      rememberReturn(`/l/${token}/update`);
      navigate('/login', { replace: true });
    }
  }, [signedIn, token, navigate]);

  useEffect(() => {
    if (!signedIn) return undefined;
    let cancelled = false;
    api
      .get(`/light-qr/public/${encodeURIComponent(token)}`)
      .then(({ data }) => {
        if (cancelled) return;
        setInfo(data);
        setStatus('ready');
      })
      .catch(() => !cancelled && setStatus('missing'));
    // Where the update is made, if the browser shares it (asked once, in the background).
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        whereRef.current = { latitude: coords.latitude, longitude: coords.longitude };
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
    return () => {
      cancelled = true;
    };
  }, [signedIn, token]);

  useEffect(() => () => photo && URL.revokeObjectURL(photo.url), [photo]);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Choose a photo (an image file).');
      return;
    }
    setError('');
    const small = await shrink(file);
    setPhoto({ file: small, url: URL.createObjectURL(small) });
  };

  const back = () => navigate(`/l/${token}`, { replace: true });

  const save = async (e) => {
    e.preventDefault();
    if (!photo || !comment.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      const body = new FormData();
      body.append('photo', photo.file);
      body.append('comment', comment.trim());
      if (whereRef.current) {
        body.append('latitude', whereRef.current.latitude);
        body.append('longitude', whereRef.current.longitude);
      }
      await api.post(`/light-qr/public/${info.token}/updates`, body);
      navigate(`/l/${info.token}`, { replace: true });
    } catch (err) {
      if (err.response?.status === 401) {
        rememberReturn(`/l/${token}/update`);
        navigate('/login', { replace: true });
        return;
      }
      setError(err.response?.data?.message || 'Could not save your update. Please try again.');
      setSaving(false);
    }
  };

  if (!signedIn) return null;

  return (
    <LightShell title="Add update" subtitle={info?.code} onBack={back}>
      {status === 'loading' && <LoadingState className="olq-loading" label="Loading…" />}
      {status === 'missing' && (
        <div className="olq-missing">
          <span aria-hidden="true">✕</span>
          <h2>QR code not found</h2>
          <p>This code isn&apos;t in OriginHash records.</p>
        </div>
      )}

      {status === 'ready' && info && info.myUpdate && (
        <div className="olq-body">
          <LightProduct info={info} compact showCode />
          <section className="olq-mine">
            <img src={info.myUpdate.photoUrl} alt="Your update" />
            <div>
              <strong>You&apos;ve already added your update</strong>
              <span>{stamp(info.myUpdate.at)}</span>
              <p>{info.myUpdate.comment}</p>
            </div>
          </section>
          <p className="olq-note">Each person can add one photo and comment to a QR code.</p>
          <button type="button" className="olq-btn ghost" onClick={back}>
            Back to the product
          </button>
        </div>
      )}

      {status === 'ready' && info && !info.myUpdate && (
        <form className="olq-body" onSubmit={save} noValidate>
          <LightProduct info={info} compact showCode />

          <div className="olq-field">
            <span className="olq-label">
              Add photo <em>*</em>
            </span>
            {photo ? (
              <div className="olq-photo">
                <img src={photo.url} alt="Chosen photo" />
                <button type="button" className="olq-photo-remove" onClick={() => setPhoto(null)} aria-label="Remove photo" disabled={saving}>
                  ✕
                </button>
              </div>
            ) : (
              <button type="button" className="olq-photo-empty" onClick={() => cameraRef.current?.click()}>
                <CameraIcon />
                <span>Take a photo of the product</span>
              </button>
            )}
            <div className="olq-photo-actions">
              <button type="button" className="olq-btn primary small" onClick={() => cameraRef.current?.click()} disabled={saving}>
                <CameraIcon /> Take photo
              </button>
              <button type="button" className="olq-btn ghost small" onClick={() => galleryRef.current?.click()} disabled={saving}>
                <GalleryIcon /> Choose from gallery
              </button>
            </div>
            {/* The camera on phones; a file picker elsewhere. */}
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
            <input ref={galleryRef} type="file" accept="image/*" hidden onChange={pick} />
          </div>

          <div className="olq-field">
            <label className="olq-label" htmlFor="olq-comment">
              Add a comment <em>*</em>
            </label>
            <textarea
              id="olq-comment"
              rows={4}
              maxLength={COMMENT_MAX}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Received at Hyderabad warehouse."
              disabled={saving}
            />
            <span className="olq-count">
              {comment.length}/{COMMENT_MAX}
            </span>
          </div>

          {error && (
            <div className="oh-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="olq-btn primary" disabled={!photo || !comment.trim() || saving}>
            {saving ? (
              <>
                <Spinner /> Saving…
              </>
            ) : (
              'Save update'
            )}
          </button>
          <p className="olq-privacy">You can add one update to each QR code, and it can&apos;t be changed later.</p>
        </form>
      )}
    </LightShell>
  );
};

export default LightUpdate;
