import { useEffect, useMemo, useState } from 'react';
import { Download, QrCode, X } from 'lucide-react';
import connectApi from './api';
import { downloadFile, errorText } from './api';
import { Badge, Button, Empty, ErrorNote, Field, FileUpload, Loading, Modal, StatusBadge, fmtDate, fmtDateTime, num, roleLabel, todayStr, useFormError } from './ui.jsx';

// Pieces shared by the superadmin console and the producer portal.

export const discountText = (pct) => (pct ? `${Number(pct)}%` : 'No discount');

export const BatchFacts = ({ batch }) => (
  <dl className="cx-dl">
    <dt>Batch no.</dt>
    <dd className="cx-mono">{batch.batchNo}</dd>
    {batch.producerName && (
      <>
        <dt>Producer</dt>
        <dd>{batch.producerName}</dd>
      </>
    )}
    <dt>Product</dt>
    <dd>{batch.productName || <span className="cx-muted">Not assigned yet</span>}</dd>
    <dt>Units</dt>
    <dd>
      {num(batch.quantity)} <span className="cx-muted">({num(batch.quantity * 2)} QR codes: retailer + consumer)</span>
    </dd>
    <dt>Max discount</dt>
    <dd>{discountText(batch.maxDiscountPercent)}</dd>
    <dt>Expiry date</dt>
    <dd>{fmtDate(batch.expiryDate)}</dd>
    <dt>Serials</dt>
    <dd className="cx-mono">{batch.firstSerial ? `${batch.firstSerial} – ${batch.lastSerial}` : '—'}</dd>
    <dt>Allotted</dt>
    <dd>{fmtDate(batch.allottedAt)}</dd>
  </dl>
);

export const DownloadButtons = ({ base, batchNo }) => {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const get = async (format) => {
    setBusy(format);
    setError('');
    try {
      await downloadFile(`${base}/file/${format}`, `${batchNo}-qr-pairs.${format}`);
    } catch (err) {
      setError(errorText(err, 'Could not download the file.'));
    } finally {
      setBusy(null);
    }
  };
  return (
    <>
      <Button variant="primary" className="small" busy={busy === 'pdf'} onClick={() => get('pdf')}>
        Download QR PDF
      </Button>
      <Button variant="ghost" className="small" busy={busy === 'csv'} onClick={() => get('csv')}>
        CSV
      </Button>
      {error && <span className="cx-field-error">{error}</span>}
    </>
  );
};

// A unit's two QR codes, as printed: the retailer QR (scanned by the trade, marked Sold) and the
// consumer QR (unlocked at sale). `base` is '/producer/units' or '/admin/units'.
export const QrPair = ({ base, unitId }) => {
  const [qr, setQr] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setQr(null);
    connectApi
      .get(`${base}/${unitId}/qr/json`)
      .then(({ data }) => setQr(data))
      .catch((err) => setError(errorText(err, 'Could not load the QR codes.')));
  }, [base, unitId]);
  const pdf = async () => {
    setBusy(true);
    try {
      await downloadFile(`${base}/${unitId}/qr/pdf`, `${qr.serial}-qr-pair.pdf`);
    } catch (err) {
      setError(errorText(err, 'Could not download the PDF.'));
    } finally {
      setBusy(false);
    }
  };
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!qr) return <Loading label="Drawing the QR codes…" />;
  const one = (kind, title, note) => (
    <figure className="cx-qr">
      <img src={qr[kind].image} alt={`${title} for ${qr.serial}`} />
      <figcaption>
        <strong>{title}</strong>
        <span>{note}</span>
        <a className="cx-btn ghost small" href={qr[kind].image} download={`${qr.serial}-${kind}-qr.png`}>
          <Download size={14} /> PNG
        </a>
      </figcaption>
    </figure>
  );
  return (
    <div className="cx-stack" style={{ gap: 12 }}>
      <div className="cx-qr-pair">
        {one('retailer', 'Retailer QR', 'Activation · scanned by distributors and retailers, marked Sold')}
        {one('consumer', 'Consumer QR', qr.status === 'sold' ? 'Unlocked · the customer scans this' : 'Locked until the retailer marks it sold')}
      </div>
      <div className="cx-search" style={{ justifyContent: 'space-between' }}>
        <span className="cx-mono">{qr.serial}</span>
        <Button variant="primary" className="small" busy={busy} onClick={pdf}>
          <Download size={14} /> Label PDF (both)
        </Button>
      </div>
    </div>
  );
};

