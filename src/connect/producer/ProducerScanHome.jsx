import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useSelector } from 'react-redux';
import connectApi from '../api';
import { byText, eventOf, whatHappened } from '../historyEvents.jsx';
import BrandLogo from '../../components/BrandLogo.jsx';
import { MenuButton } from '../../components/MobileMenu.jsx';
import { LoadingState } from '../../components/Loader.jsx';
import { ChevronRightIcon, QrIcon, ShieldIcon } from '../../components/ScanIcons.jsx';
import { formatScanTime } from '../../utils/format';
import { scanRoutes } from '../../utils/scanRoutes';
import '../../styles/app-shell.css';
import '../../styles/home.css';

// Home / Scan for producer users: scan one of the company's retailer or consumer QR codes, the
// supply-chain numbers at a glance, and the latest activity on the company's QR codes.

const StatTile = ({ label, value, tone = 'plain' }) => (
  <div className={`oh-home-stat ${tone}`}>
    <div className="oh-home-stat-label">{label}</div>
    <div className="oh-home-stat-value">{value == null ? '—' : Number(value).toLocaleString('en-IN')}</div>
  </div>
);

const ProducerScanHome = () => {
  const { user } = useSelector((state) => state.auth);
  const paths = scanRoutes(user);
  const { openMenu } = useOutletContext() || {};
  const [overview, setOverview] = useState(null);
  const [recent, setRecent] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    Promise.all([connectApi.get('/producer/overview'), connectApi.get('/producer/history', { params: { pageSize: 10 } })])
      .then(([o, h]) => {
        if (cancelled) return;
        setOverview(o.data);
        setRecent(h.data.history.slice(0, 6));
        setStatus('succeeded');
      })
      .catch(() => {
        if (!cancelled) setStatus('failed');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="oh-home">
      <section className="oh-home-hero">
        <div className="oh-home-hero-top">
          <div className="oh-home-hero-lead">
            {openMenu && <MenuButton onClick={openMenu} />}
            <div>
              <div className="oh-home-hero-greeting">Welcome back</div>
              <h1 className="oh-home-hero-name">{user?.name || 'there'}</h1>
            </div>
          </div>
          <span className="oh-home-hero-logo" title="OriginHash">
            <BrandLogo size={22} />
          </span>
        </div>
        <p className="oh-home-hero-sub">
          Scan a retailer or consumer QR on one of your products to see where it is in the supply chain, who handled it, and to add warranty info.
        </p>
        <Link to={paths.camera} className="oh-home-verify-btn">
          <ShieldIcon size={18} />
          Scan a product QR
        </Link>
      </section>

      <section className="oh-home-stats" aria-label="Supply chain summary">
        <StatTile label="Units allotted" value={overview?.units.total} />
        <StatTile label="Sold" value={overview?.units.sold} tone="success" />
        <StatTile label="Trade scans" value={overview?.tradeScans} />
        <StatTile label="Consumer scans" value={overview?.consumerScans} />
      </section>

      <Link to={paths.camera} className="oh-home-scan-card">
        <span className="oh-home-scan-icon">
          <QrIcon size={22} />
        </span>
        <span className="oh-home-scan-text">
          <span className="oh-home-scan-title">Scan QR code</span>
          <span className="oh-home-scan-sub">Retailer QR or consumer QR on your product</span>
        </span>
        <span className="oh-home-scan-chevron">
          <ChevronRightIcon size={18} />
        </span>
        <span className="oh-home-scan-cta">
          Open scanner
          <ChevronRightIcon size={16} />
        </span>
      </Link>

      <section className="oh-home-recent">
        <div className="oh-home-recent-head">
          <h2 className="oh-home-recent-title">Recent supply chain activity</h2>
          <Link to={paths.history} className="oh-home-recent-all">
            View all
          </Link>
        </div>

        {status === 'loading' && <LoadingState className="oh-home-recent-empty" label="Loading activity…" />}
        {status === 'failed' && <div className="oh-home-recent-empty">Couldn&apos;t load the activity right now. Please try again later.</div>}
        {status === 'succeeded' && recent.length === 0 && (
          <div className="oh-home-recent-empty">Nothing yet. Scans of your QR codes by distributors, retailers and consumers, and every sale, show up here.</div>
        )}

        {recent.length > 0 && (
          <ul className="oh-home-recent-list cx-home-recent">
            {recent.map((h) => {
              const e = eventOf(h, 16);
              return (
                <li key={h.id}>
                  <Link to={`/producer/units/${h.unitId}`} className="oh-home-recent-row">
                    <span className={`oh-home-recent-icon ${e.homeTone}`}>{e.icon}</span>
                    <div className="oh-home-recent-text">
                      <div className="oh-home-recent-name">
                        {h.product?.name || 'No product'} · {h.serial}
                      </div>
                      <div className="oh-home-recent-meta">
                        {formatScanTime(h.at)} · {whatHappened(h)} · by {byText(h)}
                        {h.location?.name ? ` · ${h.location.name}` : ''}
                      </div>
                    </div>
                    <span className={`oh-home-recent-status ${e.homeTone}`}>{e.short}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

export default ProducerScanHome;
