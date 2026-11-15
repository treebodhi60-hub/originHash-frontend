import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Package, Plus } from 'lucide-react';
import connectApi, { errorText } from '../api';
import { useProducer } from '../useChain';
import { Badge, Button, Card, Empty, ErrorNote, Field, FileUpload, Input, Loading, Notice, PageHead, Select, Toggle, fmtDate, useFormError } from '../ui.jsx';

// Producer: products — info, NABL certificate and other certificates, website, images and
// warranty terms. Consumers see these on the consumer QR.

export const ProducerProducts = () => {
  const navigate = useNavigate();
  // "… added." after creating a product (passed in the navigation state).
  const notice = useLocation().state?.notice || '';
  const [products, setProducts] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    connectApi
      .get('/producer/products')
      .then(({ data }) => setProducts(data.products))
      .catch((err) => setError(errorText(err, 'Could not load products.')));
  }, []);
  return (
    <div className="cx-stack">
      <PageHead
        eyebrow="Catalogue"
        title="Products"
        subtitle="What consumers see when they scan the consumer QR: product info, certificates, website and images."
        actions={
          <Button onClick={() => navigate('/producer/products/new')}>
            <Plus size={16} /> Add product
          </Button>
        }
      />
      {notice && <Notice tone="success">{notice}</Notice>}
      <ErrorNote>{error}</ErrorNote>
      <Card flush>
        {!products ? (
          <Loading />
        ) : products.length ? (
          <div className="cx-table-wrap">
            <table className="cx-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>NABL</th>
                  <th>Images</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="clickable" onClick={() => navigate(`/producer/products/${p.id}`)}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {p.images[0] ? (
                          <img src={p.images[0].url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                        ) : (
                          <span className="cx-product-ph" style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--oh-well)' }}>
                            <Package size={18} />
                          </span>
                        )}
                        <strong>{p.name}</strong>
                      </div>
                    </td>
                    <td>{p.category || '—'}</td>
                    <td>{p.nablCertificate ? <Badge tone="success">Uploaded</Badge> : <Badge>None</Badge>}</td>
                    <td>{p.images.length}</td>
                    <td>{p.isActive ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}</td>
                    <td>{fmtDate(p.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No products yet.">Add a product, then link it to a QR batch so its consumer QR codes show it.</Empty>
        )}
      </Card>
    </div>
  );
};

const BLANK = { name: '', category: '', description: '', website: '', warrantyTerms: '', isActive: true };

const docBody = (d) => ({ title: d.title, ref: d.ref, name: d.name });

// A list of titled documents (images or PDFs): each can be renamed, opened or removed.
const DocList = ({ docs, setDocs, folder, addLabel, titlePlaceholder, max = 12 }) => (
  <div className="cx-stack" style={{ gap: 8 }}>
    {docs.map((c, i) => (
      <div key={c.ref} className="cx-search">
        <input
          className="cx-input"
          value={c.title}
          onChange={(e) => setDocs(docs.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)))}
          placeholder={titlePlaceholder}
          aria-label={titlePlaceholder}
        />
        <a className="cx-link" href={c.url} target="_blank" rel="noreferrer">
          {c.name || 'View'}
        </a>
        <Button variant="ghost" className="small" onClick={() => setDocs(docs.filter((_, k) => k !== i))}>
          Remove
        </Button>
      </div>
    ))}
    {docs.length < max && (
      <FileUpload
        endpoint="/producer/uploads"
        folder={folder}
        multiple
        max={max - docs.length}
        value={[]}
        onChange={(files) => {
          const added = (Array.isArray(files) ? files : [files]).filter(Boolean);
          if (added.length) setDocs([...docs, ...added.map((f) => ({ ...f, title: (f.name || '').replace(/\.[a-z0-9]+$/i, '') }))].slice(0, max));
        }}
        label={addLabel}
      />
    )}
  </div>
);

