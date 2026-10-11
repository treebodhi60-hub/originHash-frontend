import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../api/axios';
import { LoadingState, Spinner } from '../components/Loader.jsx';
import BulkLabelPreview from '../components/BulkLabelPreview.jsx';
import { PdfDownloadButton } from '../components/QrFormParts.jsx';
import { ArrowLeftIcon } from '../components/ScanIcons.jsx';
import { LightPdfButton } from './LightQr.jsx';
import { Modal } from '../components/Wallet.jsx';
import { LightProduct } from '../components/LightShell.jsx';
import LightTimeline from '../components/LightTimeline.jsx';
import '../styles/admin.css';
import '../styles/wallet.css';
import '../styles/bulk-qr.css';

// One light QR batch: what was recorded for it, and every unique code in it with its activity.
// Each code opens its own journey (scans and updates). The creator's own batches; any for admins.

const PAGE = 100;
const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
const pad = (n) => String(n).padStart(2, '0');
const stamp = (iso) => {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const STATUS_FILTERS = [
  ['ALL', 'All codes'],
  ['READY', 'Ready (not scanned)'],
  ['SCANNED', 'Scanned'],
  ['UPDATES', 'With updates'],
];

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4" />
  </svg>
);
const RouteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="6" cy="18" r="2.5" />
    <circle cx="18" cy="6" r="2.5" />
    <path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" />
  </svg>
);

