import { useMemo } from 'react';
import '../styles/bulk-qr.css';

// A QR-like pattern for the preview (the real QR is made with the PDF): the three finder squares,
// a fixed scatter of modules and a clear centre for the logo.
const QR_N = 25;
const usePreviewModules = () =>
  useMemo(() => {
    let seed = 20261011;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const finder = (r, c) =>
      [
        [0, 0],
        [0, QR_N - 7],
        [QR_N - 7, 0],
      ].find(([fr, fc]) => r >= fr - 1 && r <= fr + 7 && c >= fc - 1 && c <= fc + 7);
    const centre = (r, c) => Math.abs(r - 12) <= 3 && Math.abs(c - 12) <= 3;
    const cells = [];
    for (let r = 0; r < QR_N; r += 1) {
      for (let c = 0; c < QR_N; c += 1) {
        if (!finder(r, c) && !centre(r, c) && rand() < 0.48) cells.push(`M${c} ${r}h1v1h-1z`);
      }
    }
    return cells.join('');
  }, []);

const Finder = ({ x, y }) => (
  <>
    <rect x={x} y={y} width="7" height="7" rx="1" className="ink" />
    <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
    <rect x={x + 2} y={y + 2} width="3" height="3" rx="0.5" className="ink" />
  </>
);

// The label as it will print, filled in live from the form.
const BulkLabelPreview = ({ values, code, bar }) => {
  const modules = usePreviewModules();
  const digits = Math.max(4, String(values.quantity || 0).length);
  return (
    <div className="oh-bulk-label" aria-label="Label preview">
      <div className="oh-bulk-label-top">
        <b>{values.brandName || 'Brand name'}</b> · Batch {values.batchNo || '—'}
      </div>
      <div className="oh-bulk-label-card">
        <svg viewBox={`0 0 ${QR_N} ${QR_N}`} className="oh-bulk-label-qr" aria-hidden="true">
          <path d={modules} className="ink" />
          <Finder x={0} y={0} />
          <Finder x={QR_N - 7} y={0} />
          <Finder x={0} y={QR_N - 7} />
          <circle cx="12.5" cy="12.5" r="3.4" fill="#fff" />
          <circle cx="12.5" cy="12.5" r="2.8" className="ink" />
          <circle cx="12.5" cy="12.5" r="1.1" fill="var(--oh-print-accent)" />
        </svg>
        <span className="oh-bulk-label-brand">OriginHash</span>
      </div>
      <div className="oh-bulk-label-bar">
        {bar || `${code || 'OHB-XXXXXXXX'} · No. ${'1'.padStart(digits, '0')}`}
      </div>
    </div>
  );
};

export default BulkLabelPreview;
