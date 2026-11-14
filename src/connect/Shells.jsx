import BrandLogo from '../components/BrandLogo.jsx';
import './connect.css';

// The phone-sized frame of the public retailer / consumer QR pages (like the light QR pages).
// `title` + `onBack` swap the brand header for a back bar.
export const PhoneShell = ({ title, subtitle, onBack, children, footer }) => (
  <div className="cx-phone-page">
    <main className="cx-phone">
      {title ? (
        <header className="cx-phone-bar">
          <button type="button" className="cx-icon-btn" onClick={onBack} aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
          </button>
          <div>
            <h1>{title}</h1>
            {subtitle && <span>{subtitle}</span>}
          </div>
          <span className="cx-phone-bar-space" />
        </header>
      ) : (
        <header className="cx-phone-brand">
          <BrandLogo size={34} />
          <strong className="oh-wordmark on-paper">
            Origin<span>Hash</span>
          </strong>
        </header>
      )}
      <div className="cx-phone-body">{children}</div>
      {footer}
    </main>
  </div>
);
