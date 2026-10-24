import BrandLogo from './BrandLogo.jsx';
import '../styles/light-qr.css';

// The phone-sized frame of the public light QR pages (landing, add update, history), on the
// app's cream background. `title` swaps the brand header for a back arrow and a title.
export const LightShell = ({ title, subtitle, onBack, children }) => (
  <div className="olq-page">
    <main className="olq-card">
      {title ? (
        <header className="olq-bar">
          <button type="button" className="olq-back" onClick={onBack} aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
          </button>
          <div className="olq-bar-title">
            <h1>{title}</h1>
            {subtitle && <span>{subtitle}</span>}
          </div>
          <span className="olq-back-space" />
        </header>
      ) : (
        <header className="olq-brand">
          <span className="olq-brand-logo">
            <BrandLogo size={22} />
          </span>
          <div>
            <strong className="oh-wordmark on-paper">
              Origin<span>Hash</span>
            </strong>
            <span>Verifying authenticity</span>
          </div>
        </header>
      )}
      {children}
    </main>
  </div>
);

const ProductGlyph = () => (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 7.5 12 3.5l8 4v9l-8 4-8-4v-9Z" />
    <path d="m4 7.5 8 4 8-4M12 11.5v9" />
  </svg>
);

// The product as recorded for the batch, with the code's QR ID.
export const LightProduct = ({ info, compact = false, showCode = false }) => (
  <section className={`olq-product ${compact ? 'compact' : ''}`}>
    <span className="olq-product-tile">
      <ProductGlyph />
    </span>
    <div className="olq-product-text">
      <h2>{info.productName}</h2>
      <dl>
        <div>
          <dt>Brand</dt>
          <dd>{info.brandName}</dd>
        </div>
        <div>
          <dt>Batch</dt>
          <dd>{info.batchNo}</dd>
        </div>
        {showCode && (
          <div>
            <dt>QR ID</dt>
            <dd>{info.code}</dd>
          </div>
        )}
        <div>
          <dt>Pack size</dt>
          <dd>{info.packSize}</dd>
        </div>
      </dl>
    </div>
  </section>
);

const pad = (n) => String(n).padStart(2, '0');
// 08/10/26, 11:24:05
export const stamp = (iso) => {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export const PinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10" r="2.4" />
  </svg>
);

export const placeText = (location) =>
  location ? location.name || `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : null;
