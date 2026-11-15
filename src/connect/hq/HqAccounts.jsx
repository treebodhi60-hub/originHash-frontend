import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import connectApi, { errorText } from '../api';
import { Badge, Button, Card, Empty, ErrorNote, Input, Loading, Modal, Notice, PageHead, Select, Tabs, fmtDate, useFormError } from '../ui.jsx';

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
    note: 'Each retailer is associated with one producer and can press Sold only on that producer’s products (unlocking the consumer QR); they can scan other producers’ retailer QRs but not sell them. Retailers can also apply themselves — approve them under Requests. If the mobile already has an app account, it becomes a retailer.',
  },
  consumer: {
    title: 'Consumers',
    one: 'consumer',
    note: 'Every customer of the app. Anyone who logs in with a new mobile number is one; you can also add them here.',
  },
};

const producerOptions = (producers, current) =>
  producers
    .filter((p) => !p.isBlocked || String(p.id) === String(current || ''))
    .map((p) => ({ value: String(p.id), label: p.isBlocked ? `${p.name} (blocked)` : p.name }));

const AccountForm = ({ role, account, producers, onClose, onSaved }) => {
  const [form, setForm] = useState(
    account
      ? { ...account, producerId: account.producerId ? String(account.producerId) : '' }
      : { mobile: '', name: '', businessName: '', email: '', city: '', address: '', producerId: '' }
  );
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
        {role === 'retailer' && (
          <Select
            form={form}
            setForm={setForm}
            name="producerId"
            label="Producer (can mark only their products sold)"
            required
            wide
            placeholder="Choose the producer"
            options={producerOptions(producers, form.producerId)}
            error={fe('producerId')}
          />
        )}
        <Input form={form} setForm={setForm} name="email" label="Email" type="email" error={fe('email')} />
        <Input form={form} setForm={setForm} name="city" label="City" />
        <Input form={form} setForm={setForm} name="address" label="Address" wide />
      </div>
      {error.message && !error.field && <ErrorNote>{error.message}</ErrorNote>}
    </Modal>
  );
};

