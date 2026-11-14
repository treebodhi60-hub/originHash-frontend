import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import connectApi, { errorText } from '../api';
import { Badge, Button, Card, Empty, ErrorNote, Input, Loading, Modal, Notice, PageHead, Select, Toggle, fmtDate, useFormError } from '../ui.jsx';

// Producer: discounts and loyalty offers (a coupon code with details). Shown to signed-in consumers
// on the consumer QR, next to the unit's own unique coupon from the batch.

const OfferForm = ({ offer, products, onClose, onSaved }) => {
  const [form, setForm] = useState(
    offer
      ? { ...offer, productId: offer.productId ? String(offer.productId) : '', validTill: offer.validTill || '', details: offer.details || '' }
      : { title: '', couponCode: '', details: '', validTill: '', productId: '', isActive: true }
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useFormError();
  const fe = (f) => (error.field === f ? error.message : null);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = offer ? await connectApi.put(`/producer/offers/${offer.id}`, form) : await connectApi.post('/producer/offers', form);
      onSaved(data);
    } catch (err) {
      setError(err, 'Could not save the offer.');
      setBusy(false);
    }
  };
  return (
    <Modal
      title={offer ? 'Edit offer' : 'Add a discount or loyalty offer'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button busy={busy} onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className="cx-form two">
        <Input form={form} setForm={setForm} name="title" label="Title" required wide placeholder="e.g. 10% off your next bottle" error={fe('title')} />
        <Input form={form} setForm={setForm} name="couponCode" label="Coupon" required placeholder="e.g. WINE10" error={fe('couponCode')} />
        <Input form={form} setForm={setForm} name="validTill" label="Valid till" type="date" error={fe('validTill')} />
        <Select
          form={form}
          setForm={setForm}
          name="productId"
          label="Product"
          wide
          placeholder="All products"
          options={products.map((p) => ({ value: String(p.id), label: p.name }))}
          error={fe('productId')}
        />
        <Input form={form} setForm={setForm} name="details" label="Details" type="textarea" wide hint="How to use it, where it applies…" />
        <div className="cx-field wide">
          <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label="Active" description="Inactive offers aren't shown to consumers." />
        </div>
      </div>
      {error.message && !error.field && <ErrorNote>{error.message}</ErrorNote>}
    </Modal>
  );
};

export const ProducerOffers = () => {
  const [offers, setOffers] = useState(null);
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    Promise.all([connectApi.get('/producer/offers'), connectApi.get('/producer/products')])
      .then(([o, p]) => {
        setOffers(o.data.offers);
        setProducts(p.data.products);
      })
      .catch((err) => setError(errorText(err, 'Could not load offers.')));
  }, []);
  useEffect(load, [load]);

  const remove = async (o) => {
    if (!window.confirm(`Delete "${o.title}"?`)) return;
    try {
      const { data } = await connectApi.delete(`/producer/offers/${o.id}`);
      setNotice(data.message);
      load();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <div className="cx-stack">
      <PageHead
        eyebrow="Consumers"
        title="Discounts & loyalty"
        subtitle="Coupons you offer consumers. Each unit's own unique discount coupon (from the batch) is shown alongside these."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus size={16} /> Add offer
          </Button>
        }
      />
      {notice && <Notice tone="success">{notice}</Notice>}
      <ErrorNote>{error}</ErrorNote>
      <Card flush>
        {!offers ? (
          <Loading />
        ) : offers.length ? (
          <div className="cx-table-wrap">
            <table className="cx-table">
              <thead>
                <tr>
                  <th>Offer</th>
                  <th>Coupon</th>
                  <th>Product</th>
                  <th>Valid till</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <div className="cx-cell-main">
                        <strong>{o.title}</strong>
                        {o.details && <span>{o.details.slice(0, 80)}</span>}
                      </div>
                    </td>
                    <td className="cx-mono">{o.couponCode}</td>
                    <td>{o.productName || 'All products'}</td>
                    <td>{o.validTill ? fmtDate(o.validTill) : 'No end date'}</td>
                    <td>{o.isActive ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}</td>
                    <td className="actions">
                      <Button variant="ghost" className="small" onClick={() => setEditing(o)}>
                        Edit
                      </Button>
                      <Button variant="danger" className="small" onClick={() => remove(o)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No offers yet." />
        )}
      </Card>
      {editing && (
        <OfferForm
          offer={editing === 'new' ? null : editing}
          products={products}
          onClose={() => setEditing(null)}
          onSaved={(d) => {
            setEditing(null);
            setNotice(d.message);
            load();
          }}
        />
      )}
    </div>
  );
};