export const QrPairModal = ({ base, unit, onClose }) => (
  <Modal title={`QR codes · ${unit.serial}`} onClose={onClose} wide>
    <QrPair base={base} unitId={unit.id} />
  </Modal>
);

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'allotted', label: 'In supply chain' },
  { value: 'sold', label: 'Sold' },
];

// Every unit of a batch. `onOpen(unit)` makes rows open the unit (producer portal).
export const UnitsTable = ({ units, onOpen, qrBase }) => {
  const [filter, setFilter] = useState('all');
  const [showing, setShowing] = useState(null);
  const [search, setSearch] = useState('');
  const shown = useMemo(
    () =>
      units.filter(
        (u) =>
          (filter === 'all' || u.status === filter) &&
          (!search || u.serial.includes(search.toUpperCase()) || (u.couponCode || '').includes(search.toUpperCase()))
      ),
    [units, filter, search]
  );
  return (
    <>
      <div className="cx-card-head" style={{ padding: '12px 18px', margin: 0, borderBottom: '1px solid var(--oh-border)' }}>
        <div className="cx-search">
          <select className="cx-input" style={{ width: 'auto' }} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter units">
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <input className="cx-input" placeholder="Search serial or coupon" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span className="cx-muted">
          {num(shown.length)} of {num(units.length)}
        </span>
      </div>
      <div className="cx-table-wrap">
        <table className="cx-table">
          <thead>
            <tr>
              <th>Serial</th>
              <th>Status</th>
              <th>Sold by</th>
              <th>Coupon</th>
              <th className="num">Trade scans</th>
              <th className="num">Consumer scans</th>
              <th>QR codes</th>
            </tr>
          </thead>
          <tbody>
            {shown.slice(0, 500).map((u) => (
              <tr key={u.id} className={onOpen ? 'clickable' : ''} onClick={onOpen ? () => onOpen(u) : undefined}>
                <td className="cx-mono">{u.serial}</td>
                <td>
                  <StatusBadge status={u.status} />
                </td>
                <td>
                  {u.soldBy ? (
                    <div className="cx-cell-main">
                      <strong>{u.soldBy.name}</strong>
                      <span>{fmtDateTime(u.soldAt)}</span>
                    </div>
                  ) : (
                    <span className="cx-muted">—</span>
                  )}
                </td>
                <td>
                  {u.couponCode ? (
                    <div className="cx-cell-main">
                      <span className="cx-mono" style={{ color: 'var(--oh-ink-900)' }}>
                        {u.couponCode}
                      </span>
                      <span>{u.couponClaimed ? 'Claimed' : `${u.discountPercent}% · not claimed`}</span>
                    </div>
                  ) : (
                    <span className="cx-muted">—</span>
                  )}
                </td>
                <td className="num">{num(u.tradeScanCount)}</td>
                <td className="num">{num(u.consumerScanCount)}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" className="small" onClick={() => setShowing(u)}>
                    <QrCode size={14} /> View QR
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <Empty title="No units match." />}
        {shown.length > 500 && <p className="cx-small">Showing the first 500. Search by serial to find others.</p>}
      </div>
      {showing && <QrPairModal base={qrBase} unit={showing} onClose={() => setShowing(null)} />}
    </>
  );
};

// A single-series bar per day (last 14 days). Values show on hover / focus.
export const DayBars = ({ days, field, label }) => {
  const max = Math.max(1, ...days.map((d) => d[field]));
  const total = days.reduce((s, d) => s + d[field], 0);
  const short = (day) => new Date(`${day}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return (
    <div>
      <div className="cx-bars" role="img" aria-label={`${label}, last 14 days: ${total} in total`}>
        {days.map((d) => (
          <span key={d.day} className={`cx-bar ${d[field] ? '' : 'zero'}`} tabIndex={0} aria-label={`${short(d.day)}: ${d[field]}`}>
            <i style={{ height: `${(d[field] / max) * 100}%` }} />
            <b>
              {short(d.day)} · {d[field]}
            </b>
          </span>
        ))}
      </div>
      <div className="cx-bar-axis">
        <span>{short(days[0].day)}</span>
        <span>Today</span>
      </div>
    </div>
  );
};

export const scanLine = (s) => {
  const who = s.by?.name || roleLabel(s.actorType);
  if (s.action === 'sold') return `Marked sold by ${who}`;
  if (s.qrType === 'consumer') return `Consumer QR scanned${s.actorType === 'consumer' ? '' : ` by ${roleLabel(s.actorType).toLowerCase()}`}`;
  return `Retailer QR scanned by ${who}`;
};

export const WarrantyList = ({ warranties }) =>
  warranties.length ? (
    <div>
      {warranties.map((w) => (
        <div key={w.id} className="cx-warranty">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <strong>Registered {fmtDate(w.registeredOn)}</strong>
            {w.validTill && <Badge tone="success">Valid till {fmtDate(w.validTill)}</Badge>}
          </div>
          <span className="cx-muted" style={{ fontSize: '0.8rem' }}>
            Added by {w.addedBy?.name || roleLabel(w.addedBy?.type)} ({roleLabel(w.addedBy?.type)}) · {fmtDateTime(w.createdAt)}
          </span>
          {w.details && <p>{w.details}</p>}
          {w.photos.length > 0 && (
            <div className="cx-photos">
              {w.photos.map((p) => (
                <a key={p.ref} href={p.url} target="_blank" rel="noreferrer">
                  <img src={p.url} alt="Warranty" />
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  ) : (
    <Empty title="No warranty information yet." />
  );

// Warranty: registration date, valid till, details and photos. `onSave(body)` returns a promise.
export const WarrantyForm = ({ uploadEndpoint, onSave, onCancel }) => {
  const [form, setForm] = useState({ registeredOn: todayStr(), validTill: '', details: '' });
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useFormError();
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave({ ...form, photos: photos.map((p) => p.ref) });
    } catch (err) {
      setError(err, 'Could not save the warranty.');
      setBusy(false);
    }
  };
  return (
    <form className="cx-form two" onSubmit={submit}>
      <Field label="Registration / purchase date" required error={error.field === 'registeredOn' ? error.message : null}>
        {(id) => <input id={id} type="date" value={form.registeredOn} onChange={(e) => setForm({ ...form, registeredOn: e.target.value })} required />}
      </Field>
      <Field label="Valid till" error={error.field === 'validTill' ? error.message : null}>
        {(id) => <input id={id} type="date" value={form.validTill} onChange={(e) => setForm({ ...form, validTill: e.target.value })} />}
      </Field>
      <Field label="Details" wide hint="Warranty terms, bill number, claim notes…">
        {(id) => <textarea id={id} rows={3} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />}
      </Field>
      <Field label="Photos" wide error={error.field === 'photos' ? error.message : null}>
        <FileUpload endpoint={uploadEndpoint} folder="warranty" multiple accept="image/*" value={photos} onChange={setPhotos} label="Add photos" />
      </Field>
      {error.message && !['registeredOn', 'validTill', 'photos'].includes(error.field) && (
        <div className="cx-field wide">
          <ErrorNote>{error.message}</ErrorNote>
        </div>
      )}
      <div className="cx-field wide" style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" busy={busy}>
          Save warranty
        </Button>
      </div>
    </form>
  );
};

// Free-text categories as chips (Honey, Wine, …).
export const CategoryInput = ({ value, onChange }) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const parts = draft
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length) onChange([...new Set([...value, ...parts])]);
    setDraft('');
  };
  return (
    <div className="cx-stack" style={{ gap: 8 }}>
      {value.length > 0 && (
        <div className="cx-chips">
          {value.map((c) => (
            <span key={c} className="cx-chip">
              {c}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== c))} aria-label={`Remove ${c}`}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="cx-search">
        <input
          className="cx-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
          placeholder="e.g. Honey, Wine"
          aria-label="Add category"
        />
        <Button variant="ghost" className="small" onClick={add}>
          Add
        </Button>
      </div>
    </div>
  );
};
