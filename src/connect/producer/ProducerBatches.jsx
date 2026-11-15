import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import connectApi, { errorText } from '../api';
import { Badge, Button, Card, Empty, ErrorNote, Input, Loading, Modal, Notice, PageHead, Select, Stat, StatusBadge, Tabs, fmtDate, fmtDateTime, num, placeText, roleLabel, useFormError } from '../ui.jsx';
import { BatchFacts, DownloadButtons, QrPair, UnitsTable, WarrantyForm, WarrantyList, discountText, scanLine } from '../shared.jsx';

// Producer: QR batches. Request a batch (units, max discount, expiry) from OriginHash; once
// allotted, link it to a product, print the QR pairs, and follow every unit.

const RequestModal = ({ products, onClose, onDone }) => {
  const [form, setForm] = useState({ quantity: '', maxDiscountPercent: '', expiryDate: '', productId: products[0] ? String(products[0].id) : '', batchNo: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useFormError();
  const fe = (f) => (error.field === f ? error.message : null);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await connectApi.post('/producer/batch-requests', { ...form, quantity: Number(form.quantity) });
      onDone(data);
    } catch (err) {
      setError(err, 'Could not send the request.');
      setBusy(false);
    }
  };
  return (
    <Modal
      wide
      title="Request a QR batch"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button busy={busy} onClick={save}>
            Send request
          </Button>
        </>
      }
    >
      <div className="cx-form two">
        <Input
          form={form}
          setForm={setForm}
          name="quantity"
          label="Retailer QR codes needed"
          type="number"
          min={1}
          max={5000}
          required
          hint={`You'll get ${num((Number(form.quantity) || 0) * 2)} QR codes: each retailer QR comes with its consumer QR.`}
          error={fe('quantity')}
        />
        <Input
          form={form}
          setForm={setForm}
          name="maxDiscountPercent"
          label="Max discount %"
          type="number"
          min={0}
          max={100}
          step="0.01"
          hint="0 or empty for no discount. Each unit gets its own unique coupon code."
          error={fe('maxDiscountPercent')}
        />
        <Input form={form} setForm={setForm} name="expiryDate" label="Expiry date" type="date" required hint="Coupons stay valid until this date." error={fe('expiryDate')} />
        <Input form={form} setForm={setForm} name="batchNo" label="Your batch number" placeholder="e.g. PW-2026-001" error={fe('batchNo')} />
        <Select
          form={form}
          setForm={setForm}
          name="productId"
          label="Product"
          wide
          placeholder="Choose later"
          options={products.map((p) => ({ value: String(p.id), label: p.name }))}
          error={fe('productId')}
        />
        <Input form={form} setForm={setForm} name="note" label="Note to OriginHash" wide />
      </div>
      <Notice>QR codes are free for now. OriginHash reviews the request and allots the batch.</Notice>
      {error.message && !error.field && <ErrorNote>{error.message}</ErrorNote>}
    </Modal>
  );
};

const requestTone = { pending: 'warning', allotted: 'success', rejected: 'danger' };

