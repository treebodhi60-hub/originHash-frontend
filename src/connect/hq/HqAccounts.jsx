import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import connectApi, { errorText } from '../api';
import { Badge, Button, Card, Empty, ErrorNote, Input, Loading, Modal, Notice, PageHead, fmtDate, useFormError } from '../ui.jsx';

// Superadmin: distributors, retailers and consumers (one page per role). They log in with their
// mobile and an OTP; consumers can also sign themselves up.

const COPY = {
  distributor: {
    title: 'Distributors',
    one: 'distributor',
    note: 'They log in to the app with their mobile and OTP, and scan retailer QR codes as goods move (recorded for producers with Tracking on). If the mobile already has an app account, it becomes a distributor.',
  },
  retailer: {
    title: 'Retailers',
    one: 'retailer',
    note: 'They log in with their mobile and OTP, scan the retailer QR and press Sold, which unlocks the consumer QR, and add warranty information. If the mobile already has an app account, it becomes a retailer.',
  },
  consumer: {
    title: 'Consumers',
    one: 'consumer',
    note: 'Every customer of the app. Anyone who logs in with a new mobile number is one; you can also add them here.',
  },
};

const AccountForm = ({ role, account, onClose, onSaved }) => {
  const [form, setForm] = useState(account ? { ...account } : { mobile: '', name: '', businessName: '', email: '', city: '', address: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useFormError();
  const fe = (f) => (error.field === f ? error.message : null);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = { ...form, role };
      const { data } = account ? await connectApi.put(`/admin/accounts/${account.id}`, body) : await connectApi.post('/admin/accounts', body);
      onSaved(data);
    } catch (err) {
      setError(err, 'Could not save.');
      setBusy(false);
    }
  };
  return (
    <Modal
      title={account ? `Edit ${COPY[role].one}` : `Add a ${COPY[role].one}`}
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
        <Input form={form} setForm={setForm} name="mobile" label="Mobile (OTP login)" required inputMode="numeric" maxLength={10} error={fe('mobile')} />
        <Input form={form} setForm={setForm} name="name" label={role === 'consumer' ? 'Name' : 'Contact person'} required error={fe('name')} />
        {role !== 'consumer' && <Input form={form} setForm={setForm} name="businessName" label="Business name" required wide error={fe('businessName')} />}
        <Input form={form} setForm={setForm} name="email" label="Email" type="email" error={fe('email')} />
        <Input form={form} setForm={setForm} name="city" label="City" />
        <Input form={form} setForm={setForm} name="address" label="Address" wide />
      </div>
      {error.message && !error.field && <ErrorNote>{error.message}</ErrorNote>}
    </Modal>
  );
};

export const HqAccounts = () => {
  const { role } = useParams();
  const copy = COPY[role] || COPY.retailer;
  const [search, setSearch] = useState('');
  const [accounts, setAccounts] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | account
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    connectApi
      .get('/admin/accounts', { params: { role, search } })
      .then(({ data }) => setAccounts(data.accounts))
      .catch((err) => setError(errorText(err, 'Could not load accounts.')));
  }, [role, search]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);
  useEffect(() => {
    setAccounts(null);
    setNotice('');
  }, [role]);

  const toggleBlock = async (a) => {
    try {
      await connectApi.patch(`/admin/accounts/${a.id}/block`, { blocked: !a.isBlocked });
      setNotice(`${a.businessName || a.name || a.mobile} ${a.isBlocked ? 'unblocked' : 'blocked'}.`);
      load();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <div className="cx-stack">
      <PageHead
        eyebrow="Supply chain"
        title={copy.title}
        subtitle={copy.note}
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus size={16} /> Add {copy.one}
          </Button>
        }
      />
      {notice && <Notice tone="success">{notice}</Notice>}
      <ErrorNote>{error}</ErrorNote>
      <Card flush>
        <div className="cx-card-head">
          <div className="cx-search">
            <input className="cx-input" placeholder="Search mobile, name, business or city" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        {!accounts ? (
          <Loading />
        ) : accounts.length ? (
          <div className="cx-table-wrap">
            <table className="cx-table">
              <thead>
                <tr>
                  <th>{role === 'consumer' ? 'Name' : 'Business'}</th>
                  <th>Mobile</th>
                  <th>City</th>
                  <th>Added</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="cx-cell-main">
                        <strong>{a.businessName || a.name || '—'}</strong>
                        {a.businessName && <span>{a.name}</span>}
                      </div>
                    </td>
                    <td className="cx-mono">{a.mobile}</td>
                    <td>{a.city || '—'}</td>
                    <td>
                      {fmtDate(a.createdAt)}
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{a.userType || '—'}</td>
                    <td>{a.isBlocked ? <Badge tone="danger">Blocked</Badge> : <Badge tone="success">Active</Badge>}</td>
                    <td className="actions">
                      <Button variant="ghost" className="small" onClick={() => setEditing(a)}>
                        Edit
                      </Button>
                      <Button variant={a.isBlocked ? 'ghost' : 'danger'} className="small" onClick={() => toggleBlock(a)}>
                        {a.isBlocked ? 'Unblock' : 'Block'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title={search ? 'Nothing matches.' : `No ${copy.title.toLowerCase()} yet.`} />
        )}
      </Card>
      {editing && (
        <AccountForm
          key={role}
          role={role}
          account={editing === 'new' ? null : editing}
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
