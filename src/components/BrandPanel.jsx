import { MapPinned, ScanLine, ShieldCheck } from 'lucide-react';
import BrandLogo from './BrandLogo.jsx';
import '../styles/auth.css';

// The ink panel beside the sign-in forms: the mark, the promise, and the three things the app
// does. Phones show only the mark and wordmark (auth.css / screens.css).
const BrandPanel = () => (
  <div className="oh-brand-panel">
    <div className="oh-brand-grid" aria-hidden="true" />
    <div className="oh-brand-head">
      <BrandLogo size={40} />
      <span className="oh-brand-title oh-wordmark">
        Origin<span>Hash</span>
      </span>
    </div>

    <div className="oh-brand-body">
      <span className="oh-brand-eyebrow">Product trust intelligence</span>
      <p className="oh-brand-tagline">From molecule to market.</p>
      <ul className="oh-brand-points">
        <li>
          <ScanLine size={18} strokeWidth={1.75} aria-hidden="true" />
          <span>
            <strong>Scan to record</strong>
            Every hand-off along the supply chain, with where and when.
          </span>
        </li>
        <li>
          <ShieldCheck size={18} strokeWidth={1.75} aria-hidden="true" />
          <span>
            <strong>Verify to authenticate</strong>
            A once-only image check that proves the product is genuine.
          </span>
        </li>
        <li>
          <MapPinned size={18} strokeWidth={1.75} aria-hidden="true" />
          <span>
            <strong>Trace the journey</strong>
            Each sticker&rsquo;s path, from origin to the final buyer.
          </span>
        </li>
      </ul>
    </div>

    <div className="oh-brand-foot">
      <p className="oh-brand-motto">Verify &middot; Trust &middot; Transact</p>
      <p className="oh-brand-footnote">Securing India&rsquo;s supply chains &middot; v1.0</p>
    </div>
  </div>
);

export default BrandPanel;