// Approving a retailer's application: confirm (or change) the producer and their shop details.
const ApproveModal = ({ application, producers, onClose, onDone }) => {
  const [form, setForm] = useState({
    producerId: application.producer ? String(application.producer.id) : '',
    businessName: application.businessName || '',
    city: application.city || '',
    address: application.address || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useFormError();
  const fe = (f) => (error.field === f ? error.message : null);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await connectApi.post(`/admin/retailer-applications/${application.id}/approve`, form);
      onDone(data);
    } catch (err) {
      setError(err, 'Could not approve.');
      setBusy(false);
    }
  };
  return (
    <Modal
      title={`Approve ${application.businessName}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button busy={busy} onClick={save}>
            Approve retailer
          </Button>
        </>
      }
    >
      <div className="cx-stack" style={{ gap: 14 }}>
        <p className="cx-muted" style={{ margin: 0 }}>
          {application.user?.name || 'The applicant'} · <span className="cx-mono">{application.user?.mobile}</span> becomes a retailer. They can press Sold only on the chosen
          producer&apos;s products.
        </p>
        <div className="cx-form two">
          <Select
            form={form}
            setForm={setForm}
            name="producerId"
            label="Producer"
            required
            wide
            placeholder="Choose the producer"
            options={producerOptions(producers, form.producerId)}
            error={fe('producerId')}
          />
          <Input form={form} setForm={setForm} name="businessName" label="Business name" required wide error={fe('businessName')} />
          <Input form={form} setForm={setForm} name="city" label="City" />
          <Input form={form} setForm={setForm} name="address" label="Address" />
        </div>
        {error.message && !error.field && <ErrorNote>{error.message}</ErrorNote>}
      </div>
    </Modal>
  );
};

// Retailers' own applications, waiting for OriginHash (and the decided ones).
const RetailerRequests = ({ producers, onChanged }) => {
  const [status, setStatus] = useState('pending');
  const [data, setData] = useState(null);
  const [approving, setApproving] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(() => {
    connectApi
      .get('/admin/retailer-applications', { params: { status } })
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(errorText(err, 'Could not load the requests.')));
  }, [status]);
  useEffect(() => {
    setData(null);
    load();
  }, [load]);
  const done = (d) => {
    setApproving(null);
    setNotice(d.message);
    load();
    onChanged();
  };
  const reject = async (a) => {
    const note = window.prompt(`Reject ${a.businessName}? Add a short reason for them (optional):`, '');
    if (note === null) return;
    try {
      done((await connectApi.post(`/admin/retailer-applications/${a.id}/reject`, { decisionNote: note })).data);
    } catch (err) {
      setError(errorText(err));
    }
  };
  return (
    <div className="cx-stack">
      {notice && <Notice tone="success">{notice}</Notice>}
      <ErrorNote>{error}</ErrorNote>
      <Card flush>
        <div className="cx-card-head">
          <Tabs
            value={status}
            onChange={setStatus}
            tabs={[
              { value: 'pending', label: 'Waiting', count: data?.pending },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
            ]}
          />
        </div>
        {!data ? (
          <Loading />
        ) : data.applications.length ? (
          <div className="cx-table-wrap">
            <table className="cx-table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Mobile</th>
                  <th>City</th>
                  <th>Sells for</th>
                  <th>Applied</th>
                  <th>{status === 'pending' ? 'Note' : 'Decision'}</th>
                  {status === 'pending' && <th />}
                </tr>
              </thead>
              <tbody>
                {data.applications.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="cx-cell-main">
                        <strong>{a.businessName}</strong>
                        <span>{a.user?.name || '—'}</span>
                      </div>
                    </td>
                    <td className="cx-mono">{a.user?.mobile}</td>
                    <td>
                      <div className="cx-cell-main">
                        <strong>{a.city || '—'}</strong>
                        {a.address && <span>{a.address}</span>}
                      </div>
                    </td>
                    <td>{a.producer?.name || '—'}</td>
                    <td>{fmtDate(a.createdAt)}</td>
                    <td className="cx-muted">{status === 'pending' ? a.note || '—' : `${fmtDate(a.decidedAt)}${a.decisionNote ? ` · ${a.decisionNote}` : ''}`}</td>
                    {status === 'pending' && (
                      <td className="actions">
                        <Button className="small" onClick={() => setApproving(a)}>
                          Approve
                        </Button>
                        <Button variant="danger" className="small" onClick={() => reject(a)}>
                          Reject
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title={status === 'pending' ? 'No requests waiting.' : `No ${status} requests.`}>
            {status === 'pending' && 'Anyone signed in to the app can apply to be a retailer from their menu.'}
          </Empty>
        )}
      </Card>
      {approving && <ApproveModal application={approving} producers={producers} onClose={() => setApproving(null)} onDone={done} />}
    </div>
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
  const [producers, setProducers] = useState([]);
  const [view, setView] = useState('accounts'); // retailers: 'accounts' | 'requests'
  const [pendingRequests, setPendingRequests] = useState(0);

  const loadRequestCount = useCallback(() => {
    if (role !== 'retailer') return;
    connectApi
      .get('/admin/retailer-applications', { params: { status: 'pending' } })
      .then(({ data }) => setPendingRequests(data.pending))
      .catch(() => {});
  }, [role]);
  useEffect(() => {
    setView('accounts');
    loadRequestCount();
    if (role === 'retailer') {
      connectApi
        .get('/admin/producers')
        .then(({ data }) => setProducers(data.producers))
        .catch(() => setProducers([]));
    }
  }, [role, loadRequestCount]);

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
      {role === 'retailer' && (
        <Tabs
          value={view}
          onChange={setView}
          tabs={[
            { value: 'accounts', label: 'Retailers' },
            { value: 'requests', label: 'Requests', count: pendingRequests },
          ]}
        />
      )}
      {role === 'retailer' && view === 'requests' ? (
        <RetailerRequests
          producers={producers}
          onChanged={() => {
            loadRequestCount();
            load();
          }}
        />
      ) : (
      <>
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
                  {role === 'retailer' ? <th>Producer</th> : <th>Category</th>}
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
                    {role === 'retailer' ? (
                      <td>{a.producerName || <Badge tone="warning">Not set · can’t sell</Badge>}</td>
                    ) : (
                      <td style={{ textTransform: 'capitalize' }}>{a.userType || '—'}</td>
                    )}
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
      </>
      )}
      {editing && (
        <AccountForm
          key={role}
          role={role}
          producers={producers}
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
