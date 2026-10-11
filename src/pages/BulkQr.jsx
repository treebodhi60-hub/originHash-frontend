import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { LoadingState, Spinner } from '../components/Loader.jsx';
import { formatDateTimeShort } from '../utils/format';
import PrintLayout from '../components/PrintLayout.jsx';
import BulkLabelPreview from '../components/BulkLabelPreview.jsx';
import {
  BoxIcon,
  BuildingIcon,
  CalendarIcon,
  CheckIcon,
  ExternalIcon,
  EyeIcon,
  Field,
  InfoIcon,
  PdfDownloadButton,
  QrGlyph,
  ResetIcon,
  ScaleIcon,
  ShieldIcon,
  TagIcon,
} from '../components/QrFormParts.jsx';
import { DEFAULT_PER_PAGE, maxPerPage } from '../utils/stickerLayout';
import '../styles/admin.css';
import '../styles/bulk-qr.css';

// Generate bulk QR stickers: one QR, printed as many times as needed, that opens the product's
// details. Same palette and print layout as "Generate QR stickers".

const MAX_QUANTITY = 5000;
export const PURPOSES = [
  ['PRODUCT_AUTHENTICATION', 'Product authentication'],
  ['PRODUCT_INFORMATION', 'Product information'],
  ['TRACEABILITY', 'Traceability'],
  ['MARKETING', 'Marketing & promotions'],
  ['WARRANTY', 'Warranty registration'],
];

const EMPTY = {
  brandName: '',
  productName: '',
  batchNo: '',
  packSize: '',
  purpose: 'PRODUCT_AUTHENTICATION',
  expiryDate: '',
  quantity: 500,
  pageSize: 'A4',
  labelsPerPage: DEFAULT_PER_PAGE,
};

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
const shortDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const dateOnly = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const DownloadButton = ({ batch, ...props }) => (
  <PdfDownloadButton url={`/bulk-qr/${batch.id}/pdf`} fileName={`${batch.batchNo.replace(/[^a-zA-Z0-9-]+/g, '_')}-bulk-qr.pdf`} {...props} />
);

export const EXPIRY_FILTERS = [
  ['ALL', 'Any expiry'],
  ['VALID', 'Not expired'],
  ['EXPIRED', 'Expired'],
  ['NONE', 'No expiry date'],
];

