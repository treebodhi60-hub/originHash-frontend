import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import connectApi, { errorText } from '../api';
import { Badge, Button, Card, Empty, ErrorNote, Field, FileUpload, Input, Loading, Modal, Notice, PageHead, Select, fmtDate, todayStr, useFormError } from '../ui.jsx';
import { amountText, discountText, limitsText } from '../shared.jsx';

// Producer: one discount per product (coupon code, discount %, expiry date, and optionally an image
// and rupee limits). Shown on the consumer QR — the image if there is one, else the percentage — and
// used to fill "Max discount %" when requesting a QR batch.


const AmountSlider = ({ form, setForm, name, label, hint, error }) => (
  <Field label={label} hint={hint} error={error}>
    {(id) => (
      <div className="cx-range">
        <input
          id={id}
          type="range"
          min={0}
          max={500}
          step={10}
          value={Number(form[name]) || 0}
          onChange={(e) => setForm((f) => ({ ...f, [name]: Number(e.target.value) }))}
        />
        <output htmlFor={id}>{amountText(Number(form[name]) || 0)}</output>
      </div>
    )}
  </Field>
);

const OfferForm = ({ offer, products, offers, onClose, onSaved }) => {
  const [form, setForm] = useState(
    offer
      ? {
          productId: offer.productId ? String(offer.productId) : '',
          couponCode: offer.couponCode || '',
          discountPercent: offer.discountPercent ?? '',
          validTill: offer.validTill || '',
          image: offer.image || null,
          minAmount: offer.minAmount || 0,
          maxAmount: offer.maxAmount || 0,
        }
      : { productId: '', couponCode: '', discountPercent: '', validTill: '', image: null, minAmount: 0, maxAmount: 0 }
  );
  // Active products without a discount yet (plus this offer's own product when editing).
  const taken = new Set(offers.filter((o) => o.id !== offer?.id && o.productId).map((o) => String(o.productId)));
  const choices = products.filter((p) => (p.isActive && !taken.has(String(p.id))) || String(p.id) === form.productId);
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
      title={offer ? 'Edit discount' : 'Add a discount'}
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
        <Select
          form={form}
          setForm={setForm}
          name="productId"
          label="Product"
          required
          wide
          placeholder="Choose a product"
          options={choices.map((p) => ({ value: String(p.id), label: p.isActive ? p.name : `${p.name} (inactive)` }))}
          error={fe('productId') || (!choices.length ? 'Every active product already has a discount. Edit one instead.' : null)}
        />
        <Input form={form} setForm={setForm} name="couponCode" label="Coupon code" required placeholder="e.g. WINE10" error={fe('couponCode')} />
        <Input
          form={form}
          setForm={setForm}
          name="discountPercent"
          label="Discount %"
          type="number"
          min={0.01}
          max={100}
          step="0.01"
          required
          hint={form.image ? 'Needed with the image too. Fills “Max discount %” when you request a QR batch.' : 'Fills “Max discount %” when you request a QR batch for this product.'}
          error={fe('discountPercent')}
        />
        <AmountSlider form={form} setForm={setForm} name="minAmount" label="Min (minimum purchase)" hint="0 = no minimum." error={fe('minAmount')} />
        <AmountSlider form={form} setForm={setForm} name="maxAmount" label="Max (maximum discount)" hint="0 = no cap on the amount taken off." error={fe('maxAmount')} />
        <Input form={form} setForm={setForm} name="validTill" label="Expiry date" type="date" required min={todayStr()} wide error={fe('validTill')} />
        <Field label="Discount image" wide hint="Optional. Consumers see this image when they scan the product's consumer QR; without one they see the discount %." error={fe('image')}>
          {() => (
            <FileUpload
              endpoint="/producer/uploads"
              folder="offers"
              accept="image/*"
              value={form.image}
              onChange={(image) => setForm((f) => ({ ...f, image }))}
              label="Upload image"
            />
          )}
        </Field>
      </div>
      {offer && (!offer.isActive || (offer.validTill && offer.validTill < todayStr())) && (
        <Notice tone="warning">This discount is {offer.isActive ? 'expired' : 'inactive'}. Saving it with a future expiry date makes it active again.</Notice>
      )}
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
    if (!window.confirm(`Delete the ${o.couponCode} discount${o.productName ? ` for ${o.productName}` : ''}?`)) return;
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
        subtitle="One discount per product. Consumers see it on the product's consumer QR, and it fills “Max discount %” when you request a QR batch for that product."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus size={16} /> Add discount
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
                  <th>Product</th>
                  <th>Coupon code</th>
                  <th>Discount</th>
                  <th>Expiry date</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <div className="cx-cell-main">
                        <strong>{o.productName || 'All products'}</strong>
                        {o.discountPercent === null && <span>{o.title}</span>}
                      </div>
                    </td>
                    <td className="cx-mono">{o.couponCode}</td>
                    <td>
                      <div className="cx-offer-cell">
                        {o.image && <img src={o.image.url} alt="" />}
                        <div className="cx-cell-main">
                          <strong>{o.discountPercent !== null ? discountText(o.discountPercent) : '—'}</strong>
                          {limitsText(o) && <span>{limitsText(o)}</span>}
                        </div>
                      </div>
                    </td>
                    <td>{o.validTill ? fmtDate(o.validTill) : 'No end date'}</td>
                    <td>
                      {!o.isActive ? (
                        <Badge>Inactive</Badge>
                      ) : o.validTill && o.validTill < todayStr() ? (
                        <Badge tone="warning">Expired</Badge>
                      ) : (
                        <Badge tone="success">Active</Badge>
                      )}
                    </td>
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
          <Empty title="No discounts yet." />
        )}
      </Card>
      {editing && (
        <OfferForm
          offer={editing === 'new' ? null : editing}
          products={products}
          offers={offers || []}
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
