import { Download, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers, toggleBlock, setSearch, setStatusFilter } from '../../store/usersSlice';
import { fetchAdmins, promoteUser, demoteAdmin, setSearch as setAdminSearch } from '../../store/adminsSlice';
import UserEditPanel from './UserEditPanel.jsx';
import AdminEditPanel from './AdminEditPanel.jsx';
import { LoadingState, RefreshingNote, Spinner } from '../../components/Loader.jsx';
import { useConfirm } from '../../components/ConfirmDialog.jsx';
import { userCode } from '../../utils/format';
import '../../styles/admin.css';

const exportCsv = (users) => {
  const header = ['Name', 'Previous names', 'Mobile', 'Type', 'Address', 'Email', 'Status', 'Scans'];
  const rows = users.map((u) => [
    u.name || '',
    (u.profileHistory?.previousNames || []).join('; '),
    u.mobile,
    u.userType || '',
    u.address || '',
    u.email || '',
    u.isBlocked ? 'Blocked' : 'Active',
    u.scansCount ?? 0,
  ]);
  const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'originhash-users.csv';
  a.click();
  URL.revokeObjectURL(url);
};

const PromoteModal = ({ user, onClose }) => {
  const dispatch = useDispatch();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Username and password are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    const action = await dispatch(
      promoteUser({ id: user.id, payload: { username: username.trim(), password, isSuperAdmin } })
    );
    setSaving(false);
    if (action.meta.requestStatus === 'fulfilled') {
      onClose();
    } else {
      setError(action.payload || 'Could not promote user.');
    }
  };

  return (
    <div className="oh-panel-backdrop" onClick={onClose}>
      <div className="oh-slide-panel" role="dialog" aria-modal="true" aria-label="Promote to admin" onClick={(e) => e.stopPropagation()}>
        <button className="oh-panel-close" onClick={onClose} type="button" aria-label="Close">
          <X size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <div className="oh-panel-header">
          <div className="oh-panel-avatar">{(user.name || '?').charAt(0).toUpperCase()}</div>
          <div className="oh-panel-name">Promote {user.name || 'user'} to admin</div>
          <div className="oh-panel-mobile">+91 {user.mobile}</div>
        </div>

        {error && <div className="oh-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="oh-field">
            <label>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" autoFocus />
          </div>
          <div className="oh-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
          </div>
          <label className="oh-checkbox-row">
            <input type="checkbox" checked={isSuperAdmin} onChange={(e) => setIsSuperAdmin(e.target.checked)} />
            Grant super-admin access
          </label>

          <div className="oh-edit-actions" style={{ marginTop: 16 }}>
            <button className="oh-btn-cancel" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="oh-btn-save" type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Spinner />
                  Promoting…
                </>
              ) : (
                'Promote to admin'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DemoteMobileModal = ({ admin, onClose }) => {
  const dispatch = useDispatch();
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    setSaving(true);
    const action = await dispatch(demoteAdmin({ id: admin.id, payload: { mobile } }));
    setSaving(false);
    if (action.meta.requestStatus === 'fulfilled') {
      onClose();
    } else {
      setError(action.payload || 'Could not demote admin.');
    }
  };

  return (
    <div className="oh-panel-backdrop" onClick={onClose}>
      <div className="oh-slide-panel" role="dialog" aria-modal="true" aria-label="Demote to normal user" onClick={(e) => e.stopPropagation()}>
        <button className="oh-panel-close" onClick={onClose} type="button" aria-label="Close">
          <X size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <div className="oh-panel-header">
          <div className="oh-panel-avatar">{(admin.name || '?').charAt(0).toUpperCase()}</div>
          <div className="oh-panel-name">Demote {admin.name || admin.username} to normal user</div>
        </div>

        <p className="oh-qr-folder-hint" style={{ marginBottom: 14 }}>
          This admin has no mobile number on file. A normal user logs in with mobile + OTP, so enter one to
          continue.
        </p>

        {error && <div className="oh-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="oh-field">
            <label>Mobile number</label>
            <div className="oh-mobile-input">
              <span className="oh-code">+91</span>
              <input
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit number"
                autoFocus
              />
            </div>
          </div>

          <div className="oh-edit-actions" style={{ marginTop: 16 }}>
            <button className="oh-btn-cancel" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="oh-btn-save" type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Spinner />
                  Demoting…
                </>
              ) : (
                'Demote to normal user'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const NormalUsersTab = ({ showPromote }) => {
  const dispatch = useDispatch();
  const { list, total, active, blocked, search, statusFilter, status } = useSelector((state) => state.users);
  const [panel, setPanel] = useState(null); // { mode: 'add' | 'edit', user? }
  const [promoting, setPromoting] = useState(null); // user being promoted
  const [blocking, setBlocking] = useState({}); // user id → true while its block/unblock runs

  useEffect(() => {
    const timeout = setTimeout(() => {
      dispatch(fetchUsers({ search, status: statusFilter }));
    }, 300);
    return () => clearTimeout(timeout);
  }, [dispatch, search, statusFilter]);

  const handleToggleBlock = async (user) => {
    setBlocking((b) => ({ ...b, [user.id]: true }));
    await dispatch(toggleBlock({ id: user.id, block: !user.isBlocked }));
    setBlocking((b) => {
      const next = { ...b };
      delete next[user.id];
      return next;
    });
  };

  return (
    <div>
      <div className="oh-admin-header">
        <div>
          <h1 className="oh-admin-title">Users</h1>
          <p className="oh-admin-subtitle">
            {total} users · {active} active · {blocked} blocked
          </p>
        </div>
        <div className="oh-header-actions">
          <button className="oh-btn-add" onClick={() => setPanel({ mode: 'add' })}>
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            Add user
          </button>
          <button className="oh-btn-export" onClick={() => exportCsv(list)}>
            <Download size={16} strokeWidth={1.75} aria-hidden="true" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="oh-toolbar">
        <input
          className="oh-search-input"
          placeholder="Search name, number or ID like USR-00012 (past names too)"
          value={search}
          onChange={(e) => dispatch(setSearch(e.target.value))}
        />
        <select
          className="oh-status-select"
          value={statusFilter}
          onChange={(e) => dispatch(setStatusFilter(e.target.value))}
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {status === 'loading' && list.length > 0 && <RefreshingNote />}

      <div className="oh-users-panel">
        {status === 'loading' && list.length === 0 && <LoadingState label="Loading users…" />}

        {status !== 'loading' && list.length === 0 && (
          <div className="oh-empty-state">No users match this search yet.</div>
        )}

        {list.map((user) => {
          const initial = (user.name || user.mobile || '?').charAt(0).toUpperCase();
          const { editCount = 0, previousNames = [] } = user.profileHistory || {};
          return (
            <div className="oh-user-row" key={user.id}>
              <span className="oh-user-id" title="User ID">{userCode(user.id)}</span>
              <div className="oh-user-avatar">
                {user.photoUrl ? <img src={user.photoUrl} alt={user.name} /> : initial}
              </div>
              <div className="oh-user-info">
                <div className="oh-user-name-row">
                  <Link className="oh-user-name oh-user-name-link" to={`/admin/users/${user.id}`}>
                    {user.name || 'Unnamed user'}
                  </Link>
                  {user.userType && <span className={`oh-badge ${user.userType}`}>{user.userType}</span>}
                  {user.isBlocked && <span className="oh-badge blocked">Blocked</span>}
                  {editCount > 0 && (
                    <span className="oh-badge changed" title={`Profile details changed ${editCount} time${editCount === 1 ? '' : 's'}`}>
                      Profile edited
                    </span>
                  )}
                </div>
                <div className="oh-user-meta">
                  +91 {user.mobile} · {user.address || '—'} · {user.scansCount ?? 0} scans
                </div>
                {previousNames.length > 0 && (
                  <div className="oh-user-meta oh-user-previous">Previously: {previousNames.join(', ')}</div>
                )}
              </div>
              <div className="oh-user-actions">
                {showPromote && (
                  <button className="oh-btn-cancel" onClick={() => setPromoting(user)}>
                    Promote
                  </button>
                )}
                <Link className="oh-btn-cancel" to={`/admin/users/${user.id}`}>
                  History
                </Link>
                <button className="oh-btn-edit" onClick={() => setPanel({ mode: 'edit', user })}>
                  Edit
                </button>
                <button
                  className={user.isBlocked ? 'oh-btn-unblock' : 'oh-btn-block'}
                  onClick={() => handleToggleBlock(user)}
                  disabled={Boolean(blocking[user.id])}
                >
                  {blocking[user.id] ? (
                    <>
                      <Spinner />
                      {user.isBlocked ? 'Unblocking…' : 'Blocking…'}
                    </>
                  ) : user.isBlocked ? (
                    'Unblock'
                  ) : (
                    'Block'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {panel && <UserEditPanel mode={panel.mode} user={panel.user} onClose={() => setPanel(null)} />}
      {promoting && <PromoteModal user={promoting} onClose={() => setPromoting(null)} />}
    </div>
  );
};

const AdminsTab = () => {
  const [confirm, confirmDialog] = useConfirm();
  const dispatch = useDispatch();
  const { list, search, status } = useSelector((state) => state.admins);
  const currentUser = useSelector((state) => state.auth.user);
  const [panel, setPanel] = useState(null); // { mode: 'add' | 'edit', admin? }
  const [demoteTarget, setDemoteTarget] = useState(null); // admin needing a mobile number
  const [demotingId, setDemotingId] = useState(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      dispatch(fetchAdmins({ search }));
    }, 300);
    return () => clearTimeout(timeout);
  }, [dispatch, search]);

  const handleDemote = async (admin) => {
    if (!admin.mobile) {
      setDemoteTarget(admin);
      return;
    }
    const ok = await confirm({
      title: `Demote ${admin.name || admin.username}?`,
      message: 'They lose admin access and sign in as a normal user with their mobile number and OTP.',
      confirmLabel: 'Demote to normal user',
      danger: true,
    });
    if (!ok) return;
    setDemotingId(admin.id);
    await dispatch(demoteAdmin({ id: admin.id }));
    setDemotingId(null);
  };

  return (
    <div>
      <div className="oh-admin-header">
        <div>
          <h1 className="oh-admin-title">Admins</h1>
          <p className="oh-admin-subtitle">{list.length} admin accounts</p>
        </div>
        <div className="oh-header-actions">
          <button className="oh-btn-add" onClick={() => setPanel({ mode: 'add' })}>
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            Add admin
          </button>
        </div>
      </div>

      <div className="oh-toolbar">
        <input
          className="oh-search-input"
          placeholder="Search name, username, email or ID"
          value={search}
          onChange={(e) => dispatch(setAdminSearch(e.target.value))}
        />
      </div>

      <div className="oh-users-panel">
        {status === 'loading' && list.length === 0 && <LoadingState label="Loading admins…" />}
        {status !== 'loading' && list.length === 0 && <div className="oh-empty-state">No admins match this search.</div>}

        {list.map((admin) => {
          const initial = (admin.name || admin.username || '?').charAt(0).toUpperCase();
          const isSelf = admin.id === currentUser?.id;
          return (
            <div className="oh-user-row" key={admin.id}>
              <span className="oh-user-id" title="User ID">{userCode(admin.id)}</span>
              <div className="oh-user-avatar">{initial}</div>
              <div className="oh-user-info">
                <div className="oh-user-name-row">
                  <span className="oh-user-name">{admin.name || admin.username}</span>
                  {admin.isSuperAdmin && <span className="oh-badge producer">Super-admin</span>}
                  {admin.isBlocked && <span className="oh-badge blocked">Blocked</span>}
                  {isSelf && <span className="oh-badge consumer">You</span>}
                </div>
                <div className="oh-user-meta">
                  @{admin.username} {admin.email ? `· ${admin.email}` : ''}
                </div>
              </div>
              <div className="oh-user-actions">
                {!isSelf && (
                  <button
                    className="oh-btn-cancel"
                    onClick={() => handleDemote(admin)}
                    disabled={demotingId === admin.id}
                  >
                    {demotingId === admin.id ? (
                      <>
                        <Spinner />
                        Demoting…
                      </>
                    ) : (
                      'Demote'
                    )}
                  </button>
                )}
                <button className="oh-btn-edit" onClick={() => setPanel({ mode: 'edit', admin })}>
                  Edit
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {panel && <AdminEditPanel mode={panel.mode} admin={panel.admin} onClose={() => setPanel(null)} />}
      {demoteTarget && <DemoteMobileModal admin={demoteTarget} onClose={() => setDemoteTarget(null)} />}
      {confirmDialog}
    </div>
  );
};

const UsersList = () => {
  const currentUser = useSelector((state) => state.auth.user);
  const [tab, setTab] = useState('users');

  if (!currentUser?.isSuperAdmin) {
    return <NormalUsersTab showPromote={false} />;
  }

  return (
    <div>
      <div className="oh-tabs">
        <button type="button" className={`oh-tab ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>
          Users
        </button>
        <button type="button" className={`oh-tab ${tab === 'admins' ? 'active' : ''}`} onClick={() => setTab('admins')}>
          Admins
        </button>
      </div>

      {tab === 'users' ? <NormalUsersTab showPromote /> : <AdminsTab />}
    </div>
  );
};

export default UsersList;
