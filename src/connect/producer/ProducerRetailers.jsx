import { useCallback, useEffect, useState } from 'react';
import { FileSpreadsheet, Plus } from 'lucide-react';
import connectApi, { errorText } from '../api';
import { isProducerAdmin, useAppUser } from '../useChain';
import { Button, Card, Empty, ErrorNote, Input, Loading, Modal, Notice, PageHead, fmtDate, num, useFormError } from '../ui.jsx';
import { BulkUploadModal } from '../retailers.jsx';

// Producer: their retailers — people who may mark the producer's products sold. The producer admin
// adds them (auto-approved), one by one or from an Excel sheet, edits and removes them. Removing
// only unlinks them: they stay a general retailer.

const BLANK = { name: '', mobile: '', email: '', businessName: '', city: '', address: '' };

const RetailerForm = ({ retailer, onClose, onSaved }) => {
  const [form, setForm] = useState(
    retailer
      ? { name: retailer.name || '', mobile: retailer.mobile || '', email: retailer.email || '', businessName: retailer.businessName || '', city: retailer.city || '', address: retailer.address || '' }
      : BLANK
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useFormError();
  const fe = (f) => (error.field === f ? error.message : null);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = retailer ? await connectApi.put(`/producer/retailers/${retailer.id}`, form) : await connectApi.post('/producer/retailers', form);
      onSaved(data);
    } catch (err) {
      setError(err, 'Could not save the retailer.');
      setBusy(false);
    }
  };
  return (
    <Modal
      title={retailer ? `Edit ${retailer.businessName || retailer.name}` : 'Add a retailer'}
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
        <Input form={form} setForm={setForm} name="name" label="Name" required error={fe('name')} />
        <Input
          form={form}
          setForm={setForm}
          name="mobile"
          label="Mobile (OTP login)"
          required
          inputMode="numeric"
          maxLength={14}
          disabled={Boolean(retailer)}
          hint={retailer ? 'Their login; it can’t be changed here.' : 'If this mobile already has an app account, it becomes your retailer.'}
          error={fe('mobile')}
        />
        <Input form={form} setForm={setForm} name="email" label="Email" type="email" wide error={fe('email')} />
        <Input form={form} setForm={setForm} name="businessName" label="Business / shop name" wide />
        <Input form={form} setForm={setForm} name="city" label="City" />
        <Input form={form} setForm={setForm} name="address" label="Address" />
      </div>
      {error.message && !error.field && <ErrorNote>{error.message}</ErrorNote>}
    </Modal>
  );
};

export const ProducerRetailers = () => {
  const isAdmin = isProducerAdmin(useAppUser());
  const [search, setSearch] = useState('');
  const [retailers, setRetailers] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | retailer
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    connectApi
      .get('/producer/retailers', { params: { search: search || undefined } })
      .then(({ data }) => setRetailers(data.retailers))
      .catch((err) => setError(errorText(err, 'Could not load your retailers.')));
  }, [search]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const remove = async (r) => {
    if (!window.confirm(`Remove ${r.businessName || r.name} from your retailers? They keep their login as a general retailer.`)) return;
    try {
      const { data } = await connectApi.delete(`/producer/retailers/${r.id}`);
      setNotice(data.message);
      load();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <div className="cx-stack">
      <PageHead
        eyebrow="Supply chain"
        title="Retailers"
        subtitle="Your retailers can mark your products sold (unlocking the consumer QR). They log in with their mobile and an OTP. Retailers you add here are approved straight away."
        actions={
          isAdmin && (
            <>
              <Button variant="ghost" onClick={() => setUploading(true)}>
                <FileSpreadsheet size={16} /> Bulk upload
              </Button>
              <Button onClick={() => setEditing('new')}>
                <Plus size={16} /> Add retailer
              </Button>
            </>
          )
        }
      />
      {notice && <Notice tone="success">{notice}</Notice>}
      <ErrorNote>{error}</ErrorNote>
      <Card flush>
        <div className="cx-card-head">
          <div className="cx-search">
            <input className="cx-input" placeholder="Search name, mobile, email, shop or city" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {retailers && <span className="cx-muted">{num(retailers.length)} retailers</span>}
        </div>
        {!retailers ? (
          <Loading />
        ) : retailers.length ? (
          <div className="cx-table-wrap">
            <table className="cx-table">
              <thead>
                <tr>
                  <th>Retailer</th>
                  <th>Mobile</th>
                  <th>City</th>
                  <th className="num">Sold</th>
                  <th>Added</th>
                  {isAdmin && <th />}
                </tr>
              </thead>
              <tbody>
                {retailers.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="cx-cell-main">
                        <strong>{r.businessName || r.name || '—'}</strong>
                        <span>{[r.businessName ? r.name : null, r.email].filter(Boolean).join(' · ') || '—'}</span>
                      </div>
                    </td>
                    <td className="cx-mono">{r.mobile}</td>
                    <td>{r.city || '—'}</td>
                    <td className="num">{num(r.sold)}</td>
                    <td>{fmtDate(r.createdAt)}</td>
                    {isAdmin && (
                      <td className="actions">
                        <Button variant="ghost" className="small" onClick={() => setEditing(r)}>
                          Edit
                        </Button>
                        <Button variant="danger" className="small" onClick={() => remove(r)}>
                          Remove
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title={search ? 'Nothing matches.' : 'No retailers yet.'}>
            {!search && isAdmin && 'Add your retailers one by one, or upload an Excel sheet with their name, mobile and email.'}
          </Empty>
        )}
      </Card>
      {editing && (
        <RetailerForm
          retailer={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(d) => {
            setEditing(null);
            setNotice(d.message);
            load();
          }}
        />
      )}
      {uploading && (
        <BulkUploadModal
          title="Upload your retailers"
          endpoint="/producer/retailers/bulk"
          templateEndpoint="/producer/retailers/template"
          onClose={() => setUploading(false)}
          onDone={(d) => {
            setNotice(d.message);
            load();
          }}
        />
      )}
    </div>
  );
};
