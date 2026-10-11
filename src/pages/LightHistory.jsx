import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { LoadingState } from '../components/Loader.jsx';
import { LightProduct, LightShell } from '../components/LightShell.jsx';
import LightTimeline from '../components/LightTimeline.jsx';
import { rememberReturn } from '../utils/returnTo';

// A light QR code's journey, oldest first: created, every scan (who, where, when) and every update
// (photo and comment). Admins, super-admins and the user who generated the batch.

const LightHistory = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const signedIn = Boolean(localStorage.getItem('oh_token'));
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!signedIn) {
      rememberReturn(`/l/${token}/history`);
      navigate('/login', { replace: true });
      return undefined;
    }
    let cancelled = false;
    api
      .get(`/light-qr/public/${encodeURIComponent(token)}/history`)
      .then(({ data: body }) => {
        if (cancelled) return;
        setData(body);
        setStatus('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.response?.status === 401) {
          rememberReturn(`/l/${token}/history`);
          navigate('/login', { replace: true });
          return;
        }
        setError(err.response?.data?.message || 'Could not load the history.');
        setStatus('failed');
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn, token, navigate]);

  const back = () => (window.history.length > 1 ? navigate(-1) : navigate(`/l/${token}`));
  if (!signedIn) return null;

  return (
    <LightShell title={data ? `${data.code} history` : 'History'} onBack={back}>
      {status === 'loading' && <LoadingState className="olq-loading" label="Loading history…" />}
      {status === 'failed' && (
        <div className="olq-missing">
          <span aria-hidden="true">!</span>
          <h2>History not available</h2>
          <p>{error}</p>
        </div>
      )}

      {status === 'ready' && data && (
        <div className="olq-body">
          <LightProduct info={data} compact />
          <div className="olq-chip">QR ID: {data.code}</div>

          <LightTimeline data={data} />
        </div>
      )}
    </LightShell>
  );
};

export default LightHistory;