export const ProducerBatches = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState('batches');
  const [batches, setBatches] = useState(null);
  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [requesting, setRequesting] = useState(false);
  const [serial, setSerial] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    Promise.all([connectApi.get('/producer/batches'), connectApi.get('/producer/batch-requests'), connectApi.get('/producer/products')])
      .then(([b, r, p]) => {
        setBatches(b.data.batches);
        setRequests(r.data.requests);
        setProducts(p.data.products.filter((x) => x.isActive));
      })
      .catch((err) => setError(errorText(err, 'Could not load batches.')));
  }, []);
  useEffect(load, [load]);

  const find = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await connectApi.get('/producer/units/lookup', { params: { serial } });
      navigate(`/producer/units/${data.unitId}`);
    } catch (err) {
      setError(errorText(err, 'Unit not found.'));
    }
  };

  const pending = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="cx-stack">
      <PageHead
        eyebrow="Supply chain"
        title="QR batches"
        subtitle="Each unit has a retailer QR (scanned by the trade, marked Sold by the retailer) and a consumer QR that unlocks at sale."
        actions={
          <Button onClick={() => setRequesting(true)}>
            <Plus size={16} /> Request batch
          </Button>
        }
      />
      {notice && <Notice tone="success">{notice}</Notice>}
      <ErrorNote>{error}</ErrorNote>
      <form className="cx-search" onSubmit={find}>
        <input className="cx-input" placeholder="Find a unit by serial (OH000123)" value={serial} onChange={(e) => setSerial(e.target.value)} />
        <Button type="submit" variant="ghost">
          <Search size={16} /> Find
        </Button>
      </form>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'batches', label: 'Batches' },
          { value: 'requests', label: 'Requests', count: pending },
        ]}
      />
      {!batches ? (
        <Loading />
      ) : tab === 'batches' ? (
        <Card flush>
          {batches.length ? (
            <div className="cx-table-wrap">
              <table className="cx-table">
                <thead>
                  <tr>
                    <th>Batch</th>
                    <th>Product</th>
                    <th className="num">Units</th>
                    <th className="num">Sold</th>
                    <th>Discount</th>
                    <th>Expiry</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id} className="clickable" onClick={() => navigate(`/producer/batches/${b.id}`)}>
                      <td className="cx-mono">{b.batchNo}</td>
                      <td>{b.productName || <Badge tone="warning">Choose product</Badge>}</td>
                      <td className="num">{num(b.quantity)}</td>
                      <td className="num">{num(b.sold)}</td>
                      <td>{discountText(b.maxDiscountPercent)}</td>
                      <td>{fmtDate(b.expiryDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No batches yet.">Request a batch; OriginHash allots it with unique QR pairs and coupon codes.</Empty>
          )}
        </Card>
      ) : (
        <Card flush>
          {requests.length ? (
            <div className="cx-table-wrap">
              <table className="cx-table">
                <thead>
                  <tr>
                    <th>Requested</th>
                    <th>Product</th>
                    <th className="num">Units</th>
                    <th>Max discount</th>
                    <th>Expiry</th>
                    <th>Status</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} className={r.batchId ? 'clickable' : ''} onClick={r.batchId ? () => navigate(`/producer/batches/${r.batchId}`) : undefined}>
                      <td>
                        <div className="cx-cell-main">
                          <strong>{fmtDateTime(r.createdAt)}</strong>
                          <span>{r.requestedBy}</span>
                        </div>
                      </td>
                      <td>{r.productName || '—'}</td>
                      <td className="num">{num(r.quantity)}</td>
                      <td>{discountText(r.maxDiscountPercent)}</td>
                      <td>{fmtDate(r.expiryDate)}</td>
                      <td>
                        <Badge tone={requestTone[r.status]}>{r.status}</Badge>
                      </td>
                      <td className="cx-muted">{r.decisionNote || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No requests yet." />
          )}
        </Card>
      )}
      {requesting && (
        <RequestModal
          products={products}
          onClose={() => setRequesting(false)}
          onDone={(d) => {
            setRequesting(false);
            setNotice(d.message);
            setTab('requests');
            load();
          }}
        />
      )}
    </div>
  );
};

