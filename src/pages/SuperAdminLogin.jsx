import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, CircleAlert } from 'lucide-react';
import AuthShell from '../components/AuthShell.jsx';
import BrandLogo from '../components/BrandLogo.jsx';
import { Spinner } from '../components/Loader.jsx';
import { clearError, superAdminLogin } from '../store/authSlice';
import { CHAIN_ADMIN } from '../connect/api';
import '../styles/auth.css';

// The OriginHash superadmin's sign-in, on its own route (VITE_SUPERADMIN_LOGIN_PATH) that no other
// page links to. The public /login page doesn't accept the superadmin.
const SuperAdminLogin = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token, user, status, error } = useSelector((state) => state.auth);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  if (token && user?.isSuperAdmin) return <Navigate to={CHAIN_ADMIN} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setLocalError('');
    dispatch(clearError());
    if (!username.trim() || !password) {
      setLocalError('Enter your username and password.');
      return;
    }
    const result = await dispatch(superAdminLogin({ username: username.trim(), password }));
    if (superAdminLogin.fulfilled.match(result)) navigate(CHAIN_ADMIN, { replace: true });
  };

  return (
    <AuthShell>
      <div className="oh-si-hero">
        <span className="oh-si-icon">
          <BrandLogo size={64} />
        </span>
        <h1 className="oh-si-title">OriginHash HQ</h1>
        <p className="oh-si-sub">Superadmin sign-in.</p>
      </div>
      <form className="oh-si-form" onSubmit={submit}>
        <div className="oh-si-group">
          <div className="oh-si-float">
            <input id="hq-username" type="text" placeholder=" " value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            <label htmlFor="hq-username">Username</label>
          </div>
          <div className="oh-si-float">
            <input id="hq-password" type="password" placeholder=" " value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            <label htmlFor="hq-password">Password</label>
          </div>
        </div>
        {(localError || error) && (
          <p className="oh-si-error" role="alert">
            <CircleAlert size={15} strokeWidth={2} aria-hidden="true" />
            {localError || error}
          </p>
        )}
        <button className="oh-si-button" type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? (
            <>
              <Spinner />
              Logging in…
            </>
          ) : (
            <>
              Log in
              <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
};

export default SuperAdminLogin;
