// Where a set of bought stickers went: used, expired, still left (and cleared by a test reset).
// One bar, with a legend, shared by the admin report, the dashboard and a user's page.

export const USAGE_PARTS = [
  { key: 'used', label: 'Used' },
  { key: 'expired', label: 'Expired' },
  { key: 'left', label: 'Left' },
  { key: 'cleared', label: 'Cleared (test)' },
];

const fmt = (n) => n.toLocaleString('en-IN');

const StickerUsageBar = ({ figures, legend = true, label }) => {
  const parts = USAGE_PARTS.filter((p) => figures[p.key] > 0);
  const total = parts.reduce((sum, p) => sum + figures[p.key], 0);
  return (
    <div className="oh-usage">
      <div
        className="oh-usage-bar"
        role="img"
        aria-label={`${label ? `${label}: ` : ''}${USAGE_PARTS.map((p) => `${fmt(figures[p.key] || 0)} ${p.label.toLowerCase()}`).join(', ')}`}
      >
        {total ? (
          parts.map((p) => <span key={p.key} className={`part-${p.key}`} style={{ flexGrow: figures[p.key] }} title={`${p.label}: ${fmt(figures[p.key])}`} />)
        ) : (
          <span className="empty" />
        )}
      </div>
      {legend && (
        <ul className="oh-usage-legend">
          {USAGE_PARTS.filter((p) => p.key !== 'cleared' || figures.cleared > 0).map((p) => (
            <li key={p.key}>
              <span className={`dot part-${p.key}`} aria-hidden="true" />
              {p.label} <b>{fmt(figures[p.key] || 0)}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default StickerUsageBar;
