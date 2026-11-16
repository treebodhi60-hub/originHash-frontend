import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileSpreadsheet, Plus } from 'lucide-react';
import connectApi, { errorText } from '../api';
import { BulkUploadModal } from '../retailers.jsx';
import { Badge, Button, Card, Empty, ErrorNote, Field, FileUpload, Input, Loading, Modal, Notice, PageHead, Select, Tabs, fmtDate, useFormError } from '../ui.jsx';

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
    note: 'A retailer of a producer can press Sold on that producer’s products; any retailer — general or another producer’s — on batches open to all retailers (the default). Retailers you or producers add are approved at once (without a producer they are general retailers). People who register themselves need your approval under Requests: approve them as a general retailer or a retailer of a producer.',
  },
  consumer: {
    title: 'Consumers',
    one: 'consumer',
    note: 'Consumer accounts only: people whose profile type is Consumer and who aren’t a retailer, distributor, producer user or admin. Anyone who signs up as a consumer is listed; you can also add them here.',
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
  const [identityDoc, setIdentityDoc] = useState(account?.identityDoc?.ref ? account.identityDoc : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useFormError();
  const fe = (f) => (error.field === f ? error.message : null);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = { ...form, role, ...(role === 'retailer' ? { identityDoc } : {}) };
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
        <Input form={form} setForm={setForm} name="mobile" label="Mobile (OTP login)" required inputMode="numeric" maxLength={14} error={fe('mobile')} />
        <Input form={form} setForm={setForm} name="name" label={role === 'distributor' ? 'Contact person' : 'Name'} required error={fe('name')} />
        <Input form={form} setForm={setForm} name="email" label="Email" type="email" error={fe('email')} />
        {role === 'retailer' && (
          <Select
            form={form}
            setForm={setForm}
            name="producerId"
            label="Producer"
            placeholder="General retailer (no producer)"
            options={producerOptions(producers, form.producerId)}
            error={fe('producerId')}
          />
        )}
        {role !== 'consumer' && (
          <Input form={form} setForm={setForm} name="businessName" label="Business name" required={role === 'distributor'} wide error={fe('businessName')} />
        )}
        <Input form={form} setForm={setForm} name="city" label="City" />
        <Input form={form} setForm={setForm} name="address" label="Address" wide />
        {role === 'retailer' && (
          <Field label="Identity document" hint="Optional: an image or PDF of their ID, up to 10 MB." error={fe('identityDoc')} wide>
            <FileUpload endpoint="/admin/uploads" folder="identity" value={identityDoc} onChange={setIdentityDoc} label="Upload ID (image or PDF)" />
          </Field>
        )}
      </div>
      {error.message && !error.field && <ErrorNote>{error.message}</ErrorNote>}
    </Modal>
  );
};

// A link to someone's identity document, or a dash.
const IdLink = ({ doc }) =>
  doc?.url ? (
    <a className="cx-link" href={doc.url} target="_blank" rel="noreferrer">
      View ID
    </a>
  ) : (
    <span className="cx-muted">—</span>
  );

// Approving a retailer's application: as a general retailer (no producer) or a retailer of a
// producer, and their shop details.
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
            {form.producerId ? 'Approve as their retailer' : 'Approve as general retailer'}
          </Button>
        </>
      }
    >
      <div className="cx-stack" style={{ gap: 14 }}>
        <p className="cx-muted" style={{ margin: 0 }}>
          {application.user?.name || 'The applicant'} · <span className="cx-mono">{application.user?.mobile}</span> becomes a retailer. Leave the producer as General
          for a general retailer (Sold on batches open to all retailers), or choose the producer they sell for.
        </p>
        <div className="cx-form two">
          <Select
            form={form}
            setForm={setForm}
            name="producerId"
            label="Producer"
            wide
            placeholder="General retailer (no producer)"
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

