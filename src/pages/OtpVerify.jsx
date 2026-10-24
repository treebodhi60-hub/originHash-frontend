import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { CircleAlert, ShieldCheck } from 'lucide-react';
import AuthShell from '../components/AuthShell.jsx';
import { Spinner } from '../components/Loader.jsx';
import { sendOtp, verifyOtp, clearError } from '../store/authSlice';
import '../styles/auth.css';
import { takeReturn } from '../utils/returnTo';

const OtpVerify = () => {
  const [otp, setOtp] = useState('');
  const [resendIn, setResendIn] = useState(24);
  const [resending, setResending] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // const { mobile, demoOtp, status, error, token, user } = useSelector((state) => state.auth);

  const { mobile, sessionId, status, error, token, user } = useSelector(
    (state) => state.auth,
  );

  useEffect(() => {
    if (!mobile) {
      navigate('/login', { replace: true });
    }
  }, [mobile, navigate]);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    if (token && user) {
      if (user.isAdmin) {
        navigate(takeReturn() || '/admin/users', { replace: true });
      } else if (!user.profileCompleted) {
        // The page they came from is still remembered; onboarding sends them back to it.
        navigate('/onboarding', { replace: true });
      } else {
        navigate(takeReturn() || '/home', { replace: true });
      }
    }
  }, [token, user, navigate]);

  // const handleVerify = async (e) => {
  //   e.preventDefault();
  //   dispatch(clearError());
  //   dispatch(verifyOtp({ mobile, otp }));
  // };

  const handleVerify = async (e) => {
    e.preventDefault();

    dispatch(clearError());

    if (!otp || otp.length < 4) {
      return;
    }

    dispatch(
      verifyOtp({
        mobile,
        otp,
        sessionId,
      }),
    );
  };

  // const handleResend = () => {
  //   dispatch(clearError());
  //   dispatch(sendOtp(mobile));
  //   setResendIn(24);
  //   setOtp('');
  // };

  const handleResend = async () => {
    dispatch(clearError());

    setResending(true);
    const result = await dispatch(sendOtp(mobile));
    setResending(false);

    if (sendOtp.fulfilled.match(result)) {
      setResendIn(30);
      setOtp("");
    }
  };

  return (
    <AuthShell>
      <div className="oh-si-hero">
        <span className="oh-si-icon glyph">
          <ShieldCheck size={30} strokeWidth={1.6} aria-hidden="true" />
        </span>
        <h1 className="oh-si-title">Check your phone</h1>
        <p className="oh-si-sub">
          Enter the code we sent to <strong>+91 {mobile}</strong>
        </p>
      </div>

      <form className="oh-si-form" onSubmit={handleVerify}>
        <label htmlFor="otp" className="oh-sr-only">
          Enter OTP
        </label>
        <input
          id="otp"
          className="oh-si-code"
          type="tel"
          inputMode="numeric"
          maxLength={6}
          placeholder="••••"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          aria-describedby="oh-si-otp-hint"
        />
        <p id="oh-si-otp-hint" className="oh-si-hint center">
          OTP sent to +91 {mobile} &middot; check your SMS
        </p>

        {error && (
          <p className="oh-si-error" role="alert">
            <CircleAlert size={15} strokeWidth={2} aria-hidden="true" />
            {error}
          </p>
        )}

        <button className="oh-si-button" type="submit" disabled={status === 'loading' || !otp}>
          {status === 'loading' && !resending ? (
            <>
              <Spinner />
              Verifying…
            </>
          ) : (
            'Verify and log in'
          )}
        </button>
      </form>

      <div className="oh-si-resend">
        {resendIn > 0 ? (
          <span>
            Resend in <b>{resendIn}s</b>
          </span>
        ) : (
          <button className="oh-si-link" type="button" onClick={handleResend} disabled={resending}>
            {resending ? (
              <>
                <Spinner />
                Sending OTP…
              </>
            ) : (
              'Resend OTP'
            )}
          </button>
        )}
      </div>
    </AuthShell>
  );
};

export default OtpVerify;
