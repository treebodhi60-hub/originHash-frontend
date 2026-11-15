import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import connectApi, { errorText } from '../api';
import { isProducerAdmin, useAppUser } from '../useChain';
import { Badge, Button, Card, Empty, ErrorNote, Input, Loading, Modal, Notice, PageHead, Toggle, useFormError } from '../ui.jsx';
import { LastLogin, LoginHistoryModal } from '../logins.jsx';

// Producer admin: the team — create users (username + password), edit them, allow chat, block.

const UserForm = ({ user, onClose, onSaved }) => {
  const [form, setForm] = useState(user ? { ...user, password: '', mobile: user.mobile || '', email: user.email || '' } : { username: '', password: '', name: '', mobile: '', email: '', canChat: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useFormError();
  const fe = (f) => (error.field === f ? error.message : null);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = user ? await connectApi.put(`/producer/users/${user.id}`, form) : await connectApi.post('/producer/users', form);
      onSaved(data);
    } catch (err) {
      setError(err, 'Could not save the user.');
      setBusy(false);
    }
  };
  return (
    <Modal
      title={user ? `Edit ${user.name || user.username}` : 'Add a team member'}
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
        <Input form={form} setForm={setForm} name="name" label="Name" required wide error={fe('name')} />
        {!user && <Input form={form} setForm={setForm} name="username" label="Username" required autoComplete="off" error={fe('username')} />}
        <Input
          form={form}
          setForm={setForm}
          name="password"
          label={user ? 'New password' : 'Password'}
          type="password"
          required={!user}
          autoComplete="new-password"
          hint={user ? 'Leave empty to keep it.' : 'At least 8 characters.'}
          error={fe('password')}
        />
        <Input form={form} setForm={setForm} name="mobile" label="Mobile" inputMode="numeric" maxLength={10} error={fe('mobile')} />
        <Input form={form} setForm={setForm} name="email" label="Email" type="email" error={fe('email')} />
        {user?.role !== 'admin' && (
          <div className="cx-field wide">
            <Toggle checked={form.canChat} onChange={(v) => setForm({ ...form, canChat: v })} label="Can answer consumer chats" description="They see unassigned conversations and the ones assigned to them." />
          </div>
        )}
      </div>
      {error.message && !error.field && <ErrorNote>{error.message}</ErrorNote>}
    </Modal>
  );
};

export const ProducerTeam = () => {
  const me = useAppUser();
  const isAdmin = isProducerAdmin(me);
  const [users, setUsers] = useState(null);
  const [editing, setEditing] = useState(null);
  const [history, setHistory] = useState(null);
  const closeHistory = useCallback(() => setHistory(null), []);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    connectApi
      .get('/producer/users')
      .then(({ data }) => setUsers(data.users))
      .catch((err) => setError(errorText(err, 'Could not load your team.')));
  }, []);
  useEffect(load, [load]);

  const toggleBlock = async (u) => {
    try {
      const { data } = await connectApi.patch(`/producer/users/${u.id}/block`, { blocked: !u.isBlocked });
      setNotice(data.message);
      load();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <div className="cx-stack">
      <PageHead
        eyebrow="Company"
        title="Team"
        subtitle={isAdmin ? 'Create logins for your employees, choose who answers consumer chats, and block anyone who leaves.' : 'Your company’s users. Only your admin can change them.'}
        actions={
          isAdmin && (
            <Button onClick={() => setEditing('new')}>
              <Plus size={16} /> Add user
            </Button>
          )
        }
      />
      {notice && <Notice tone="success">{notice}</Notice>}
      <ErrorNote>{error}</ErrorNote>
      <Card flush>
        {!users ? (
          <Loading />
        ) : users.length ? (
          <div className="cx-table-wrap">
            <table className="cx-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Chat</th>
                  <th>Last login</th>
                  <th>Status</th>
                  {isAdmin && <th />}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="cx-cell-main">
                        <strong>{u.name || '—'}</strong>
                        <span>{[u.mobile, u.email].filter(Boolean).join(' · ')}</span>
                      </div>
                    </td>
                    <td className="cx-mono">{u.username}</td>
                    <td>{u.role === 'admin' ? <Badge tone="role-admin">Admin</Badge> : <Badge tone="role-staff">Staff</Badge>}</td>
                    <td>{u.canChat ? <Badge tone="info">Answers chat</Badge> : '—'}</td>
                    <td>
                      <LastLogin user={u} onHistory={isAdmin || u.id === me?.id ? setHistory : null} />
                    </td>
                    <td>{u.isBlocked ? <Badge tone="danger">Blocked</Badge> : <Badge tone="success">Active</Badge>}</td>
                    {isAdmin && (
                      <td className="actions">
                        <Button variant="ghost" className="small" onClick={() => setEditing(u)}>
                          Edit
                        </Button>
                        {u.role !== 'admin' && (
                          <Button variant={u.isBlocked ? 'ghost' : 'danger'} className="small" onClick={() => toggleBlock(u)}>
                            {u.isBlocked ? 'Unblock' : 'Block'}
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No users yet." />
        )}
      </Card>
      {history && (
        <LoginHistoryModal
          endpoint={`/producer/users/${history.id}/logins`}
          title={`Login history · ${history.name || history.username}`}
          onClose={closeHistory}
        />
      )}
      {editing && (
        <UserForm
          user={editing === 'new' ? null : editing}
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
