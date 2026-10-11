import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../api/axios';
import { LoadingState, Spinner } from '../components/Loader.jsx';
import BulkLabelPreview from '../components/BulkLabelPreview.jsx';
import { DownloadButton } from './BulkQr.jsx';
import { ArrowLeftIcon } from '../components/ScanIcons.jsx';
import '../styles/admin.css';
import '../styles/bulk-qr.css';

// One bulk QR batch: everything recorded for it, and everyone who scanned its QR — who (when
// signed in), where (when they shared their location) and when. The creator's own batches; any
// batch for admins.

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
const pad = (n) => String(n).padStart(2, '0');
const ddmmyy = (iso) => {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;
};
const hhmmss = (iso) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
const localDay = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const longDate = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const coords = (loc) => `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`;

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4" />
  </svg>
);

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const downloadCsv = (batch, rows) => {
  const lines = [['S.No', 'Scanned by', 'User ID', 'User type', 'Place', 'Latitude', 'Longitude', 'Date', 'Time']];
  rows.forEach((s, i) =>
    lines.push([
      i + 1,
      s.user ? s.user.name || 'Unnamed user' : 'Guest',
      s.user?.code || '',
      s.user?.userType || '',
      s.location?.name || '',
      s.location ? s.location.latitude : '',
      s.location ? s.location.longitude : '',
      ddmmyy(s.at),
      hhmmss(s.at),
    ])
  );
  const blob = new Blob([`﻿${lines.map((l) => l.map(csvCell).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: `${batch.batchNo.replace(/[^a-zA-Z0-9-]+/g, '_')}-scans.csv` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const Stat = ({ label, value, foot }) => (
  <div className="oh-bb-stat">
    <span className="oh-bb-stat-label">{label}</span>
    <strong>{value}</strong>
    {foot && <span className="oh-bb-stat-foot">{foot}</span>}
  </div>
);

const BulkBatchDetails = () => {
  const { id } = useParams();
  const { pathname } = useLocation();
  const user = useSelector((s) => s.auth.user);
  const isAdmin = Boolean(user?.isAdmin || user?.isSuperAdmin);
  const listPath = `${pathname.replace(/\/[^/]+\/?$/, '')}?tab=batches`;

  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [search, setSearch] = useState('');
  const [who, setWho] = useState('ALL');
  const [where, setWhere] = useState('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const { data: body } = await api.get(`/bulk-qr/${id}`);
      setData(body);
      setStatus('ready');
    } catch (err) {
      setStatus(err.response?.status === 404 ? 'missing' : 'failed');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const scans = data?.scans;
  const rows = useMemo(() => {
    if (!scans) return [];
    const q = search.trim().toLowerCase();
    return scans.filter((s) => {
      if (who === 'USERS' && !s.user) return false;
      if (who === 'GUESTS' && s.user) return false;
      if (where === 'WITH' && !s.location) return false;
      if (where === 'WITHOUT' && s.location) return false;
      const day = localDay(s.at);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (!q) return true;
      return [s.user?.name, s.user?.code, s.user ? '' : 'guest', s.location?.name, s.location && coords(s.location)].some(
        (v) => v && v.toLowerCase().includes(q)
      );
    });
  }, [scans, search, who, where, from, to]);

  const stats = useMemo(() => {
    if (!scans) return null;
    const users = new Set(scans.filter((s) => s.user).map((s) => s.user.id));
    return {
      users: users.size,
      guests: scans.filter((s) => !s.user).length,
      located: scans.filter((s) => s.location).length,
    };
  }, [scans]);

  const back = (
    <Link className="oh-bb-back" to={listPath}>
      <ArrowLeftIcon size={16} /> All bulk batches
    </Link>
  );

  if (status === 'loading' && !data) {
    return (
      <div className="oh-bulk">
        {back}
        <LoadingState label="Loading batch…" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="oh-bulk">
        {back}
        <div className="oh-error">
          {status === 'missing' ? "This batch wasn't found." : 'Could not load this batch.'}{' '}
          {status !== 'missing' && (
            <button type="button" className="oh-bulk-link" onClick={load}>
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  const { batch, total, limit } = data;
  const expired = batch.expiryDate && batch.expiryDate < localDay(new Date());
  const pages = Math.ceil(batch.quantity / batch.labelsPerPage);
  const filtered = search || who !== 'ALL' || where !== 'ALL' || from || to;
  const details = [
    ['Brand', batch.brandName],
    ['Product', batch.productName],
    ['Batch', batch.batchNo],
    ['Pack size', batch.packSize],
    ['Purpose', batch.purposeLabel || 'Not specified'],
    [
      'Expiry',
      batch.expiryDate ? (
        <span className={`oh-bulk-pill ${expired ? 'expired' : 'valid'}`}>
          {expired ? 'Expired ' : ''}
          {longDate(batch.expiryDate)}
        </span>
      ) : (
        'No expiry date'
      ),
    ],
    ['Labels', `${fmt(batch.quantity)} identical QR codes`],
    ['Print layout', `${batch.labelsPerPage} per ${batch.pageSize} page · ${fmt(pages)} ${pages === 1 ? 'page' : 'pages'}`],
    ['Generated', `${ddmmyy(batch.createdAt)}, ${hhmmss(batch.createdAt)}${isAdmin && batch.creatorName ? ` · by ${batch.creatorName}` : ''}`],
    ['Reference', <code key="code">{batch.code}</code>],
  ];

  return (
    <div className="oh-bulk oh-bb">
      {back}

      {/* ---------- The batch ---------- */}
      <section className="oh-bb-hero">
        <div className="oh-bb-label">
          <BulkLabelPreview values={batch} code={batch.code} />
        </div>
        <div className="oh-bb-info">
          <span className="oh-bb-eyebrow">{batch.brandName}</span>
          <h1>{batch.productName}</h1>
          <p className="oh-bb-pack">{batch.packSize}</p>
          <dl className="oh-bb-details">
            {details.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="oh-bb-actions">
            <DownloadButton batch={batch} />
          </div>
        </div>
      </section>

      <section className="oh-bb-stats" aria-label="Scan totals">
        {/* Past the listing limit the count comes from the batch's running total. */}
        <Stat label="Total scans" value={fmt(scans.length >= limit ? total : scans.length)} foot={scans.length >= limit ? `latest ${fmt(limit)} listed` : null} />
        <Stat label="Signed-in users" value={fmt(stats.users)} foot="different people" />
        <Stat label="Guest scans" value={fmt(stats.guests)} foot="not signed in" />
        <Stat label="With location" value={fmt(stats.located)} foot={scans.length ? `${Math.round((stats.located / scans.length) * 100)}% of scans` : null} />
        <Stat label="Last scanned" value={scans.length ? ddmmyy(scans[0].at) : '—'} foot={scans.length ? hhmmss(scans[0].at) : 'not scanned yet'} />
      </section>

      {/* ---------- Who scanned it ---------- */}
      <section className="oh-bb-scans" aria-label="Scans">
        <div className="oh-bb-scans-head">
          <div>
            <h2>Scans</h2>
            <p>Everyone who opened this QR: who (when signed in), where (when they shared their location) and when.</p>
          </div>
          <div className="oh-bb-scans-actions">
            <button type="button" className="oh-bulk-btn ghost small" onClick={load} disabled={status === 'loading'}>
              {status === 'loading' ? <Spinner /> : <RefreshIcon />} Refresh
            </button>
            <button type="button" className="oh-bulk-btn primary small" onClick={() => downloadCsv(batch, rows)} disabled={!rows.length}>
              Export CSV
            </button>
          </div>
        </div>

        {scans.length === 0 ? (
          <div className="oh-empty-state">No one has scanned this QR yet.</div>
        ) : (
          <>
            <div className="oh-toolbar oh-bulk-toolbar">
              <input
                className="oh-search-input"
                placeholder="Search name, user ID, place or coordinates"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search scans"
              />
              <select className="oh-status-select" value={who} onChange={(e) => setWho(e.target.value)} aria-label="Scanned by">
                <option value="ALL">Everyone</option>
                <option value="USERS">Signed-in users</option>
                <option value="GUESTS">Guests</option>
              </select>
              <select className="oh-status-select" value={where} onChange={(e) => setWhere(e.target.value)} aria-label="Location">
                <option value="ALL">Any location</option>
                <option value="WITH">With location</option>
                <option value="WITHOUT">Location not shared</option>
              </select>
              <label className="oh-bb-date">
                <span>From</span>
                <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label className="oh-bb-date">
                <span>To</span>
                <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
              </label>
              {filtered && (
                <button
                  type="button"
                  className="oh-bulk-link"
                  onClick={() => {
                    setSearch('');
                    setWho('ALL');
                    setWhere('ALL');
                    setFrom('');
                    setTo('');
                  }}
                >
                  Clear filters
                </button>
              )}
              <span className="oh-bulk-count">
                {fmt(rows.length)} of {fmt(scans.length)} {scans.length === 1 ? 'scan' : 'scans'}
              </span>
            </div>

            <div className="oh-bulk-table-wrap">
              <table className="oh-bulk-table oh-bb-table">
                <thead>
                  <tr>
                    <th scope="col">S.No</th>
                    <th scope="col">Scanned by</th>
                    <th scope="col">Location</th>
                    <th scope="col">Date</th>
                    <th scope="col">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s, i) => (
                    <tr key={s.id}>
                      <td className="sno">{i + 1}</td>
                      <td>
                        {s.user ? (
                          <>
                            {isAdmin ? (
                              <Link className="oh-bulk-cell-main oh-bb-user" to={`/admin/users/${s.user.id}`}>
                                {s.user.name || 'Unnamed user'}
                              </Link>
                            ) : (
                              <span className="oh-bulk-cell-main">{s.user.name || 'Unnamed user'}</span>
                            )}
                            <span className="oh-bulk-cell-sub">
                              {s.user.code}
                              {s.user.userType ? ` · ${s.user.userType}` : ''}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="oh-bulk-cell-main oh-bb-guest">Guest</span>
                            <span className="oh-bulk-cell-sub">Not signed in</span>
                          </>
                        )}
                      </td>
                      <td>
                        {s.location ? (
                          <>
                            <span className="oh-bulk-cell-main">{s.location.name || 'Finding place name…'}</span>
                            <a
                              className="oh-bb-coords"
                              href={`https://www.google.com/maps?q=${s.location.latitude},${s.location.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open in Google Maps"
                            >
                              {coords(s.location)}
                            </a>
                          </>
                        ) : (
                          <span className="oh-bulk-muted">Location not shared</span>
                        )}
                      </td>
                      <td className="nowrap">{ddmmyy(s.at)}</td>
                      <td className="nowrap oh-bb-time">{hhmmss(s.at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && <div className="oh-empty-state">No scans match these filters.</div>}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default BulkBatchDetails;