// Every bulk batch the user made (everyone's for admins), newest first, with search and filters.
const BatchesTab = ({ batches, error, isAdmin, onGenerate }) => {
  const [search, setSearch] = useState('');
  const [purpose, setPurpose] = useState('ALL');
  const [expiry, setExpiry] = useState('ALL');
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const today = todayIso();

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (batches || []).filter((b) => {
      if (purpose !== 'ALL' && (b.purpose || 'NONE') !== purpose) return false;
      if (expiry === 'NONE' && b.expiryDate) return false;
      if (expiry === 'VALID' && (!b.expiryDate || b.expiryDate < today)) return false;
      if (expiry === 'EXPIRED' && (!b.expiryDate || b.expiryDate >= today)) return false;
      return (
        !q ||
        [b.productName, b.brandName, b.batchNo, b.packSize, b.code, b.creatorName].some((v) => v && v.toLowerCase().includes(q))
      );
    });
  }, [batches, search, purpose, expiry, today]);

  if (error) return <div className="oh-error">{error}</div>;
  if (!batches) return <LoadingState label="Loading batches…" />;
  if (!batches.length) {
    return (
      <div className="oh-empty-state">
        No bulk batches yet.{' '}
        <button type="button" className="oh-bulk-link" onClick={onGenerate}>
          Generate your first batch
        </button>
      </div>
    );
  }

  const filtered = search || purpose !== 'ALL' || expiry !== 'ALL';
  return (
    <section className="oh-bulk-batches" aria-label="Bulk batches">
      <div className="oh-toolbar oh-bulk-toolbar">
        <input
          className="oh-search-input"
          placeholder="Search product, brand, batch or reference"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search bulk batches"
        />
        <select className="oh-status-select" value={purpose} onChange={(e) => setPurpose(e.target.value)} aria-label="Purpose">
          <option value="ALL">Any purpose</option>
          {PURPOSES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
          <option value="NONE">Not specified</option>
        </select>
        <select className="oh-status-select" value={expiry} onChange={(e) => setExpiry(e.target.value)} aria-label="Expiry">
          {EXPIRY_FILTERS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {filtered && (
          <button
            type="button"
            className="oh-bulk-link"
            onClick={() => {
              setSearch('');
              setPurpose('ALL');
              setExpiry('ALL');
            }}
          >
            Clear filters
          </button>
        )}
        <span className="oh-bulk-count">
          {fmt(rows.length)} of {fmt(batches.length)} {batches.length === 1 ? 'batch' : 'batches'}
        </span>
      </div>

      <div className="oh-bulk-table-wrap">
        <table className="oh-bulk-table">
          <thead>
            <tr>
              <th scope="col">S.No</th>
              <th scope="col">Product</th>
              <th scope="col">Brand</th>
              <th scope="col">Batch</th>
              <th scope="col" className="num">Labels</th>
              <th scope="col">Purpose</th>
              <th scope="col">Expiry</th>
              <th scope="col" className="num">Scans</th>
              <th scope="col">Generated</th>
              <th scope="col">
                <span className="oh-visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b, i) => {
              const expired = b.expiryDate && b.expiryDate < today;
              return (
                <tr key={b.id}>
                  <td className="sno">{i + 1}</td>
                  <td>
                    <span className="oh-bulk-cell-main">{b.productName}</span>
                    <span className="oh-bulk-cell-sub">{b.packSize}</span>
                  </td>
                  <td>{b.brandName}</td>
                  <td>
                    <span className="oh-bulk-cell-main">{b.batchNo}</span>
                    <code>{b.code}</code>
                  </td>
                  <td className="num">{fmt(b.quantity)}</td>
                  <td>{b.purposeLabel || <span className="oh-bulk-muted">—</span>}</td>
                  <td>
                    {b.expiryDate ? (
                      <span className={`oh-bulk-pill ${expired ? 'expired' : 'valid'}`}>{dateOnly(b.expiryDate)}</span>
                    ) : (
                      <span className="oh-bulk-muted">—</span>
                    )}
                  </td>
                  <td className="num">{fmt(b.scanCount)}</td>
                  <td>
                    <span className="oh-bulk-cell-main nowrap">{formatDateTimeShort(b.createdAt, { seconds: true })}</span>
                    {isAdmin && b.creatorName && <span className="oh-bulk-cell-sub">by {b.creatorName}</span>}
                  </td>
                  <td>
                    <div className="oh-bulk-list-actions">
                      <button type="button" className="oh-bulk-btn ghost small" onClick={() => navigate(`${pathname.replace(/\/$/, '')}/${b.id}`)}>
                        <EyeIcon /> View
                      </button>
                      <DownloadButton batch={b} className="oh-bulk-btn primary small">
                        PDF
                      </DownloadButton>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && <div className="oh-empty-state">No batches match these filters.</div>}
      </div>
    </section>
  );
};

const BulkQr = () => {
  const user = useSelector((s) => s.auth.user);
  const isAdmin = Boolean(user?.isAdmin || user?.isSuperAdmin);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const [batches, setBatches] = useState(null);
  const [listError, setListError] = useState('');
  // ?tab=batches opens the list (the batch page's back link uses it).
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') === 'batches' ? 'batches' : 'generate');

  useEffect(() => {
    let cancelled = false;
    api
      .get('/bulk-qr')
      .then(({ data }) => !cancelled && setBatches(data.batches))
      .catch(() => !cancelled && setListError('Could not load your bulk batches.'));
    return () => {
      cancelled = true;
    };
  }, []);

  // A new paper size can hold fewer labels: keep labels per page within what it takes.
  const update = (key, value) =>
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'pageSize') next.labelsPerPage = Math.min(next.labelsPerPage, maxPerPage(next.pageSize, 'bulk'));
      return next;
    });

  const quantity = Number(form.quantity);
  const quantityError =
    form.quantity === '' || !Number.isInteger(quantity) || quantity < 1
      ? 'Enter how many QR codes to generate.'
      : quantity > MAX_QUANTITY
        ? `Up to ${fmt(MAX_QUANTITY)} at a time.`
        : '';
  const ready = form.brandName.trim() && form.productName.trim() && form.batchNo.trim() && form.packSize.trim() && !quantityError;
  const pages = quantityError ? 0 : Math.ceil(quantity / form.labelsPerPage);

  const submit = async (e) => {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/bulk-qr', {
        ...form,
        brandName: form.brandName.trim(),
        productName: form.productName.trim(),
        batchNo: form.batchNo.trim(),
        packSize: form.packSize.trim(),
        purpose: form.purpose || null,
        expiryDate: form.expiryDate || null,
        quantity,
      });
      setCreated(data.batch);
      setBatches((list) => [data.batch, ...(list || [])]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not generate the QR codes. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const startOver = () => {
    setCreated(null);
    setForm(EMPTY);
    setError('');
  };

  const summary = [form.brandName.trim(), form.productName.trim(), form.batchNo.trim() && `Batch: ${form.batchNo.trim()}`, form.packSize.trim()].filter(Boolean);

  return (
    <div className="oh-bulk">
      <header className="oh-bulk-head">
        <h1 className="oh-admin-title">Generate bulk QR stickers</h1>
        <p>Enter the product details once and print the same QR code as many times as you need. Scanning it shows these details.</p>
      </header>

      <div className="oh-tabs">
        <button type="button" className={`oh-tab ${tab === 'generate' ? 'active' : ''}`} onClick={() => setTab('generate')}>
          Generate
        </button>
        <button type="button" className={`oh-tab ${tab === 'batches' ? 'active' : ''}`} onClick={() => setTab('batches')}>
          {isAdmin ? 'All bulk batches' : 'Your bulk batches'}
          {batches?.length ? <span className="oh-bulk-tab-count">{fmt(batches.length)}</span> : null}
        </button>
      </div>

      {tab === 'batches' && <BatchesTab batches={batches} error={listError} isAdmin={isAdmin} onGenerate={() => setTab('generate')} />}

      {tab === 'generate' && (
        <div className="oh-bulk-layout">
          <div className="oh-bulk-main">
            {created ? (
              <section className="oh-bulk-done" aria-live="polite">
                <span className="oh-bulk-done-icon">
                  <CheckIcon />
                </span>
                <h2>{fmt(created.quantity)} identical QR codes ready</h2>
                <p>
                  {created.brandName} · {created.productName} · Batch {created.batchNo} · {created.packSize}
                </p>
                <p className="oh-bulk-done-meta">
                  {created.labelsPerPage} labels per {created.pageSize} page · {fmt(Math.ceil(created.quantity / created.labelsPerPage))} pages · reference{' '}
                  <code>{created.code}</code>
                </p>
                <div className="oh-bulk-done-actions">
                  <DownloadButton batch={created} />
                  <a className="oh-bulk-btn ghost" href={`/b/${created.code}?preview=1`} target="_blank" rel="noopener noreferrer">
                    <ExternalIcon /> See what a scan shows
                  </a>
                </div>
                <div className="oh-bulk-done-links">
                  <button type="button" className="oh-bulk-link" onClick={startOver}>
                    Generate another batch
                  </button>
                  <button type="button" className="oh-bulk-link" onClick={() => setTab('batches')}>
                    See all batches
                  </button>
                </div>
              </section>
            ) : (
              <form onSubmit={submit} noValidate>
                <section className="oh-bulk-step">
                  <header>
                    <span className="oh-bulk-step-no">1</span>
                    <div>
                      <h2>Product information</h2>
                      <p>This information is the same on every QR code in the batch.</p>
                    </div>
                  </header>
                  <div className="oh-bulk-grid">
                    <Field label="Brand name" required icon={<BuildingIcon />} htmlFor="bulk-brand">
                      <input id="bulk-brand" value={form.brandName} onChange={(e) => update('brandName', e.target.value)} placeholder="e.g. OriginHash" maxLength={120} required />
                    </Field>
                    <Field label="Product name" required icon={<BoxIcon />} htmlFor="bulk-product">
                      <input id="bulk-product" value={form.productName} onChange={(e) => update('productName', e.target.value)} placeholder="e.g. Sunflower Oil" maxLength={160} required />
                    </Field>
                    <Field label="Batch name / number" required icon={<TagIcon />} htmlFor="bulk-batch">
                      <input id="bulk-batch" value={form.batchNo} onChange={(e) => update('batchNo', e.target.value)} placeholder="e.g. SO-2026-10-A1" maxLength={80} required />
                    </Field>
                    <Field label="Quantity / pack size" required icon={<ScaleIcon />} htmlFor="bulk-pack">
                      <input id="bulk-pack" value={form.packSize} onChange={(e) => update('packSize', e.target.value)} placeholder="e.g. 1 Litre" maxLength={60} required />
                    </Field>
                    <Field label="QR code purpose" optional icon={<ShieldIcon />} htmlFor="bulk-purpose">
                      <select id="bulk-purpose" value={form.purpose} onChange={(e) => update('purpose', e.target.value)}>
                        <option value="">Not specified</option>
                        {PURPOSES.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Expiry date" optional icon={<CalendarIcon />} htmlFor="bulk-expiry">
                      <input id="bulk-expiry" type="date" min={todayIso()} value={form.expiryDate} onChange={(e) => update('expiryDate', e.target.value)} />
                    </Field>
                  </div>
                </section>

                <section className="oh-bulk-step">
                  <header>
                    <span className="oh-bulk-step-no">2</span>
                    <div>
                      <h2>Number of QR codes</h2>
                      <p>How many identical QR codes to print, and how they sit on the page.</p>
                    </div>
                  </header>
                  <div className="oh-bulk-qty">
                    <label htmlFor="bulk-qty">Generate</label>
                    <input
                      id="bulk-qty"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={MAX_QUANTITY}
                      value={form.quantity}
                      onChange={(e) => update('quantity', e.target.value === '' ? '' : Math.trunc(Number(e.target.value)))}
                      aria-invalid={Boolean(quantityError)}
                      aria-describedby="bulk-qty-hint"
                    />
                    <span>identical QR codes</span>
                  </div>
                  <p id="bulk-qty-hint" className={`oh-bulk-hint ${quantityError ? 'error' : ''}`}>
                    {quantityError || `${fmt(pages)} ${pages === 1 ? 'page' : 'pages'} at ${form.labelsPerPage} per ${form.pageSize} page · up to ${fmt(MAX_QUANTITY)} at a time`}
                  </p>

                  <div className="oh-field oh-bulk-print">
                    <label>Print layout</label>
                    <PrintLayout
                      pageSize={form.pageSize}
                      splitType="bulk"
                      labelsPerPage={form.labelsPerPage}
                      count={quantityError ? 0 : quantity}
                      onPageSize={(size) => update('pageSize', size)}
                      onLabelsPerPage={(n) => update('labelsPerPage', n)}
                    />
                  </div>

                  <div className="oh-bulk-info">
                    <InfoIcon />
                    <div>
                      <span>All {quantityError ? '' : `${fmt(quantity)} `}QR codes will contain the same information:</span>
                      <strong>{summary.length ? summary.join('  |  ') : 'Fill in the product information above'}</strong>
                    </div>
                  </div>
                </section>

                {error && (
                  <div className="oh-error" role="alert">
                    {error}
                  </div>
                )}

                <div className="oh-bulk-actions">
                  <button type="button" className="oh-bulk-btn ghost" onClick={startOver} disabled={busy}>
                    <ResetIcon /> Reset
                  </button>
                  <button type="submit" className="oh-bulk-btn primary" disabled={!ready || busy}>
                    {busy ? <Spinner /> : <QrGlyph />}
                    {busy ? 'Generating…' : `Generate ${quantityError ? '' : `${fmt(quantity)} `}QR codes`}
                  </button>
                </div>
              </form>
            )}
          </div>

          <aside className="oh-bulk-aside">
            <span className="oh-bulk-aside-label">Label preview</span>
            <BulkLabelPreview values={created || form} code={created?.code} />
            <p className="oh-bulk-aside-note">The same QR on every label; each label gets its own number.</p>
          </aside>
        </div>
      )}
    </div>
  );
};

export default BulkQr;
