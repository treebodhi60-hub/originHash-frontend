import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FileText, Plus } from 'lucide-react';
import connectApi, { CHAIN_ADMIN, errorText } from '../api';
import { Badge, Button, Card, Empty, ErrorNote, Field, FileUpload, Input, Loading, Modal, Notice, PageHead, RoleBadge, Stat, fmtDate, num, useFormError } from '../ui.jsx';
import { CategoryInput, discountText } from '../shared.jsx';
import { AllotBatchModal } from './HqBatches.jsx';
import { LastLogin, LoginHistoryModal } from '../logins.jsx';

// Superadmin: producers — register, edit, block, reset the admin login, and see each one's team,
// products, batches and requests.

const EMPTY = { name: '', mobile: '', email: '', address: '', website: '', username: '', password: '', adminName: '' };

const ProducerForm = ({ producer, onClose, onSaved }) => {
  const editing = Boolean(producer);
  const [form, setForm] = useState(editing ? { ...EMPTY, ...producer } : EMPTY);
  const [categories, setCategories] = useState(producer?.categories || []);
  const [doc, setDoc] = useState(producer?.verificationDoc || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useFormError();
  const fieldError = (f) => (error.field === f ? error.message : null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = { ...form, categories, verificationDoc: doc };
      const { data } = editing ? await connectApi.put(`/admin/producers/${producer.id}`, body) : await connectApi.post('/admin/producers', body);
      onSaved(data);
    } catch (err) {
      setError(err, 'Could not save the producer.');
      setBusy(false);
    }
  };

  return (
    <Modal
      wide
      title={editing ? `Edit ${producer.name}` : 'Register a producer'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button busy={busy} onClick={save}>
            {editing ? 'Save' : 'Register producer'}
          </Button>
        </>
      }
    >
      <div className="cx-form two">
        <Input form={form} setForm={setForm} name="name" label="Producer / company name" required wide error={fieldError('name')} />
        <Input form={form} setForm={setForm} name="mobile" label="Mobile" required inputMode="numeric" maxLength={10} error={fieldError('mobile')} />
        <Input form={form} setForm={setForm} name="email" label="Email" type="email" required error={fieldError('email')} />
        <Field label="Categories" required wide hint="A producer can work in several categories." error={fieldError('categories')}>
          <CategoryInput value={categories} onChange={setCategories} />
        </Field>
        <Field label="Verification document" required wide hint="GST, FSSAI, licence… (image or PDF, up to 10 MB)" error={fieldError('verificationDoc')}>
          <FileUpload endpoint="/admin/uploads" folder="documents" value={doc} onChange={setDoc} label="Upload document" />
        </Field>
        <Input form={form} setForm={setForm} name="website" label="Website" placeholder="https://" />
        <Input form={form} setForm={setForm} name="address" label="Address" />
        {!editing && (
          <>
            <div className="cx-field wide">
              <span className="oh-eyebrow">Producer admin login</span>
              <span className="cx-hint">The admin logs in with this username and password, and creates or blocks the producer&apos;s other users.</span>
            </div>
            <Input form={form} setForm={setForm} name="username" label="Username" required autoComplete="off" error={fieldError('username')} />
            <Input form={form} setForm={setForm} name="password" label="Password" type="password" required autoComplete="new-password" hint="At least 8 characters." error={fieldError('password')} />
            <Input form={form} setForm={setForm} name="adminName" label="Admin's name" wide hint="Defaults to the company name." />
          </>
        )}
      </div>
      {error.message && !error.field && <ErrorNote>{error.message}</ErrorNote>}
    </Modal>
  );
};

