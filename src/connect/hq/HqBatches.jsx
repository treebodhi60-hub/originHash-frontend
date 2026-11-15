import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import connectApi, { CHAIN_ADMIN, errorText } from '../api';
import { Badge, Button, Card, Empty, ErrorNote, Field, Input, Loading, Modal, Notice, PageHead, Select, Stat, Tabs, fmtDate, fmtDateTime, num, useFormError } from '../ui.jsx';
import { BatchFacts, BatchNoField, DownloadButtons, UnitsTable, discountText } from '../shared.jsx';
import { PRINT_DEFAULTS, PairPrintLayout } from '../printLayout.jsx';
import { BatchFeaturesCard, SoldAccessCard } from '../retailers.jsx';

// Superadmin: batch requests from producers, allotting batches (with max discount and expiry, a
// unique coupon per unit), and every batch's units.

// The batch fields: quantity, max discount (0 = no discount), expiry, product, and the batch number
// (automatic, shown only). `fromRequest` (a producer's request): the units, max discount and expiry
// date they set — and `fixedProduct`, the product they chose — are shown but not changeable.
const FIXED_HINT = 'Set by the producer in their request; it can’t be changed here.';
const BatchFields = ({ form, setForm, error, products, fixedProduct, fromRequest = false }) => {
  const fe = (f) => (error.field === f ? error.message : null);
  return (
    <div className="cx-form two">
      {fromRequest ? (
        <Field label="Units" hint={`${num((Number(form.quantity) || 0) * 2)} QR codes. ${FIXED_HINT}`}>
          {(id) => <input id={id} value={num(Number(form.quantity) || 0)} readOnly disabled />}
        </Field>
      ) : (
        <Input form={form} setForm={setForm} name="quantity" label="Units" type="number" min={1} max={5000} required hint={`${num((Number(form.quantity) || 0) * 2)} QR codes (retailer + consumer for each unit)`} error={fe('quantity')} />
      )}
      {fromRequest ? (
        <Field label="Max discount %" hint={FIXED_HINT}>
          {(id) => <input id={id} value={form.maxDiscountPercent ? `${Number(form.maxDiscountPercent)}%` : 'No discount'} readOnly disabled />}
        </Field>
      ) : (
        <Input
          form={form}
          setForm={setForm}
          name="maxDiscountPercent"
          label="Max discount %"
          type="number"
          min={0}
          max={100}
          step="0.01"
          hint="0 or empty: no discount, no coupon codes."
          error={fe('maxDiscountPercent')}
        />
      )}
      {fromRequest ? (
        <Field label="Expiry date" hint={`Coupons are valid until this date. ${FIXED_HINT}`}>
          {(id) => <input id={id} value={fmtDate(form.expiryDate)} readOnly disabled />}
        </Field>
      ) : (
        <Input form={form} setForm={setForm} name="expiryDate" label="Expiry date" type="date" required hint="Coupons are valid until this date." error={fe('expiryDate')} />
      )}
      <BatchNoField endpoint="/admin/batches/next-number" />
      {fixedProduct ? (
        <Field label="Product" wide hint={FIXED_HINT}>
          {(id) => <input id={id} value={fixedProduct} readOnly disabled />}
        </Field>
      ) : products && (
        <Select
          form={form}
          setForm={setForm}
          name="productId"
          label="Product"
          required
          wide
          placeholder="Choose the product"
          options={products
            .filter((p) => p.isActive || String(p.id) === form.productId)
            .map((p) => ({ value: String(p.id), label: p.isActive ? p.name : `${p.name} (inactive)` }))}
          error={fe('productId') || (!products.length ? 'This producer has no products yet.' : null)}
        />
      )}
      <Input form={form} setForm={setForm} name="notes" label="Notes" wide />
    </div>
  );
};

