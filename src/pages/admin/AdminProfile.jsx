import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { AtSign, LogOut, Pencil, Phone, UserRound } from 'lucide-react';
import { updateProfile, logout } from '../../store/authSlice';
import { Spinner } from '../../components/Loader.jsx';
import { userCode } from '../../utils/format';
import '../../styles/admin.css';
import '../../styles/app-shell.css';

// The signed-in admin's own account: their name (editable), username or mobile, and Log out.
const AdminProfile = () => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    const fd = new FormData();
    fd.append('name', name);
    const result = await dispatch(updateProfile(fd));
    setSaving(false);
    if (updateProfile.rejected.match(result)) {
      setError(result.payload || 'Could not update profile.');
      return;
    }
    setEditing(false);
  };

  const cancel = () => {
    setEditing(false);
    setName(user.name || '');
    setError('');
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  const initial = (user.name || 'A').charAt(0).toUpperCase();
  const role = user.isSuperAdmin ? 'Super-admin' : 'Admin';

  return (
    <div className="oh-account">
      <header className="oh-admin-header">
        <div>
          <span className="oh-eyebrow">Settings</span>
          <h1 className="oh-admin-title">Admin profile</h1>
          <p className="oh-admin-subtitle">Your name appears beside the batches and changes you make.</p>
        </div>
      </header>

      <div className="oh-account-grid">
        <section className="oh-account-card oh-account-identity" aria-label="Your account">
          <div className="oh-account-avatar">
            <span>{initial}</span>
          </div>
          <div className="oh-account-name">{user.name || 'Admin'}</div>
          <div className="oh-account-sub">
            {user.username ? `@${user.username}` : user.mobile ? `+91 ${user.mobile}` : ''}
          </div>
          <div className="oh-account-stamps">
            <span className="oh-user-code">{userCode(user.id)}</span>
            <span className="oh-badge admin-role">{role}</span>
          </div>
          <button className="oh-account-logout" onClick={handleLogout} type="button">
            <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
            Log out
          </button>
        </section>

        <section className="oh-account-card" aria-labelledby="oh-admin-account-details">
          <div className="oh-account-card-head">
            <h2 id="oh-admin-account-details">Account details</h2>
            <p>Your sign-in details are managed by a super-admin from Users &rsaquo; Admins.</p>
          </div>

          <dl className="oh-account-list">
            <div className={`oh-account-row ${editing ? 'editing' : ''}`}>
              <dt>
                <UserRound size={16} strokeWidth={1.75} aria-hidden="true" />
                Full name
              </dt>
              {editing ? (
                <dd className="oh-edit-inline">
                  <label htmlFor="oh-admin-name" className="oh-sr-only">
                    Edit full name
                  </label>
                  <input
                    id="oh-admin-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSave();
                      if (e.key === 'Escape') cancel();
                    }}
                    autoFocus
                  />
                  {error && (
                    <div className="oh-field-alert" role="alert">
                      {error}
                    </div>
                  )}
                  <div className="oh-edit-actions">
                    <button className="oh-btn-cancel" onClick={cancel} type="button">
                      Cancel
                    </button>
                    <button className="oh-btn-save" onClick={handleSave} type="button" disabled={saving}>
                      {saving ? (
                        <>
                          <Spinner />
                          Saving…
                        </>
                      ) : (
                        'Save'
                      )}
                    </button>
                  </div>
                </dd>
              ) : (
                <dd>
                  <span className={`oh-account-value ${user.name ? '' : 'empty'}`}>{user.name || 'Nil'}</span>
                  <button type="button" className="oh-account-edit" onClick={() => setEditing(true)}>
                    <Pencil size={14} strokeWidth={1.75} aria-hidden="true" />
                    Edit<span className="oh-sr-only"> full name</span>
                  </button>
                </dd>
              )}
            </div>

            {user.username && (
              <div className="oh-account-row">
                <dt>
                  <AtSign size={16} strokeWidth={1.75} aria-hidden="true" />
                  Username
                </dt>
                <dd>
                  <span className="oh-account-value">@{user.username}</span>
                  <span className="oh-account-locked">Sign-in</span>
                </dd>
              </div>
            )}

            {user.mobile && (
              <div className="oh-account-row">
                <dt>
                  <Phone size={16} strokeWidth={1.75} aria-hidden="true" />
                  Mobile number
                </dt>
                <dd>
                  <span className="oh-account-value">+91 {user.mobile}</span>
                </dd>
              </div>
            )}
          </dl>
        </section>
      </div>
    </div>
  );
};

export default AdminProfile;