export const ProductForm = () => {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { producer } = useProducer();
  const categories = producer?.categories || [];
  const [form, setForm] = useState(isNew ? { ...BLANK, category: categories[0] || '' } : null);
  const [nabl, setNabl] = useState(null);
  const [images, setImages] = useState([]);
  const [certs, setCerts] = useState([]);
  const [warrantyDocs, setWarrantyDocs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [activeNote, setActiveNote] = useState('');
  const [saved, setSaved] = useState('');
  const [error, setError] = useFormError();
  const fe = (f) => (error.field === f ? error.message : null);

  const load = useCallback(() => {
    if (isNew) return;
    connectApi
      .get(`/producer/products/${id}`)
      .then(({ data }) => {
        const p = data.product;
        setForm({ name: p.name, category: p.category || '', description: p.description || '', website: p.website || '', warrantyTerms: p.warrantyTerms || '', isActive: p.isActive });
        setNabl(p.nablCertificate);
        setImages(p.images);
        setCerts(p.certifications);
        setWarrantyDocs(p.warrantyDocs || []);
      })
      .catch((err) => setError(err, 'Could not load the product.'));
  }, [id, isNew, setError]);
  useEffect(load, [load]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved('');
    try {
      const body = { ...form, nablCertificate: nabl, images: images.map((i) => i.ref), certifications: certs.map(docBody), warrantyDocs: warrantyDocs.map(docBody) };
      const { data } = isNew ? await connectApi.post('/producer/products', body) : await connectApi.put(`/producer/products/${id}`, body);
      if (isNew) {
        navigate('/producer/products', { state: { notice: `${data.product.name} added.` } });
        return;
      }
      setSaved(data.message);
    } catch (err) {
      setError(err, 'Could not save the product.');
    } finally {
      setBusy(false);
    }
  };

  // Existing product: the Active switch saves straight away (nothing else on the page is saved).
  const setActive = async (active) => {
    setToggling(true);
    setError(null);
    setActiveNote('');
    try {
      const { data } = await connectApi.patch(`/producer/products/${id}/active`, { active });
      setForm((f) => ({ ...f, isActive: data.product.isActive }));
      setActiveNote(data.message);
    } catch (err) {
      setError(err, 'Could not change the product.');
    } finally {
      setToggling(false);
    }
  };

  if (!form) return error.message ? <ErrorNote>{error.message}</ErrorNote> : <Loading />;

  return (
    <form className="cx-stack" onSubmit={save} style={{ maxWidth: 860 }}>
      <PageHead eyebrow={<Link to="/producer/products">Products</Link>} title={isNew ? 'Add product' : form.name || 'Product'} />
      {saved && <Notice tone="success">{saved}</Notice>}
      <Card title="Product information">
        <div className="cx-form two">
          <Input form={form} setForm={setForm} name="name" label="Product name" required error={fe('name')} />
          {categories.length ? (
            <Select form={form} setForm={setForm} name="category" label="Category" options={categories.map((c) => ({ value: c, label: c }))} error={fe('category')} />
          ) : (
            <Input form={form} setForm={setForm} name="category" label="Category" />
          )}
          <Input form={form} setForm={setForm} name="description" label="Description" type="textarea" wide hint="Ingredients, origin, size, how it's made…" />
          <Input form={form} setForm={setForm} name="website" label="Website" wide placeholder="https://" />
        </div>
      </Card>
      <Card title="Images">
        <FileUpload endpoint="/producer/uploads" folder="products" multiple accept="image/*" value={images} onChange={setImages} label="Add product images" />
      </Card>
      <Card title="Certifications">
        <div className="cx-form">
          <Field label="NABL certificate" hint="Image or PDF, up to 10 MB." error={fe('nablCertificate')}>
            <FileUpload endpoint="/producer/uploads" folder="certificates" value={nabl} onChange={setNabl} label="Upload NABL certificate" />
          </Field>
          <Field label="Other certificates" hint="FSSAI, organic, lab reports… Images or PDFs, up to 10 MB each.">
            <DocList docs={certs} setDocs={setCerts} folder="certificates" addLabel="Add certificates" titlePlaceholder="Certificate name" />
          </Field>
        </div>
      </Card>
      <Card title="Warranty">
        <div className="cx-form">
          <Input form={form} setForm={setForm} name="warrantyTerms" label="Warranty terms" type="textarea" hint="Shown to consumers with the warranty information retailers record at sale." />
          <Field label="Warranty documents" hint="Warranty card, terms sheet, service centres… Images or PDFs, up to 10 MB each, 12 at most. Consumers see them with the warranty.">
            <DocList docs={warrantyDocs} setDocs={setWarrantyDocs} folder="warranty" addLabel="Add warranty documents" titlePlaceholder="Document name" />
          </Field>
        </div>
      </Card>
      <Card>
        <Toggle
          checked={form.isActive}
          onChange={isNew ? (v) => setForm({ ...form, isActive: v }) : setActive}
          disabled={toggling}
          label="Active"
          description={
            isNew
              ? "Inactive products can't be chosen for new QR batch requests."
              : "Inactive products can't be chosen for new QR batch requests. Saved as soon as you switch it."
          }
        />
        {activeNote && (
          <div style={{ marginTop: 12 }}>
            <Notice tone="success">{activeNote}</Notice>
          </div>
        )}
      </Card>
      {error.message && !error.field && <ErrorNote>{error.message}</ErrorNote>}
      <div className="cx-page-actions">
        <Button type="submit" busy={busy} className="large">
          {isNew ? 'Add product' : 'Save product'}
        </Button>
        <Button variant="ghost" className="large" onClick={() => navigate('/producer/products')}>
          Back
        </Button>
      </div>
    </form>
  );
};