// Allot a batch directly. `producers` to choose from (one = fixed); products load per producer.
export const AllotBatchModal = ({ producers, products: givenProducts, onClose, onDone }) => {
  const [form, setForm] = useState({ producerId: producers.length === 1 ? String(producers[0].id) : '', quantity: '', maxDiscountPercent: '', expiryDate: '', productId: '', notes: '' });
  const [products, setProducts] = useState(givenProducts || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useFormError();

  useEffect(() => {
    if (givenProducts || !form.producerId) return;
    setProducts(null);
    connectApi
      .get(`/admin/producers/${form.producerId}`)
      .then(({ data }) => setProducts(data.products))
      .catch(() => setProducts([]));
  }, [form.producerId, givenProducts]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await connectApi.post('/admin/batches', { ...form, quantity: Number(form.quantity) });
      onDone(data);
    } catch (err) {
      setError(err, 'Could not allot the batch.');
      setBusy(false);
    }
  };

  return (
    <Modal
      wide
      title="Allot a QR batch"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button busy={busy} onClick={save} disabled={!form.producerId}>
            Allot batch
          </Button>
        </>
      }
    >
      <div className="cx-stack" style={{ gap: 14 }}>
        {producers.length > 1 && (
          <Select
            form={form}
            setForm={setForm}
            name="producerId"
            label="Producer"
            placeholder="Choose a producer"
            options={producers.filter((p) => !p.isBlocked).map((p) => ({ value: String(p.id), label: p.name }))}
            error={error.field === 'producerId' ? error.message : null}
          />
        )}
        <BatchFields form={form} setForm={setForm} error={error} products={form.producerId ? products || [] : null} />
        <Notice>QR codes are free for now. Each unit gets a retailer QR, a consumer QR (unlocked when sold) and, with a discount, a unique coupon code.</Notice>
        {error.message && !['quantity', 'maxDiscountPercent', 'expiryDate', 'batchNo', 'productId', 'producerId'].includes(error.field) && <ErrorNote>{error.message}</ErrorNote>}
      </div>
    </Modal>
  );
};