export const HqProducers = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [producers, setProducers] = useState(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    connectApi
      .get('/admin/producers', { params: { search } })
      .then(({ data }) => setProducers(data.producers))
      .catch((err) => setError(errorText(err, 'Could not load producers.')));
  }, [search]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="cx-stack">
      <PageHead
        eyebrow="Supply chain"
        title="Producers"
        subtitle="Register producers; each gets an admin login that manages their own team."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus size={16} /> Register producer
          </Button>
        }
      />
      <Card flush>
        <div className="cx-card-head">
          <div className="cx-search">
            <input className="cx-input" placeholder="Search name, mobile or email" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <ErrorNote>{error}</ErrorNote>
        {!producers ? (
          <Loading />
        ) : producers.length ? (
          <div className="cx-table-wrap">
            <table className="cx-table">
              <thead>
                <tr>
                  <th>Producer</th>
                  <th>Categories</th>
                  <th>Admin login</th>
                  <th className="num">Users</th>
                  <th className="num">Units</th>
                  <th className="num">Sold</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {producers.map((p) => (
                  <tr key={p.id} className="clickable" onClick={() => navigate(`${CHAIN_ADMIN}/producers/${p.id}`)}>
                    <td>
                      <div className="cx-cell-main">
                        <strong>{p.name}</strong>
                        <span>
                          {p.mobile} · {p.email}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="cx-chips">
                        {p.categories.map((c) => (
                          <span key={c} className="cx-chip plain">
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="cx-mono">{p.admin?.username || '—'}</td>
                    <td className="num">{num(p.totals?.users)}</td>
                    <td className="num">{num(p.totals?.units)}</td>
                    <td className="num">{num(p.totals?.sold)}</td>
                    <td>{p.isBlocked ? <Badge tone="danger">Blocked</Badge> : <Badge tone="success">Active</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title={search ? 'No producers match.' : 'No producers yet.'}>Register the first producer to start allotting QR batches.</Empty>
        )}
      </Card>
      {adding && (
        <ProducerForm
          onClose={() => setAdding(false)}
          onSaved={(data) => {
            setAdding(false);
            navigate(`${CHAIN_ADMIN}/producers/${data.producer.id}`);
          }}
        />
      )}
    </div>
  );
};

const AdminLoginModal = ({ producerId, admin, onClose, onSaved }) => {
  const [form, setForm] = useState({ username: admin.username, password: '', name: admin.name || '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useFormError();
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = { username: form.username, name: form.name, ...(form.password ? { password: form.password } : {}) };
      await connectApi.put(`/admin/producers/${producerId}/admin`, body);
      onSaved();
    } catch (err) {
      setError(err, 'Could not save.');
      setBusy(false);
    }
  };
  return (
    <Modal
      title="Producer admin login"
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
      <div className="cx-form">
        <Input form={form} setForm={setForm} name="name" label="Name" />
        <Input form={form} setForm={setForm} name="username" label="Username" error={error.field === 'username' ? error.message : null} />
        <Input
          form={form}
          setForm={setForm}
          name="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="Leave empty to keep the current password."
          error={error.field === 'password' ? error.message : null}
        />
        {error.message && !error.field && <ErrorNote>{error.message}</ErrorNote>}
      </div>
    </Modal>
  );
};

export const HqProducer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState(null);
  const closeHistory = useCallback(() => setHistory(null), []);

  const load = useCallback(() => {
    connectApi
      .get(`/admin/producers/${id}`)
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(errorText(err, 'Could not load the producer.')));
  }, [id]);
  useEffect(load, [load]);

  if (error && !data) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Loading />;
  const { producer, users, products, batches, requests } = data;
  const admin = users.find((u) => u.role === 'admin');

  const toggleBlock = async () => {
    setBusy(true);
    try {
      const { data: d } = await connectApi.patch(`/admin/producers/${id}/block`, { blocked: !producer.isBlocked });
      setNotice(d.message);
      load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cx-stack">
      <PageHead
        eyebrow={<Link to={`${CHAIN_ADMIN}/producers`}>Producers</Link>}
        title={producer.name}
        subtitle={producer.categories.join(' · ')}
        actions={
          <>
            <Button variant="ghost" onClick={() => setModal('edit')}>
              Edit details
            </Button>
            <Button variant={producer.isBlocked ? 'success' : 'danger'} busy={busy} onClick={toggleBlock}>
              {producer.isBlocked ? 'Unblock' : 'Block'}
            </Button>
            <Button onClick={() => setModal('allot')} disabled={producer.isBlocked}>
              Allot QR batch
            </Button>
          </>
        }
      />
      {notice && <Notice tone="success">{notice}</Notice>}
      {producer.isBlocked && <Notice tone="warning">This producer is blocked: none of its users can log in, and its products can&apos;t be marked sold.</Notice>}

      <div className="cx-stats">
        <Stat label="Users" value={num(producer.totals?.users)} />
        <Stat label="Batches" value={num(producer.totals?.batches)} />
        <Stat label="Units allotted" value={num(producer.totals?.units)} note={`${num((producer.totals?.units || 0) * 2)} QR codes`} />
        <Stat label="Units sold" value={num(producer.totals?.sold)} />
      </div>

      <div className="cx-grid-2">
        <Card title="Details">
          <dl className="cx-dl">
            <dt>Mobile</dt>
            <dd>{producer.mobile}</dd>
            <dt>Email</dt>
            <dd>{producer.email}</dd>
            <dt>Website</dt>
            <dd>{producer.website || '—'}</dd>
            <dt>Address</dt>
            <dd>{producer.address || '—'}</dd>
            <dt>Verification</dt>
            <dd>
              {producer.verificationDoc ? (
                <a className="cx-link" href={producer.verificationDoc.url} target="_blank" rel="noreferrer">
                  <FileText size={14} /> {producer.verificationDoc.name || 'View document'}
                </a>
              ) : (
                '—'
              )}
            </dd>
            <dt>Tracking</dt>
            <dd>{producer.trackingEnabled ? 'On' : 'Off'}</dd>
            <dt>Chat with brand</dt>
            <dd>{producer.chatEnabled ? 'On' : 'Off'}</dd>
            <dt>Registered</dt>
            <dd>{fmtDate(producer.createdAt)}</dd>
          </dl>
        </Card>
        <Card
          title="Team"
          actions={
            admin && (
              <Button variant="ghost" className="small" onClick={() => setModal('admin')}>
                Admin login
              </Button>
            )
          }
          flush
        >
          <div className="cx-table-wrap">
            <table className="cx-table">
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="cx-cell-main">
                        <strong>{u.name || u.username}</strong>
                        <span className="cx-mono">{u.username}</span>
                      </div>
                    </td>
                    <td>
                      <RoleBadge role={u.role === 'admin' ? 'producer' : 'staff'} /> {u.role === 'admin' && <Badge>Admin</Badge>}
                    </td>
                    <td>
                      <LastLogin user={u} onHistory={setHistory} />
                    </td>
                    <td>{u.isBlocked ? <Badge tone="danger">Blocked</Badge> : <Badge tone="success">Active</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        {history && (
          <LoginHistoryModal
            endpoint={`/admin/producers/${id}/users/${history.id}/logins`}
            title={`Login history · ${history.name || history.username}`}
            onClose={closeHistory}
          />
        )}
      </div>

      {requests.some((r) => r.status === 'pending') && (
        <Notice>
          {requests.filter((r) => r.status === 'pending').length} batch request(s) waiting.{' '}
          <Link className="cx-link" to={`${CHAIN_ADMIN}/batches`}>
            Review requests
          </Link>
        </Notice>
      )}

      <Card title="QR batches" flush>
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
                  <tr key={b.id} className="clickable" onClick={() => navigate(`${CHAIN_ADMIN}/batches/${b.id}`)}>
                    <td className="cx-mono">{b.batchNo}</td>
                    <td>{b.productName || <span className="cx-muted">—</span>}</td>
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
          <Empty title="No batches allotted yet." />
        )}
      </Card>

      <Card title="Products" flush>
        {products.length ? (
          <div className="cx-table-wrap">
            <table className="cx-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>NABL certificate</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.category || '—'}</td>
                    <td>
                      {p.nablCertificate ? (
                        <a className="cx-link" href={p.nablCertificate.url} target="_blank" rel="noreferrer">
                          View
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{p.isActive ? <Badge tone="success">Active</Badge> : <Badge>Hidden</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="The producer hasn't added products yet." />
        )}
      </Card>

      {modal === 'edit' && (
        <ProducerForm
          producer={producer}
          onClose={() => setModal(null)}
          onSaved={(d) => {
            setModal(null);
            setNotice(d.message);
            load();
          }}
        />
      )}
      {modal === 'admin' && admin && (
        <AdminLoginModal
          producerId={producer.id}
          admin={admin}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            setNotice('Producer admin login saved.');
            load();
          }}
        />
      )}
      {modal === 'allot' && (
        <AllotBatchModal
          producers={[producer]}
          products={products}
          onClose={() => setModal(null)}
          onDone={(d) => {
            setModal(null);
            setNotice(d.message);
            load();
          }}
        />
      )}
    </div>
  );
};