// One code's journey in a dialog over the batch page.
const JourneyModal = ({ code, onClose }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/light-qr/public/${code.token}/history`)
      .then(({ data: body }) => !cancelled && setData(body))
      .catch((err) => !cancelled && setError(err.response?.data?.message || 'Could not load the journey.'));
    return () => {
      cancelled = true;
    };
  }, [code.token]);

  return (
    <Modal title={`${code.code} journey`} labelId="oh-lq-journey-title" onClose={onClose} className="oh-lq-journey">
      {!data && !error && <LoadingState label="Loading journey…" />}
      {error && <div className="oh-error">{error}</div>}
      {data && (
        <div className="olq-body oh-lq-journey-body">
          <LightProduct info={data} compact />
          <div className="olq-chip">QR ID: {data.code}</div>
          <LightTimeline data={data} />
        </div>
      )}
    </Modal>
  );
};

const LightBatchDetails = () => {
  const { id } = useParams();
  const { pathname } = useLocation();
  const user = useSelector((s) => s.auth.user);
  const isAdmin = Boolean(user?.isAdmin || user?.isSuperAdmin);
  const listPath = `${pathname.replace(/\/[^/]+\/?$/, '')}?tab=batches`;

  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [shown, setShown] = useState(PAGE);
  const [journeyOf, setJourneyOf] = useState(null); // the code whose journey is open

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const { data: body } = await api.get(`/light-qr/${id}`);
      setData(body);
      setStatus('ready');
    } catch (err) {
      setStatus(err.response?.status === 404 ? 'missing' : 'failed');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => setShown(PAGE), [search, filter]);

  const codes = data?.codes;
  const rows = useMemo(() => {
    if (!codes) return [];
    const q = search.trim().toLowerCase().replace(/\s+/g, '');
    return codes.filter((c) => {
      if (filter === 'READY' && c.scanCount) return false;
      if (filter === 'SCANNED' && !c.scanCount) return false;
      if (filter === 'UPDATES' && !c.updateCount) return false;
      return !q || c.code.toLowerCase().includes(q) || String(c.sequenceNo) === q;
    });
  }, [codes, search, filter]);

  const back = (
    <Link className="oh-bb-back" to={listPath}>
      <ArrowLeftIcon size={16} /> All light batches
    </Link>
  );

  if (!data) {
    return (
      <div className="oh-bulk">
        {back}
        {status === 'loading' ? (
          <LoadingState label="Loading batch…" />
        ) : (
          <div className="oh-error">
            {status === 'missing' ? "This batch wasn't found." : 'Could not load this batch.'}{' '}
            {status !== 'missing' && (
              <button type="button" className="oh-bulk-link" onClick={load}>
                Try again
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  const { batch } = data;
  const pages = Math.ceil(batch.quantity / batch.labelsPerPage);
  const details = [
    ['Brand', batch.brandName],
    ['Product', batch.productName],
    ['Batch', batch.batchNo],
    ['Pack size', batch.packSize],
    ['QR IDs', batch.firstCode === batch.lastCode ? batch.firstCode : `${batch.firstCode} – ${batch.lastCode}`],
    ['Codes', `${fmt(batch.quantity)} unique QR codes`],
    ['Print layout', `${batch.labelsPerPage} per ${batch.pageSize} page · ${fmt(pages)} ${pages === 1 ? 'page' : 'pages'}`],
    ['Generated', `${stamp(batch.createdAt)}${isAdmin && batch.creatorName ? ` · by ${batch.creatorName}` : ''}`],
  ];

  return (
    <div className="oh-bulk oh-bb">
      {back}

      <section className="oh-bb-hero">
        <div className="oh-bb-label">
          <BulkLabelPreview values={batch} bar={batch.firstCode} />
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
            <LightPdfButton batch={batch}>Download all</LightPdfButton>
          </div>
        </div>
      </section>

      <section className="oh-bb-stats" aria-label="Totals">
        <div className="oh-bb-stat">
          <span className="oh-bb-stat-label">QR codes</span>
          <strong>{fmt(batch.quantity)}</strong>
          <span className="oh-bb-stat-foot">unique units</span>
        </div>
        <div className="oh-bb-stat">
          <span className="oh-bb-stat-label">Scanned</span>
          <strong>{fmt(batch.scannedCodes)}</strong>
          <span className="oh-bb-stat-foot">{batch.quantity ? `${Math.round((batch.scannedCodes / batch.quantity) * 100)}% of codes` : ''}</span>
        </div>
        <div className="oh-bb-stat">
          <span className="oh-bb-stat-label">Ready</span>
          <strong>{fmt(batch.quantity - batch.scannedCodes)}</strong>
          <span className="oh-bb-stat-foot">not scanned yet</span>
        </div>
        <div className="oh-bb-stat">
          <span className="oh-bb-stat-label">Total scans</span>
          <strong>{fmt(batch.scanCount)}</strong>
          <span className="oh-bb-stat-foot">across all codes</span>
        </div>
        <div className="oh-bb-stat">
          <span className="oh-bb-stat-label">Updates</span>
          <strong>{fmt(batch.updateCount)}</strong>
          <span className="oh-bb-stat-foot">photos with comments</span>
        </div>
      </section>

      <section className="oh-bb-scans" aria-label="QR codes">
        <div className="oh-bb-scans-head">
          <div>
            <h2>QR codes</h2>
            <p>Every unit in this batch. Open a code&apos;s journey to see each scan and update in order.</p>
          </div>
          <div className="oh-bb-scans-actions">
            <button type="button" className="oh-bulk-btn ghost small" onClick={load} disabled={status === 'loading'}>
              {status === 'loading' ? <Spinner /> : <RefreshIcon />} Refresh
            </button>
          </div>
        </div>

        <div className="oh-toolbar oh-bulk-toolbar">
          <input
            className="oh-search-input"
            placeholder="Search QR ID (e.g. QR-00427) or number in batch"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search QR codes"
          />
          <select className="oh-status-select" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Status">
            {STATUS_FILTERS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <span className="oh-bulk-count">
            {fmt(rows.length)} of {fmt(codes.length)} codes
          </span>
        </div>

        <div className="oh-bulk-table-wrap">
          <table className="oh-bulk-table oh-bb-table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">QR ID (unique)</th>
                <th scope="col">Status</th>
                <th scope="col" className="num">Scans</th>
                <th scope="col" className="num">Updates</th>
                <th scope="col">Last scanned</th>
                <th scope="col">
                  <span className="oh-visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, shown).map((c) => (
                <tr key={c.id}>
                  <td className="sno">{c.sequenceNo}</td>
                  <td>
                    <code className="oh-lq-code">{c.code}</code>
                  </td>
                  <td>
                    <span className={`oh-lq-status ${c.scanCount ? 'scanned' : 'ready'}`}>{c.scanCount ? 'Scanned' : 'Ready'}</span>
                  </td>
                  <td className="num">{fmt(c.scanCount)}</td>
                  <td className="num">{fmt(c.updateCount)}</td>
                  <td className="nowrap">{c.lastScannedAt ? stamp(c.lastScannedAt) : <span className="oh-bulk-muted">—</span>}</td>
                  <td>
                    <div className="oh-bulk-list-actions">
                      <button type="button" className="oh-bulk-btn ghost small" onClick={() => setJourneyOf(c)}>
                        <RouteIcon /> Journey
                      </button>
                      <PdfDownloadButton url={`/light-qr/codes/${c.id}/pdf`} fileName={`${c.code}.pdf`} className="oh-bulk-btn primary small" title={`Download ${c.code}`}>
                        PDF
                      </PdfDownloadButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <div className="oh-empty-state">No codes match these filters.</div>}
        </div>
        {journeyOf && <JourneyModal code={journeyOf} onClose={() => setJourneyOf(null)} />}
        {rows.length > shown && (
          <button type="button" className="oh-bulk-btn ghost oh-lq-more" onClick={() => setShown((n) => n + PAGE)}>
            Show {fmt(Math.min(PAGE, rows.length - shown))} more ({fmt(rows.length - shown)} left)
          </button>
        )}
      </section>
    </div>
  );
};

export default LightBatchDetails;