// General retailers (no producer): added by OriginHash without one, or approved as general.
// "Associate" opens their account to choose a producer.
const GeneralRetailers = ({ refreshKey, onEdit }) => {
  const [accounts, setAccounts] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setAccounts(null);
    connectApi
      .get('/admin/accounts', { params: { role: 'retailer', scope: 'general' } })
      .then(({ data }) => setAccounts(data.accounts))
      .catch((err) => setError(errorText(err, 'Could not load general retailers.')));
  }, [refreshKey]);
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!accounts) return <Loading />;
  if (!accounts.length) return <Empty title="No general retailers.">Retailers added without a producer, or approved as general, show here.</Empty>;
  return (
    <div className="cx-table-wrap">
      <table className="cx-table">
        <thead>
          <tr>
            <th>Retailer</th>
            <th>Mobile</th>
            <th>City</th>
            <th>ID</th>
            <th>Since</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <tr key={a.id}>
              <td>
                <div className="cx-cell-main">
                  <strong>{a.businessName || a.name || '—'}</strong>
                  {a.businessName && a.name && <span>{a.name}</span>}
                </div>
              </td>
              <td className="cx-mono">{a.mobile}</td>
              <td>{a.city || '—'}</td>
              <td>
                <IdLink doc={a.identityDoc} />
              </td>
              <td>{fmtDate(a.createdAt)}</td>
              <td className="actions">
                {a.isBlocked && <Badge tone="danger">Blocked</Badge>}
                <Button variant="ghost" className="small" onClick={() => onEdit(a)}>
                  Associate with producer
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Retailers' own applications, waiting for OriginHash (and the decided ones), and the general retailers.
const RetailerRequests = ({ producers, onChanged, onEdit, refreshKey, generalCount }) => {
  const [status, setStatus] = useState('pending');
  const [data, setData] = useState(null);
  const [approving, setApproving] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(() => {
    if (status === 'general') return;
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
    const note = window.prompt(
      `Decline ${a.businessName}? ${a.user?.partnerRole === 'retailer' ? 'They stay a general retailer (no producer).' : 'They stay a customer and won’t be a retailer.'} Add a short reason for them (optional):`,
      ''
    );
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
              { value: 'rejected', label: 'Declined' },
              { value: 'general', label: 'General', count: generalCount },
            ]}
          />
        </div>
        {status === 'general' ? (
          <GeneralRetailers refreshKey={refreshKey} onEdit={onEdit} />
        ) : !data ? (
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
                  <th>ID</th>
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
                    <td>
                      <IdLink doc={a.user?.identityDoc} />
                    </td>
                    <td>{fmtDate(a.createdAt)}</td>
                    <td className="cx-muted">{status === 'pending' ? a.note || '—' : `${fmtDate(a.decidedAt)}${a.decisionNote ? ` · ${a.decisionNote}` : ''}`}</td>
                    {status === 'pending' && (
                      <td className="actions">
                        <Button className="small" onClick={() => setApproving(a)}>
                          Approve
                        </Button>
                        <Button variant="danger" className="small" onClick={() => reject(a)}>
                          Decline
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title={status === 'pending' ? 'No requests waiting.' : `No ${status === 'rejected' ? 'declined' : status} requests.`}>
            {status === 'pending' &&
              'Anyone signed in to the app can register as a retailer from their menu. They become retailers only when you approve them — as a general retailer or a retailer of a producer.'}
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
  const [uploading, setUploading] = useState(false);
  const [bulkProducer, setBulkProducer] = useState({ producerId: '' });
  const [pendingRequests, setPendingRequests] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0); // reloads the General list after an edit

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
          <>
            {role === 'retailer' && (
              <Button variant="ghost" onClick={() => setUploading(true)}>
                <FileSpreadsheet size={16} /> Bulk upload
              </Button>
            )}
            <Button onClick={() => setEditing('new')}>
              <Plus size={16} /> Add {copy.one}
            </Button>
          </>
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
      {notice && <Notice tone="success">{notice}</Notice>}
      <ErrorNote>{error}</ErrorNote>
      {role === 'retailer' && view === 'requests' ? (
        <RetailerRequests
          producers={producers}
          refreshKey={refreshKey}
          // From the full list (no search): retailers without a producer.
          generalCount={accounts && !search ? accounts.filter((a) => !a.producerId).length : undefined}
          onEdit={(a) => {
            setNotice('');
            setEditing(a);
          }}
          onChanged={() => {
            loadRequestCount();
            load();
            setRefreshKey((k) => k + 1);
          }}
        />
      ) : (
      <>
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
                      <td>
                        <div className="cx-cell-main">
                          <strong>{a.producerName || <Badge>General</Badge>}</strong>
                          {a.identityDoc?.url && (
                            <a className="cx-link" href={a.identityDoc.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem' }}>
                              View ID
                            </a>
                          )}
                        </div>
                      </td>
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
      {uploading && (
        <BulkUploadModal
          title="Upload retailers"
          endpoint="/admin/retailers/bulk"
          templateEndpoint="/admin/retailers/template"
          fields={bulkProducer}
          extra={
            <Select
              form={bulkProducer}
              setForm={setBulkProducer}
              name="producerId"
              label="Producer for everyone in the sheet"
              placeholder="General retailers (no producer)"
              options={producerOptions(producers, bulkProducer.producerId)}
            />
          }
          onClose={() => setUploading(false)}
          onDone={(d) => {
            setNotice(d.message);
            load();
          }}
        />
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
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
};