const RequestModal = ({ request, onClose, onDone }) => {
  const [form, setForm] = useState({
    quantity: String(request.quantity),
    maxDiscountPercent: request.maxDiscountPercent === null ? '' : String(request.maxDiscountPercent),
    expiryDate: request.expiryDate,
    productId: request.productId ? String(request.productId) : '',
    notes: '',
    decisionNote: '',
  });
  const [products, setProducts] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useFormError();

  useEffect(() => {
    connectApi
      .get(`/admin/producers/${request.producerId}`)
      .then(({ data }) => setProducts(data.products))
      .catch(() => setProducts([]));
  }, [request.producerId]);

  const act = async (action) => {
    setBusy(action);
    setError(null);
    try {
      const { data } =
        action === 'allot'
          ? await connectApi.post(`/admin/batch-requests/${request.id}/allot`, { notes: form.notes, decisionNote: form.decisionNote })
          : await connectApi.post(`/admin/batch-requests/${request.id}/reject`, { decisionNote: form.decisionNote });
      onDone(data);
    } catch (err) {
      setError(err, 'Could not update the request.');
      setBusy(null);
    }
  };

  return (
    <Modal
      wide
      title={`Request from ${request.producerName}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="danger" busy={busy === 'reject'} disabled={Boolean(busy)} onClick={() => act('reject')}>
            Reject
          </Button>
          <Button busy={busy === 'allot'} disabled={Boolean(busy)} onClick={() => act('allot')}>
            Allot batch
          </Button>
        </>
      }
    >
      <div className="cx-stack" style={{ gap: 14 }}>
        <p className="cx-muted" style={{ margin: 0 }}>
          Requested by {request.requestedBy || 'the producer'} on {fmtDateTime(request.createdAt)}. The details below are fixed by the producer; allot or reject the request.
        </p>
        {request.note && <Notice>“{request.note}”</Notice>}
        <BatchFields
          form={form}
          setForm={setForm}
          error={error}
          products={products || []}
          fromRequest
          fixedProduct={request.productId ? request.productName || products?.find((p) => p.id === request.productId)?.name || `Product #${request.productId}` : null}
        />
        <Input form={form} setForm={setForm} name="decisionNote" label="Message to the producer" wide hint="Shown with the request (e.g. why it was rejected)." />
        {error.message && !['quantity', 'maxDiscountPercent', 'expiryDate', 'batchNo', 'productId'].includes(error.field) && <ErrorNote>{error.message}</ErrorNote>}
      </div>
    </Modal>
  );
};

const requestTone = { pending: 'warning', allotted: 'success', rejected: 'danger' };

export const HqBatches = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('pending');
  const [requests, setRequests] = useState(null);
  const [batches, setBatches] = useState(null);
  const [producers, setProducers] = useState([]);
  const [open, setOpen] = useState(null);
  const [allotting, setAllotting] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    Promise.all([connectApi.get('/admin/batch-requests'), connectApi.get('/admin/batches'), connectApi.get('/admin/producers')])
      .then(([r, b, p]) => {
        setRequests(r.data.requests);
        setBatches(b.data.batches);
        setProducers(p.data.producers);
      })
      .catch((err) => setError(errorText(err, 'Could not load batches.')));
  }, []);
  useEffect(load, [load]);

  const pending = (requests || []).filter((r) => r.status === 'pending');
  const done = (d) => {
    setOpen(null);
    setAllotting(false);
    setNotice(d.message);
    load();
  };

  return (
    <div className="cx-stack">
      <PageHead
        eyebrow="Supply chain"
        title="QR batches"
        subtitle="Producers request retailer QR batches; each unit is a retailer QR plus its consumer QR."
        actions={
          <Button onClick={() => setAllotting(true)} disabled={!producers.length}>
            <Plus size={16} /> Allot batch
          </Button>
        }
      />
      {notice && <Notice tone="success">{notice}</Notice>}
      <ErrorNote>{error}</ErrorNote>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'pending', label: 'Pending requests', count: pending.length },
          { value: 'batches', label: 'Allotted batches' },
          { value: 'history', label: 'Request history' },
        ]}
      />
      {!requests ? (
        <Loading />
      ) : tab === 'batches' ? (
        <Card flush>
          {batches.length ? (
            <div className="cx-table-wrap">
              <table className="cx-table">
                <thead>
                  <tr>
                    <th>Batch</th>
                    <th>Producer</th>
                    <th>Product</th>
                    <th className="num">Units</th>
                    <th className="num">Sold</th>
                    <th>Discount</th>
                    <th>Expiry</th>
                    <th>Allotted</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id} className="clickable" onClick={() => navigate(`${CHAIN_ADMIN}/batches/${b.id}`)}>
                      <td className="cx-mono">{b.batchNo}</td>
                      <td>{b.producerName}</td>
                      <td>{b.productName || <span className="cx-muted">—</span>}</td>
                      <td className="num">{num(b.quantity)}</td>
                      <td className="num">{num(b.sold)}</td>
                      <td>{discountText(b.maxDiscountPercent)}</td>
                      <td>{fmtDate(b.expiryDate)}</td>
                      <td>{fmtDate(b.allottedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No batches allotted yet." />
          )}
        </Card>
      ) : (
        <Card flush>
          {(tab === 'pending' ? pending : requests.filter((r) => r.status !== 'pending')).length ? (
            <div className="cx-table-wrap">
              <table className="cx-table">
                <thead>
                  <tr>
                    <th>Producer</th>
                    <th>Product</th>
                    <th className="num">Units</th>
                    <th>Max discount</th>
                    <th>Expiry</th>
                    <th>Requested</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {(tab === 'pending' ? pending : requests.filter((r) => r.status !== 'pending')).map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className="cx-cell-main">
                          <strong>{r.producerName}</strong>
                          <span>{r.requestedBy}</span>
                        </div>
                      </td>
                      <td>{r.productName || '—'}</td>
                      <td className="num">{num(r.quantity)}</td>
                      <td>{discountText(r.maxDiscountPercent)}</td>
                      <td>{fmtDate(r.expiryDate)}</td>
                      <td>{fmtDateTime(r.createdAt)}</td>
                      <td>
                        <Badge tone={requestTone[r.status]}>{r.status}</Badge>
                      </td>
                      <td className="actions">
                        {r.status === 'pending' ? (
                          <Button className="small" onClick={() => setOpen(r)}>
                            Review
                          </Button>
                        ) : r.batchId ? (
                          <Link className="cx-link" to={`${CHAIN_ADMIN}/batches/${r.batchId}`}>
                            View batch
                          </Link>
                        ) : (
                          <span className="cx-muted">{r.decisionNote || ''}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title={tab === 'pending' ? 'No pending requests.' : 'No decided requests yet.'} />
          )}
        </Card>
      )}
      {open && <RequestModal request={open} onClose={() => setOpen(null)} onDone={done} />}
      {allotting && <AllotBatchModal producers={producers} onClose={() => setAllotting(false)} onDone={done} />}
    </div>
  );
};

// Superadmin only: how the batch's QR PDF is laid out. Saved on the batch, so the producer's
// "Download QR PDF" uses the same layout.
const PrintLayoutCard = ({ batch, onSaved }) => {
  const saved = batch.printLayout || PRINT_DEFAULTS;
  const [layout, setLayout] = useState(saved);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const changed = layout.pageSize !== saved.pageSize || layout.perPage !== saved.perPage || layout.orientation !== saved.orientation;
  const save = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { data } = await connectApi.put(`/admin/batches/${batch.id}/print-layout`, layout);
      setMessage(data.message);
      onSaved(data.batch);
    } catch (err) {
      setError(errorText(err, 'Could not save the print layout.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card
      title="Print layout"
      actions={
        changed ? (
          <>
            <Button variant="ghost" className="small" onClick={() => setLayout(saved)} disabled={busy}>
              Undo changes
            </Button>
            <Button className="small" busy={busy} onClick={save}>
              Save layout
            </Button>
          </>
        ) : (
          <Badge tone="success">Saved</Badge>
        )
      }
    >
      <div className="cx-stack" style={{ gap: 12 }}>
        <PairPrintLayout value={layout} onChange={(v) => { setLayout(v); setMessage(''); }} units={batch.quantity} />
        <p className="cx-small cx-muted" style={{ margin: 0 }}>
          {changed
            ? 'You have unsaved changes. Press “Save layout” to apply them; until then downloads use the saved layout.'
            : 'Only OriginHash can change this. Change the paper, orientation or QR codes per page, then press “Save layout”. The producer’s “Download QR PDF” uses the saved layout.'}
        </p>
        {message && <Notice tone="success">{message}</Notice>}
        <ErrorNote>{error}</ErrorNote>
      </div>
    </Card>
  );
};

export const HqBatch = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    connectApi
      .get(`/admin/batches/${id}`)
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(errorText(err, 'Could not load the batch.')));
  }, [id]);
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Loading />;
  const { batch, units } = data;
  const updateBatch = (b) => setData((d) => ({ ...d, batch: { ...d.batch, ...b } }));
  return (
    <div className="cx-stack">
      <PageHead
        eyebrow={<Link to={`${CHAIN_ADMIN}/batches`}>QR batches</Link>}
        title={`Batch ${batch.batchNo}`}
        subtitle={batch.producerName}
        actions={<DownloadButtons base={`/admin/batches/${batch.id}`} batchNo={batch.batchNo} />}
      />
      <div className="cx-stats">
        <Stat label="Units" value={num(batch.quantity)} note={`${num(batch.quantity * 2)} QR codes`} />
        <Stat label="Sold" value={num(batch.sold)} />
        <Stat label="Coupons claimed" value={num(batch.couponsClaimed)} note={batch.maxDiscountPercent ? `${batch.maxDiscountPercent}% each` : 'No discount'} />
        <Stat label="Consumer scans" value={num(batch.consumerScans)} />
      </div>
      <Card title="Batch">
        <BatchFacts batch={batch} />
      </Card>
      <SoldAccessCard batch={batch} endpoint={`/admin/batches/${batch.id}/sold-access`} canEdit onSaved={updateBatch} />
      <BatchFeaturesCard batch={batch} endpoint={`/admin/batches/${batch.id}/features`} canEdit onSaved={updateBatch} />
      <PrintLayoutCard batch={batch} onSaved={updateBatch} />
      <Card title="Units" flush>
        <UnitsTable units={units} qrBase="/admin/units" />
      </Card>
    </div>
  );
};