export const ProducerBatch = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    Promise.all([connectApi.get(`/producer/batches/${id}`), connectApi.get('/producer/products')])
      .then(([b, p]) => {
        setData(b.data);
        setProducts(p.data.products);
        setProductId(b.data.batch.productId ? String(b.data.batch.productId) : '');
      })
      .catch((err) => setError(errorText(err, 'Could not load the batch.')));
  }, [id]);
  useEffect(load, [load]);

  const saveProduct = async () => {
    setSaving(true);
    try {
      const { data: d } = await connectApi.put(`/producer/batches/${id}`, { productId: productId || null });
      setNotice(d.message);
      load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  if (error && !data) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Loading />;
  const { batch, units } = data;
  return (
    <div className="cx-stack">
      <PageHead
        eyebrow={<Link to="/producer/batches">QR batches</Link>}
        title={`Batch ${batch.batchNo}`}
        subtitle={batch.productName || 'No product linked yet'}
        actions={<DownloadButtons base={`/producer/batches/${batch.id}`} batchNo={batch.batchNo} />}
      />
      {notice && <Notice tone="success">{notice}</Notice>}
      <ErrorNote>{error}</ErrorNote>
      {!batch.productId && <Notice tone="warning">Link this batch to a product so its QR codes show the product to retailers and consumers.</Notice>}
      <div className="cx-stats">
        <Stat label="Units" value={num(batch.quantity)} note={`${num(batch.quantity * 2)} QR codes`} />
        <Stat label="Sold" value={num(batch.sold)} note={`${num(batch.quantity - batch.sold)} still in the supply chain`} />
        <Stat label="Coupons claimed" value={num(batch.couponsClaimed)} note={discountText(batch.maxDiscountPercent)} />
        <Stat label="Consumer scans" value={num(batch.consumerScans)} note={`${num(batch.tradeScans)} trade scans`} />
      </div>
      <div className="cx-grid-2">
        <Card title="Batch">
          <BatchFacts batch={batch} />
        </Card>
        <Card title="Product shown on these QR codes">
          <div className="cx-stack" style={{ gap: 10 }}>
            <select className="cx-input" value={productId} onChange={(e) => setProductId(e.target.value)} aria-label="Product">
              <option value="">No product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <div>
              <Button busy={saving} onClick={saveProduct} disabled={productId === (batch.productId ? String(batch.productId) : '')}>
                Save product
              </Button>
            </div>
          </div>
        </Card>
      </div>
      <Card title="Units" flush>
        <UnitsTable units={units} qrBase="/producer/units" onOpen={(u) => navigate(`/producer/units/${u.id}`)} />
      </Card>
    </div>
  );
};

export const ProducerUnit = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const load = useCallback(() => {
    connectApi
      .get(`/producer/units/${id}`)
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(errorText(err, 'Could not load the unit.')));
  }, [id]);
  useEffect(load, [load]);
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Loading />;
  const { unit, batch, product, sale, scans, warranties, couponClaimedBy, trackingEnabled } = data;

  return (
    <div className="cx-stack">
      <PageHead
        eyebrow={<Link to={`/producer/batches/${batch.id}`}>Batch {batch.batchNo}</Link>}
        title={unit.serial}
        subtitle={product?.name || 'No product linked'}
      />
      <div className="cx-grid-2">
        <Card title="Sale">
          <dl className="cx-dl">
            <dt>Status</dt>
            <dd>
              <StatusBadge status={unit.status} />
            </dd>
            {sale && (
              <>
                <dt>Sold on</dt>
                <dd>{fmtDateTime(sale.at)}</dd>
                <dt>Scanned by</dt>
                <dd>{sale.scannedBy ? `${sale.scannedBy.name} (${roleLabel(sale.scannedBy.type)})` : '—'}</dd>
                <dt>Sold by</dt>
                <dd>{sale.soldBy ? `${sale.soldBy.name} (${roleLabel(sale.soldBy.type)})` : '—'}</dd>
                {sale.location && (
                  <>
                    <dt>Where</dt>
                    <dd>{placeText(sale.location)}</dd>
                  </>
                )}
              </>
            )}
            <dt>Consumer QR</dt>
            <dd>{unit.status === 'sold' ? 'Unlocked' : 'Locked until sold'}</dd>
          </dl>
        </Card>
        <Card title="Coupon">
          {unit.couponCode ? (
            <dl className="cx-dl">
              <dt>Code</dt>
              <dd className="cx-mono">{unit.couponCode}</dd>
              <dt>Discount</dt>
              <dd>{unit.discountPercent}%</dd>
              <dt>Valid till</dt>
              <dd>{fmtDate(batch.expiryDate)}</dd>
              <dt>Claimed</dt>
              <dd>{unit.couponClaimed ? `${fmtDateTime(unit.couponClaimedAt)}${couponClaimedBy ? ` by ${couponClaimedBy.name || couponClaimedBy.mobile}` : ''}` : 'Not yet'}</dd>
            </dl>
          ) : (
            <Empty title="No discount on this batch." />
          )}
        </Card>
      </div>
      <Card title="QR codes">
        <QrPair base="/producer/units" unitId={unit.id} />
      </Card>
      <Card title="Journey">
        {!trackingEnabled && <Notice tone="warning">Tracking is off: distributor and retailer scans aren&apos;t being recorded (sales still are).</Notice>}
        {scans.length ? (
          <ol className="cx-timeline" style={{ marginTop: 12 }}>
            {scans.map((s) => (
              <li key={s.id} className={s.action === 'sold' ? 'sold' : s.qrType === 'consumer' ? 'consumer' : ''}>
                <strong>{scanLine(s)}</strong>
                <span>
                  {fmtDateTime(s.at)}
                  {s.by?.city ? ` · ${s.by.city}` : ''}
                  {s.location ? ` · ${placeText(s.location)}` : ''}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <Empty title="No scans yet." />
        )}
      </Card>
      <Card
        title="Warranty"
        actions={
          !adding && (
            <Button className="small" onClick={() => setAdding(true)}>
              Add warranty info
            </Button>
          )
        }
      >
        {product?.warrantyTerms && <p className="cx-muted" style={{ marginTop: 0, whiteSpace: 'pre-wrap' }}>{product.warrantyTerms}</p>}
        {product?.warrantyDocs?.length > 0 && (
          <p style={{ marginTop: 0, display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
            {product.warrantyDocs.map((d) => (
              <a key={d.ref} className="cx-link" href={d.url} target="_blank" rel="noreferrer">
                {d.title || d.name || 'Warranty document'}
              </a>
            ))}
          </p>
        )}
        {adding ? (
          <WarrantyForm
            uploadEndpoint="/producer/uploads"
            onCancel={() => setAdding(false)}
            onSave={async (body) => {
              await connectApi.post(`/producer/units/${unit.id}/warranty`, body);
              setAdding(false);
              load();
            }}
          />
        ) : (
          <WarrantyList warranties={warranties} />
        )}
      </Card>
    </div>
  );
};
