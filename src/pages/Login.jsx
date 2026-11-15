import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CircleAlert, ShoppingBag, Store, Truck } from 'lucide-react';
import AuthShell from '../components/AuthShell.jsx';
import BrandLogo from '../components/BrandLogo.jsx';
import { Spinner } from '../components/Loader.jsx';
import { sendOtp, adminLogin, clearError } from '../store/authSlice';
import '../styles/auth.css';
import { takeReturn } from '../utils/returnTo';

// The mobile + OTP tab is for everyone outside the producers' teams.
const USER_ROLES = [
  { label: 'Consumer', hint: 'Verify & buy', Icon: ShoppingBag },
  { label: 'Retailer', hint: 'Scan & sell', Icon: Store },
  { label: 'Distributor', hint: 'Scan in transit', Icon: Truck },
];

const Login = () => {
  const [mode, setMode] = useState('user'); // 'user' | 'admin'
  const [mobile, setMobile] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error } = useSelector((state) => state.auth);

  const switchMode = (next) => {
    setMode(next);
    setLocalError('');
    dispatch(clearError());
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    dispatch(clearError());

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setLocalError('Enter a valid 10-digit mobile number.');
      return;
    }

    const result = await dispatch(sendOtp(mobile));
    if (sendOtp.fulfilled.match(result)) {
      navigate('/verify-otp');
    }
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    dispatch(clearError());

    if (!username.trim() || !password) {
      setLocalError('Enter your username and password.');
      return;
    }

    const result = await dispatch(adminLogin({ username: username.trim(), password }));
    if (adminLogin.fulfilled.match(result)) {
      // Admins go to the admin panel; producer users to their producer pages.
      navigate(takeReturn() || (result.payload.user.isAdmin ? '/admin/users' : '/producer'));
    }
  };

  return (
    <AuthShell>
      <div className="oh-si-hero">
        <span className="oh-si-icon">
          <BrandLogo size={64} />
        </span>
        <h1 className="oh-si-title">Sign in to OriginHash</h1>
        <p className="oh-si-sub">
          {mode === 'user'
            ? 'Consumers, retailers and distributors: log in with your mobile number.'
            : 'Producer teams: log in with the username and password from OriginHash.'}
        </p>
      </div>

      <div className="oh-si-seg" data-active={mode} role="group" aria-label="Sign in as">
        <span className="oh-si-seg-thumb" aria-hidden="true" />
        <button
          type="button"
          className={`oh-si-seg-btn ${mode === 'user' ? 'active' : ''}`}
          aria-pressed={mode === 'user'}
          onClick={() => switchMode('user')}
        >
          Consumer &amp; trade
        </button>
        <button
          type="button"
          className={`oh-si-seg-btn ${mode === 'admin' ? 'active' : ''}`}
          aria-pressed={mode === 'admin'}
          onClick={() => switchMode('admin')}
        >
          Producer
        </button>
      </div>

      {mode === 'user' ? (
        <form className="oh-si-form" onSubmit={handleUserSubmit}>
          {/* Who signs in on this tab: the app works out which they are from the number. */}
          <ul className="oh-si-roles" aria-label="Who signs in here">
            {USER_ROLES.map(({ label, hint, Icon }) => (
              <li key={label} title={hint}>
                <Icon size={15} strokeWidth={1.9} aria-hidden="true" />
                <span>
                  <strong>{label}</strong>
                  <small>{hint}</small>
                </span>
              </li>
            ))}
          </ul>
          <div className="oh-si-group">
            <div className="oh-si-float with-prefix">
              <input
                id="mobile"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder=" "
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                aria-describedby="oh-si-mobile-hint"
              />
              <label htmlFor="mobile">Mobile number</label>
              <span className="oh-si-prefix" aria-hidden="true">
                +91
              </span>
            </div>
          </div>
          <p id="oh-si-mobile-hint" className="oh-si-hint">
            The 10-digit number registered with OriginHash. We&rsquo;ll text you a one-time code.
          </p>

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
                Sending OTP…
              </>
            ) : (
              <>
                Send OTP
                <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
              </>
            )}
          </button>
        </form>
      ) : (
        <form className="oh-si-form" onSubmit={handleAdminSubmit}>
          <div className="oh-si-group">
            <div className="oh-si-float">
              <input
                id="username"
                type="text"
                placeholder=" "
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
              <label htmlFor="username">Username</label>
            </div>
            <div className="oh-si-float">
              <input
                id="password"
                type="password"
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <label htmlFor="password">Password</label>
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
      )}

      {mode === 'user' ? (
        <p className="oh-si-note">
          New here? Enter your number to sign up as a consumer. Retailers can then choose <strong>Become a retailer</strong> from the menu;
          distributors are added by OriginHash.
        </p>
      ) : (
        <p className="oh-si-note">Producer accounts are created by OriginHash. Ask your producer admin for a team login.</p>
      )}
    </AuthShell>
  );
};

export default Login;
