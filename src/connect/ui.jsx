import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, ImagePlus, Paperclip, X } from 'lucide-react';
import { Spinner } from '../components/Loader.jsx';
import { errorText, uploadFile } from './api';
import './connect.css';

// Shared building blocks of the supply-chain module's pages.

export const fmtDate = (value) => {
  if (!value) return '—';
  const d = new Date(String(value).length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
export const fmtDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return `${d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};
export const num = (n) => Number(n || 0).toLocaleString('en-IN');
export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const placeText = (location) =>
  location ? location.name || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : null;

const ROLE_LABEL = {
  admin: 'OriginHash',
  producer: 'Producer',
  distributor: 'Distributor',
  retailer: 'Retailer',
  consumer: 'Consumer',
  guest: 'Guest',
  staff: 'Staff',
};
export const roleLabel = (role) => ROLE_LABEL[role] || role;

export const Badge = ({ tone = 'neutral', children }) => <span className={`cx-badge ${tone}`}>{children}</span>;
export const RoleBadge = ({ role }) => <Badge tone={`role-${role}`}>{roleLabel(role)}</Badge>;
export const StatusBadge = ({ status }) =>
  status === 'sold' ? <Badge tone="success">Sold</Badge> : <Badge tone="neutral">In supply chain</Badge>;

export const PageHead = ({ eyebrow, title, subtitle, actions }) => (
  <header className="cx-page-head">
    <div>
      {eyebrow && <span className="oh-eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
    {actions && <div className="cx-page-actions">{actions}</div>}
  </header>
);

export const Card = ({ title, actions, children, className = '', flush = false }) => (
  <section className={`cx-card ${flush ? 'flush' : ''} ${className}`}>
    {(title || actions) && (
      <div className="cx-card-head">
        {title && <h2>{title}</h2>}
        {actions && <div className="cx-card-actions">{actions}</div>}
      </div>
    )}
    {children}
  </section>
);

export const Button = ({ variant = 'primary', busy = false, children, className = '', type = 'button', ...rest }) => (
  <button type={type} className={`cx-btn ${variant} ${className}`} disabled={busy || rest.disabled} {...rest}>
    {busy && <Spinner />}
    {children}
  </button>
);

export const ErrorNote = ({ children }) =>
  children ? (
    <div className="oh-error cx-error" role="alert">
      {children}
    </div>
  ) : null;

export const Notice = ({ tone = 'info', children }) => <div className={`cx-notice ${tone}`}>{children}</div>;

export const Empty = ({ title, children }) => (
  <div className="cx-empty">
    <strong>{title}</strong>
    {children && <p>{children}</p>}
  </div>
);

export const Loading = ({ label = 'Loading…' }) => (
  <div className="cx-loading" role="status">
    <Spinner /> {label}
  </div>
);

// A labelled form control. `children` is the input; `error` shows under it.
export const Field = ({ label, hint, error, required, children, wide = false }) => {
  const id = useId();
  const child = typeof children === 'function' ? children(id) : children;
  return (
    <div className={`cx-field ${wide ? 'wide' : ''} ${error ? 'has-error' : ''}`}>
      {label && (
        <label htmlFor={id}>
          {label}
          {required && <em> *</em>}
        </label>
      )}
      {child}
      {hint && !error && <span className="cx-hint">{hint}</span>}
      {error && <span className="cx-field-error">{error}</span>}
    </div>
  );
};

// Text input bound to form[name].
export const Input = ({ form, setForm, name, label, hint, error, required, wide, type = 'text', ...rest }) => (
  <Field label={label} hint={hint} error={error} required={required} wide={wide}>
    {(id) =>
      type === 'textarea' ? (
        <textarea id={id} value={form[name] ?? ''} onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))} rows={4} {...rest} />
      ) : (
        <input id={id} type={type} value={form[name] ?? ''} onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))} {...rest} />
      )
    }
  </Field>
);

export const Select = ({ form, setForm, name, label, options, error, required, wide, placeholder }) => (
  <Field label={label} error={error} required={required} wide={wide}>
    {(id) => (
      <select id={id} value={form[name] ?? ''} onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )}
  </Field>
);

export const Toggle = ({ checked, onChange, label, description, disabled }) => (
  <label className={`cx-toggle ${disabled ? 'disabled' : ''}`}>
    <span className="cx-toggle-text">
      <strong>{label}</strong>
      {description && <span>{description}</span>}
    </span>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
    <span className="cx-switch" aria-hidden="true" />
  </label>
);

export const Modal = ({ title, onClose, children, footer, wide = false }) => {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);
  return createPortal(
    <div className="cx-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`cx-modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="cx-modal-head">
          <h2>{title}</h2>
          <button type="button" className="cx-icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="cx-modal-body">{children}</div>
        {footer && <div className="cx-modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};

export const Tabs = ({ tabs, value, onChange }) => (
  <div className="cx-tabs" role="tablist">
    {tabs.map((t) => (
      <button key={t.value} type="button" role="tab" aria-selected={value === t.value} className={value === t.value ? 'active' : ''} onClick={() => onChange(t.value)}>
        {t.label}
        {t.count ? <span className="cx-tab-count">{t.count}</span> : null}
      </button>
    ))}
  </div>
);

export const Stat = ({ label, value, note }) => (
  <div className="cx-stat">
    <span>{label}</span>
    <strong>{value}</strong>
    {note && <em>{note}</em>}
  </div>
);

const isImage = (file) => /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(file?.ref || file?.url || '') || /\.(png|jpe?g|webp|gif|avif)$/i.test(file?.name || '');

// Uploads files as they're chosen. `value` is one file ({ref,url,name}) or, with `multiple`, a list.
export const FileUpload = ({ endpoint, folder, value, onChange, multiple = false, accept = 'image/*,application/pdf', max = 10, label = 'Upload file' }) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const files = multiple ? value || [] : value ? [value] : [];

  const pick = async (e) => {
    const chosen = [...(e.target.files || [])];
    e.target.value = '';
    if (!chosen.length) return;
    setBusy(true);
    setError('');
    try {
      const done = [];
      for (const file of chosen.slice(0, multiple ? max - files.length : 1)) done.push(await uploadFile(endpoint, file, folder));
      onChange(multiple ? [...files, ...done] : done[0]);
    } catch (err) {
      setError(errorText(err, "Couldn't upload the file."));
    } finally {
      setBusy(false);
    }
  };
  const remove = (i) => onChange(multiple ? files.filter((_, k) => k !== i) : null);

  return (
    <div className="cx-upload">
      {files.length > 0 && (
        <ul className="cx-upload-list">
          {files.map((f, i) => (
            <li key={f.ref || i}>
              {isImage(f) ? <img src={f.url} alt="" /> : <FileText size={22} aria-hidden="true" />}
              <a href={f.url} target="_blank" rel="noreferrer">
                {f.name || (isImage(f) ? 'Image' : 'Document')}
              </a>
              <button type="button" className="cx-icon-btn" onClick={() => remove(i)} aria-label="Remove file">
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {(multiple ? files.length < max : files.length === 0) && (
        <button type="button" className="cx-upload-btn" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Spinner /> : accept.startsWith('image/*') && !accept.includes('pdf') ? <ImagePlus size={18} /> : <Paperclip size={18} />}
          {busy ? 'Uploading…' : label}
        </button>
      )}
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} hidden onChange={pick} />
      {error && <span className="cx-field-error">{error}</span>}
    </div>
  );
};

// Collects field errors from an API error ({ field, message }).
export const useFormError = () => {
  const [error, setError] = useState({ message: '', field: null });
  const set = useCallback(
    (err, fallback) => setError(err ? { message: errorText(err, fallback), field: err.response?.data?.field || null } : { message: '', field: null }),
    []
  );
  return [error, set];
};

// Polls `fn` every `ms` while the page is visible.
export const usePoll = (fn, ms, deps = []) => {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') saved.current();
    }, ms);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
