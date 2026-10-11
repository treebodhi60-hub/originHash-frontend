import { useState } from 'react';
import { PinIcon, placeText, stamp } from './LightShell.jsx';
import '../styles/light-qr.css';

// A light QR code's journey, oldest first: created, every scan (who, where, when) and every update
// (photo and comment), with a Details tab. Used by the history page and the batch page's modal.

const Svg = ({ children }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const ICONS = {
  CREATED: (
    <Svg>
      <path d="M4 7.5 12 3.5l8 4v9l-8 4-8-4v-9Z" />
      <path d="m4 7.5 8 4 8-4M12 11.5v9" />
    </Svg>
  ),
  SCAN: (
    <Svg>
      <path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3M4 12h16" />
    </Svg>
  ),
  UPDATE: (
    <Svg>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.7" />
      <path d="m4.5 17.5 4.5-4.5 3 3 2.5-2.5 5 4.5" />
    </Svg>
  ),
};
const TITLES = { CREATED: 'QR code created', SCAN: 'Scanned', UPDATE: 'Photo & comment added' };

const who = (user) => (user ? `${user.name || 'Unnamed user'} (${user.code})` : 'Guest (not signed in)');

const LightTimeline = ({ data }) => {
  const [tab, setTab] = useState('timeline');
  return (
    <>
      <div className="olq-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'timeline'} className={tab === 'timeline' ? 'active' : ''} onClick={() => setTab('timeline')}>
          Timeline ({data.events.length})
        </button>
        <button type="button" role="tab" aria-selected={tab === 'details'} className={tab === 'details' ? 'active' : ''} onClick={() => setTab('details')}>
          Details
        </button>
      </div>

      {tab === 'timeline' ? (
        <ol className="olq-timeline">
          {data.events.map((e) => (
            <li key={e.id || e.type} className={`type-${e.type.toLowerCase()}`}>
              <span className="olq-dot">{ICONS[e.type]}</span>
              <div className="olq-event">
                <strong>{TITLES[e.type]}</strong>
                <time dateTime={e.at}>{stamp(e.at)}</time>
                {e.type === 'CREATED' && (
                  <>
                    <span className="olq-meta">System</span>
                    <span className="olq-meta">
                      {data.code} created for batch {e.batchNo}
                    </span>
                  </>
                )}
                {e.type !== 'CREATED' && (
                  <span className="olq-meta">
                    <PinIcon />
                    {placeText(e.location) || 'Location not shared'}
                  </span>
                )}
                {e.type !== 'CREATED' && <span className="olq-meta">{e.type === 'SCAN' ? 'Scanned by' : 'Added by'}: {who(e.user)}</span>}
                {e.type === 'UPDATE' && (
                  <>
                    <a href={e.photoUrl} target="_blank" rel="noopener noreferrer" className="olq-event-photo">
                      <img src={e.photoUrl} alt={`Photo added ${stamp(e.at)}`} loading="lazy" />
                    </a>
                    <p className="olq-comment">{e.comment}</p>
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <dl className="olq-details">
          {[
            ['QR ID', data.code],
            ['Brand', data.brandName],
            ['Product', data.productName],
            ['Batch', data.batchNo],
            ['Pack size', data.packSize],
            ['Created', stamp(data.generatedAt)],
            ['Scans', data.scanCount],
            ['Updates', data.updateCount],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );
};

export default LightTimeline;
