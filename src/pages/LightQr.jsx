import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { LoadingState, Spinner } from '../components/Loader.jsx';
import PrintLayout from '../components/PrintLayout.jsx';
import BulkLabelPreview from '../components/BulkLabelPreview.jsx';
import {
  BoxIcon,
  BuildingIcon,
  CheckIcon,
  EyeIcon,
  Field,
  InfoIcon,
  PdfDownloadButton,
  QrGlyph,
  ResetIcon,
  ScaleIcon,
  TagIcon,
} from '../components/QrFormParts.jsx';
import { formatDateTimeShort } from '../utils/format';
import { fetchWallet, tabFor } from '../store/walletSlice';
import { BuyLightModal, LightBalanceBar } from '../components/LightBalance.jsx';
import { CheckoutModal, WalletActivityModal } from '../components/Wallet.jsx';
import { DEFAULT_PER_PAGE, maxPerPage } from '../utils/stickerLayout';
import '../styles/admin.css';
import '../styles/wallet.css';
import '../styles/bulk-qr.css';

// Generate light QR stickers: one unique QR per unit of a product batch. Scanning a code shows the
// product, records the scan, and lets each signed-in user add one photo and comment to that unit.

const MAX_QUANTITY = 5000;
const EMPTY = {
  brandName: '',
  productName: '',
  batchNo: '',
  packSize: '',
  quantity: 500,
  pageSize: 'A4',
  labelsPerPage: DEFAULT_PER_PAGE,
};

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
const safe = (s) => s.replace(/[^a-zA-Z0-9-]+/g, '_');

export const LightPdfButton = ({ batch, ...props }) => (
  <PdfDownloadButton url={`/light-qr/${batch.id}/pdf`} fileName={`${safe(batch.batchNo)}-light-qr.pdf`} {...props} />
);

const ACTIVITY_FILTERS = [
  ['ALL', 'Any activity'],
  ['SCANNED', 'Scanned'],
  ['NOT_SCANNED', 'Not scanned yet'],
  ['UPDATES', 'With updates'],
];

