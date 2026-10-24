import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Camera, CircleAlert, Package, Sprout, Store, Truck } from 'lucide-react';
import AuthShell from '../components/AuthShell.jsx';
import BrandLogo from '../components/BrandLogo.jsx';
import { Spinner } from '../components/Loader.jsx';
import { updateProfile, skipOnboarding } from '../store/authSlice';
import '../styles/auth.css';
import { takeReturn } from '../utils/returnTo';

const USER_TYPES = [
  { value: 'farmer', label: 'Farmer', Icon: Sprout },
  { value: 'retailer', label: 'Retailer', Icon: Store },
  { value: 'distributor', label: 'Distributor', Icon: Truck },
  { value: 'supplier', label: 'Supplier', Icon: Package },
];

const Onboarding = () => {
  const [form, setForm] = useState({ name: '', email: '', userType: '', address: '' });
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Please enter your name, or tap Skip for now.');
      return;
    }

    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('email', form.email);
    fd.append('userType', form.userType);
    fd.append('address', form.address);
    if (photo) fd.append('photo', photo);

    setSubmitting(true);
    const result = await dispatch(updateProfile(fd));
    setSubmitting(false);
    if (updateProfile.fulfilled.match(result)) {
      navigate(takeReturn() || '/home', { replace: true });
    } else {
      setError(result.payload || 'Could not save your details.');
    }
  };

  const handleSkip = async () => {
    setSkipping(true);
    await dispatch(skipOnboarding());
    navigate(takeReturn() || '/home', { replace: true });
  };

  return (
    <AuthShell wide>
      <div className="oh-si-hero">
        <span className="oh-si-icon">
          <BrandLogo size={64} />
        </span>
        <h1 className="oh-si-title">Create your account</h1>
        <p className="oh-si-sub">Start verifying and tracking products.</p>
      </div>

      <form className="oh-si-form" onSubmit={handleSubmit}>
        <div className="oh-si-group">
          <div className="oh-si-float">
            <input
              id="name"
              type="text"
              placeholder=" "
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
            />
            <label htmlFor="name">Full name</label>
          </div>
          <div className="oh-si-float with-prefix locked">
            <input id="onboarding-mobile" value={user?.mobile || ''} placeholder=" " disabled />
            <label htmlFor="onboarding-mobile">Mobile number</label>
            <span className="oh-si-prefix" aria-hidden="true">
              +91
            </span>
          </div>
          <div className="oh-si-float">
            <input
              id="email"
              type="email"
              placeholder=" "
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
            />
            <label htmlFor="email">Email</label>
          </div>
          <div className="oh-si-float">
            <input
              id="address"
              type="text"
              placeholder=" "
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
            />
            <label htmlFor="address">Address (village / town, district)</label>
          </div>
        </div>

        <fieldset className="oh-si-fieldset">
          <legend>I am a</legend>
          <div className="oh-si-choices">
            {USER_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                className={`oh-si-choice ${form.userType === t.value ? 'active' : ''}`}
                aria-pressed={form.userType === t.value}
                onClick={() => update('userType', t.value)}
              >
                <t.Icon size={20} strokeWidth={1.6} aria-hidden="true" />
                {t.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="oh-si-photo" htmlFor="photo">
          <span className="oh-si-photo-icon" aria-hidden="true">
            <Camera size={18} strokeWidth={1.75} />
          </span>
          <span className="oh-si-photo-text">
            <strong>{photo ? photo.name : 'Add a photo'}</strong>
            <small>{photo ? 'Tap to choose a different photo' : 'Optional · shown on your profile'}</small>
          </span>
          <input id="photo" type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0])} />
        </label>

        {error && (
          <p className="oh-si-error" role="alert">
            <CircleAlert size={15} strokeWidth={2} aria-hidden="true" />
            {error}
          </p>
        )}

        <button className="oh-si-button" type="submit" disabled={submitting || skipping}>
          {submitting ? (
            <>
              <Spinner />
              Saving…
            </>
          ) : (
            <>
              Continue
              <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <div className="oh-si-resend">
        <button className="oh-si-link" type="button" onClick={handleSkip} disabled={skipping || submitting}>
          {skipping ? (
            <>
              <Spinner />
              Skipping…
            </>
          ) : (
            'Skip for now'
          )}
        </button>
      </div>
    </AuthShell>
  );
};

export default Onboarding;
