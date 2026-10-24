import { Lock } from 'lucide-react';
import BrandLogo from './BrandLogo.jsx';
import QrStage, { QrGlyph } from './QrStage.jsx';
import '../styles/auth-shell.css';

// The frame of the sign-in screens (Login, OTP, Onboarding). Laptops: the QR passport stage
// (QrStage) beside a calm form panel. Phones and tablets: a compact scanning QR above the form.
// Presentation only: each page keeps its own form, state and handlers.
const AuthShell = ({ children, wide = false }) => (
  <div className="oh-si split">
    <aside className="oh-si-stage">
      <QrStage />
    </aside>

    <div className="oh-si-panel">
      <div className="oh-si-light" aria-hidden="true" />

      <header className="oh-si-top">
        <span className="oh-si-brand">
          <BrandLogo size={28} />
          <span className="oh-wordmark">
            Origin<span>Hash</span>
          </span>
        </span>
        <span className="oh-si-secure">
          <Lock size={13} strokeWidth={2} aria-hidden="true" />
          Secure sign-in
        </span>
      </header>

      {/* Phones and tablets: the idea in one line — a QR being read, and what it opens. */}
      <div className="oh-si-mini" aria-hidden="true">
        <span className="oh-si-mini-qr">
          <QrGlyph id="mini" />
        </span>
        <span className="oh-si-mini-text">
          <strong>From origin to assurance.</strong>
          <small>Origin · Journey · Authentic</small>
        </span>
      </div>

      <main className={`oh-si-main ${wide ? 'wide' : ''}`}>{children}</main>

      <footer className="oh-si-foot">
        <p className="oh-si-legal">OriginHash &middot; Securing India&rsquo;s supply chains &middot; v1.0</p>
      </footer>
    </div>
  </div>
);

export default AuthShell;