// Every light batch the user made (everyone's for admins), newest first, with search and filters.
const BatchesTab = ({ batches, error, isAdmin, onGenerate }) => {
  const [search, setSearch] = useState('');
  const [activity, setActivity] = useState('ALL');
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (batches || []).filter((b) => {
      if (activity === 'SCANNED' && !b.scanCount) return false;
      if (activity === 'NOT_SCANNED' && b.scanCount) return false;
      if (activity === 'UPDATES' && !b.updateCount) return false;
      return (
        !q ||
        [b.productName, b.brandName, b.batchNo, b.packSize, b.firstCode, b.lastCode, b.creatorName].some((v) => v && v.toLowerCase().includes(q))
      );
    });
  }, [batches, search, activity]);

  if (error) return <div className="oh-error">{error}</div>;
  if (!batches) return <LoadingState label="Loading batches…" />;
  if (!batches.length) {
    return (
      <div className="oh-empty-state">
        No light batches yet.{' '}
        <button type="button" className="oh-bulk-link" onClick={onGenerate}>
          Generate your first batch
        </button>
      </div>
    );
  }

  return (
    <section className="oh-bulk-batches" aria-label="Light batches">
      <div className="oh-toolbar oh-bulk-toolbar">
        <input
          className="oh-search-input"
          placeholder="Search product, brand, batch or QR ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search light batches"
        />
        <select className="oh-status-select" value={activity} onChange={(e) => setActivity(e.target.value)} aria-label="Activity">
          {ACTIVITY_FILTERS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {(search || activity !== 'ALL') && (
          <button
            type="button"
            className="oh-bulk-link"
            onClick={() => {
              setSearch('');
              setActivity('ALL');
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
              <th scope="col">QR IDs</th>
              <th scope="col" className="num">Codes</th>
              <th scope="col" className="num">Scanned</th>
              <th scope="col" className="num">Updates</th>
              <th scope="col">Generated</th>
              <th scope="col">
                <span className="oh-visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b, i) => (
              <tr key={b.id}>
                <td className="sno">{i + 1}</td>
                <td>
                  <span className="oh-bulk-cell-main">{b.productName}</span>
                  <span className="oh-bulk-cell-sub">{b.packSize}</span>
                </td>
                <td>{b.brandName}</td>
                <td>
                  <span className="oh-bulk-cell-main">{b.batchNo}</span>
                </td>
                <td className="nowrap">
                  <code>{b.firstCode}</code>
                  {b.lastCode !== b.firstCode && (
                    <>
                      {' – '}
                      <code>{b.lastCode}</code>
                    </>
                  )}
                </td>
                <td className="num">{fmt(b.quantity)}</td>
                <td className="num">
                  {fmt(b.scannedCodes)}
                  <span className="oh-bulk-cell-sub">{fmt(b.scanCount)} scans</span>
                </td>
                <td className="num">{fmt(b.updateCount)}</td>
                <td>
                  <span className="oh-bulk-cell-main nowrap">{formatDateTimeShort(b.createdAt, { seconds: true })}</span>
                  {isAdmin && b.creatorName && <span className="oh-bulk-cell-sub">by {b.creatorName}</span>}
                </td>
                <td>
                  <div className="oh-bulk-list-actions">
                    <button type="button" className="oh-bulk-btn ghost small" onClick={() => navigate(`${pathname.replace(/\/$/, '')}/${b.id}`)}>
                      <EyeIcon /> View
                    </button>
                    <LightPdfButton batch={b} className="oh-bulk-btn primary small">
                      PDF
                    </LightPdfButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="oh-empty-state">No batches match these filters.</div>}
      </div>
    </section>
  );
};

const LightQr = () => {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const wallet = useSelector((s) => s.wallet);
  const [buying, setBuying] = useState(null); // { initial } while choosing how many to buy
  const [checkout, setCheckout] = useState(null); // the purchase being paid for
  const [activityOpen, setActivityOpen] = useState(false);
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

  // The Light QR balance (and whether billing is on at all).
  useEffect(() => {
    dispatch(fetchWallet());
  }, [dispatch]);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/light-qr')
      .then(({ data }) => !cancelled && setBatches(data.batches))
      .catch(() => !cancelled && setListError('Could not load your light batches.'));
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

  // Once billing is on, each code takes one sticker from the Light QR balance (the server checks too).
  const billing = wallet.enabled && wallet.status === 'ready';
  const available = tabFor(wallet.tabs, 'LIGHT')?.stickers ?? 0;
  const shortBy = billing && !quantityError ? Math.max(0, quantity - available) : 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!ready || busy || shortBy) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/light-qr', {
        ...form,
        brandName: form.brandName.trim(),
        productName: form.productName.trim(),
        batchNo: form.batchNo.trim(),
        packSize: form.packSize.trim(),
        quantity,
      });
      setCreated(data.batch);
      setBatches((list) => [data.batch, ...(list || [])]);
      if (billing) dispatch(fetchWallet());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not generate the QR codes. Please try again.');
      if (err.response?.data?.code === 'INSUFFICIENT_STICKERS') dispatch(fetchWallet());
    } finally {
      setBusy(false);
    }
  };

  const startOver = () => {
    setCreated(null);
    setForm(EMPTY);
    setError('');
  };

  return (
    <div className="oh-bulk">
      <header className="oh-bulk-head">
        <h1 className="oh-admin-title">Generate light QR stickers</h1>
        <p>Enter the product details and generate a unique QR code for every unit. Each scan and update becomes part of that unit&apos;s journey.</p>
      </header>

      <div className="oh-tabs">
        <button type="button" className={`oh-tab ${tab === 'generate' ? 'active' : ''}`} onClick={() => setTab('generate')}>
          Generate
        </button>
        <button type="button" className={`oh-tab ${tab === 'batches' ? 'active' : ''}`} onClick={() => setTab('batches')}>
          {isAdmin ? 'All light batches' : 'Your light batches'}
          {batches?.length ? <span className="oh-bulk-tab-count">{fmt(batches.length)}</span> : null}
        </button>
      </div>

      {wallet.enabled && tab === 'generate' && (
        <LightBalanceBar onBuy={(initial = 0) => setBuying({ initial })} onActivity={() => setActivityOpen(true)} />
      )}

      {tab === 'batches' && <BatchesTab batches={batches} error={listError} isAdmin={isAdmin} onGenerate={() => setTab('generate')} />}

      {tab === 'generate' && (
        <div className="oh-bulk-layout">
          <div className="oh-bulk-main">
            {created ? (
              <section className="oh-bulk-done" aria-live="polite">
                <span className="oh-bulk-done-icon">
                  <CheckIcon />
                </span>
                <h2>{fmt(created.quantity)} unique QR codes ready</h2>
                <p>
                  {created.brandName} · {created.productName} · Batch {created.batchNo} · {created.packSize}
                </p>
                <p className="oh-bulk-done-meta">
                  <code>{created.firstCode}</code>
                  {created.lastCode !== created.firstCode && (
                    <>
                      {' to '}
                      <code>{created.lastCode}</code>
                    </>
                  )}{' '}
                  · {created.labelsPerPage} labels per {created.pageSize} page · {fmt(Math.ceil(created.quantity / created.labelsPerPage))} pages
                </p>
                <div className="oh-bulk-done-actions">
                  <LightPdfButton batch={created}>Download all</LightPdfButton>
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
                      <p>The same for every QR code in the batch; each code is still its own unit.</p>
                    </div>
                  </header>
                  <div className="oh-bulk-grid">
                    <Field label="Brand name" required icon={<BuildingIcon />} htmlFor="light-brand">
                      <input id="light-brand" value={form.brandName} onChange={(e) => update('brandName', e.target.value)} placeholder="e.g. OriginHash" maxLength={120} required />
                    </Field>
                    <Field label="Product name" required icon={<BoxIcon />} htmlFor="light-product">
                      <input id="light-product" value={form.productName} onChange={(e) => update('productName', e.target.value)} placeholder="e.g. Sunflower Oil" maxLength={160} required />
                    </Field>
                    <Field label="Batch name / number" required icon={<TagIcon />} htmlFor="light-batch">
                      <input id="light-batch" value={form.batchNo} onChange={(e) => update('batchNo', e.target.value)} placeholder="e.g. SO-2026-10-A1" maxLength={80} required />
                    </Field>
                    <Field label="Quantity / pack size" required icon={<ScaleIcon />} htmlFor="light-pack">
                      <input id="light-pack" value={form.packSize} onChange={(e) => update('packSize', e.target.value)} placeholder="e.g. 1 Litre" maxLength={60} required />
                    </Field>
                  </div>
                </section>

                <section className="oh-bulk-step">
                  <header>
                    <span className="oh-bulk-step-no">2</span>
                    <div>
                      <h2>Number of QR codes</h2>
                      <p>One unique QR code per unit, and how they sit on the page.</p>
                    </div>
                  </header>
                  <div className="oh-bulk-qty">
                    <label htmlFor="light-qty">Generate</label>
                    <input
                      id="light-qty"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={MAX_QUANTITY}
                      value={form.quantity}
                      onChange={(e) => update('quantity', e.target.value === '' ? '' : Math.trunc(Number(e.target.value)))}
                      aria-invalid={Boolean(quantityError)}
                      aria-describedby="light-qty-hint"
                    />
                    <span>unique QR codes</span>
                  </div>
                  <p id="light-qty-hint" className={`oh-bulk-hint ${quantityError ? 'error' : ''}`}>
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
                      <span>Each QR code will have a unique QR ID.</span>
                      <strong>
                        All {quantityError ? '' : `${fmt(quantity)} `}QR codes belong to this product and batch, but each one identifies a unique unit.
                      </strong>
                    </div>
                  </div>
                </section>

                {billing && !quantityError && (
                  <div className={`oh-qr-cost ${shortBy ? 'short' : ''}`} aria-live="polite">
                    <div className="oh-qr-cost-row">
                      <span>Uses your Light QR stickers</span>
                      <strong>{fmt(quantity)} stickers</strong>
                    </div>
                    {shortBy ? (
                      <div className="oh-qr-cost-row short">
                        <span>
                          Your balance has {fmt(available)} {available === 1 ? 'sticker' : 'stickers'}, <b>{fmt(shortBy)} short</b>. Buy more to
                          generate this batch.
                        </span>
                        <button type="button" className="oh-qr-cost-add" onClick={() => setBuying({ initial: shortBy })}>
                          Buy {fmt(shortBy)}
                        </button>
                      </div>
                    ) : (
                      <div className="oh-qr-cost-row muted">
                        <span>Balance after generating</span>
                        <span>{fmt(available - quantity)} stickers</span>
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="oh-error" role="alert">
                    {error}
                  </div>
                )}

                <div className="oh-bulk-actions">
                  <button type="button" className="oh-bulk-btn ghost" onClick={startOver} disabled={busy}>
                    <ResetIcon /> Reset
                  </button>
                  <button type="submit" className="oh-bulk-btn primary" disabled={!ready || busy || shortBy > 0}>
                    {busy ? <Spinner /> : <QrGlyph />}
                    {busy ? 'Generating…' : `Generate ${quantityError ? '' : `${fmt(quantity)} `}unique QR codes`}
                  </button>
                </div>
              </form>
            )}
          </div>

          <aside className="oh-bulk-aside">
            <span className="oh-bulk-aside-label">Label preview</span>
            <BulkLabelPreview values={created || form} bar={created?.firstCode || 'QR-00001'} />
            <p className="oh-bulk-aside-note">Every label gets its own QR code and QR ID.</p>
          </aside>
        </div>
      )}

      {buying && (
        <BuyLightModal
          initial={buying.initial}
          onClose={() => setBuying(null)}
          onContinue={(purchase) => {
            setBuying(null);
            setCheckout(purchase);
          }}
        />
      )}
      {checkout && <CheckoutModal purchase={checkout} onClose={() => setCheckout(null)} onDone={() => setCheckout(null)} />}
      {activityOpen && <WalletActivityModal onClose={() => setActivityOpen(false)} />}
    </div>
  );
};

export default LightQr;
