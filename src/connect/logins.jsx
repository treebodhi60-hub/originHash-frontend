import { useEffect, useState } from 'react';
import connectApi, { errorText } from './api';
import { Badge, Button, Empty, ErrorNote, Loading, Modal, Stat, fmtDate, fmtDateTime, num } from './ui.jsx';

// Login tracking for producer users: the "Last login" cell on team tables and the history modal.

const timeOf = (value) => new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

const ago = (value) => {
  const ms = Date.now() - new Date(value).getTime();
  if (Number.isNaN(ms)) return '—';
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 30) return `${d} days ago`;
  return fmtDateTime(value);
};

// Never → "Never logged in"; one login → "First login" and when; after that → the last login.
export const LastLogin = ({ user, onHistory }) => {
  const count = user.loginCount || 0;
  if (!count) return <span className="cx-muted">Never logged in</span>;
  return (
    <div className="cx-login-cell">
      {count === 1 ? (
        <>
          <div>
            <Badge tone="info">First login</Badge>
          </div>
          <small>{fmtDateTime(user.firstLoginAt)}</small>
        </>
      ) : (
        <>
          <strong title={fmtDateTime(user.lastLoginAt)}>{ago(user.lastLoginAt)}</strong>
          <small>
            {fmtDateTime(user.lastLoginAt)} · {num(count)} logins
          </small>
        </>
      )}
      {onHistory && (
        <button type="button" className="cx-link cx-login-history" onClick={() => onHistory(user)}>
          View history
        </button>
      )}
    </div>
  );
};

const METHOD = { password: 'Username & password', otp: 'Mobile OTP' };

// `endpoint` returns { user: {loginCount, firstLoginAt, lastLoginAt, …}, logins: [{id, at, method, ip, device}] }.
export const LoginHistoryModal = ({ endpoint, title, onClose }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    connectApi
      .get(endpoint)
      .then(({ data: d }) => live && setData(d))
      .catch((err) => live && setError(errorText(err, 'Could not load the login history.')));
    return () => {
      live = false;
    };
  }, [endpoint]);

  const summary = data?.user;
  const logins = data?.logins || [];
  // The oldest row is the first login only when the whole history fits in the list.
  const firstId = summary && logins.length === summary.loginCount ? logins[logins.length - 1]?.id : null;

  return (
    <Modal
      title={title}
      onClose={onClose}
      wide
      footer={
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      }
    >
      <ErrorNote>{error}</ErrorNote>
      {!data && !error ? (
        <Loading />
      ) : data ? (
        <div className="cx-stack">
          <div className="cx-stats">
            <Stat label="First login" value={fmtDate(summary.firstLoginAt)} note={summary.firstLoginAt ? timeOf(summary.firstLoginAt) : null} />
            <Stat
              label="Last login"
              value={fmtDate(summary.lastLoginAt)}
              note={summary.lastLoginAt ? `${timeOf(summary.lastLoginAt)} · ${ago(summary.lastLoginAt)}` : null}
            />
            <Stat label="Total logins" value={num(summary.loginCount)} />
          </div>
          {logins.length ? (
            <div className="cx-table-wrap">
              <table className="cx-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Signed in with</th>
                    <th>Device</th>
                    <th>IP address</th>
                  </tr>
                </thead>
                <tbody>
                  {logins.map((l) => (
                    <tr key={l.id}>
                      <td>
                        {fmtDateTime(l.at)} {l.id === firstId && <Badge tone="info">First login</Badge>}
                      </td>
                      <td>{METHOD[l.method] || l.method}</td>
                      <td>{l.device || '—'}</td>
                      <td className="cx-mono">{l.ip || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No logins yet." />
          )}
          {summary.loginCount > logins.length && <p className="cx-muted">Showing the latest {num(logins.length)} logins.</p>}
        </div>
      ) : null}
    </Modal>
  );
};
