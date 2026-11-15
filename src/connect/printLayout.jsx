import { useId } from 'react';
import { GAP, MAX_PAIR_LABELS_PER_PAGE, PAGE_SIZE_NAMES, pairGridFor, pairSlot, stickerMm } from '../utils/stickerLayout';
import '../styles/print-layout.css';

// A QR batch's print layout (set by the OriginHash superadmin; producers download with it): paper,
// QR codes per page (even: each unit is a retailer + consumer pair) and the pair orientation.

export const PRINT_DEFAULTS = { pageSize: 'A4', perPage: 40, orientation: 'horizontal' };
export const ORIENTATIONS = [
  { value: 'horizontal', label: 'Horizontal', hint: 'Retailer QR left, consumer QR right' },
  { value: 'vertical', label: 'Vertical', hint: 'Consumer QR on top, retailer QR below' },
];

export const printLayoutText = (layout = PRINT_DEFAULTS) => {
  const o = ORIENTATIONS.find((x) => x.value === layout.orientation) || ORIENTATIONS[0];
  return `${layout.pageSize} · ${layout.perPage} QR codes per page · ${o.label} (${o.hint.charAt(0).toLowerCase()}${o.hint.slice(1)})`;
};

const THUMB = 22;
const along = (n, min, max) => {
  const t = max > min ? (n - min) / (max - min) : 0;
  return `calc(${t * 100}% + ${(0.5 - t) * THUMB}px)`;
};

// The most QR codes (even) a page holds at full size.
const fullSizeCount = (pageSize, orientation) => {
  let n = 2;
  while (n < MAX_PAIR_LABELS_PER_PAGE && pairGridFor(pageSize, n + 2, orientation).scale >= 0.999) n += 2;
  return n;
};

// One QR label in miniature: R (retailer) has a dark header, C (consumer) a light one.
const PairLabel = ({ x, y, sw, sh, kind }) => {
  const q = sw * 0.62;
  return (
    <g className="label" transform={`translate(${x} ${y})`}>
      <rect className="card" width={sw} height={sh} rx={Math.max(2, sw * 0.04)} />
      <rect className={kind === 'R' ? 'band' : 'photo'} width={sw} height={sh * 0.16} rx={Math.max(2, sw * 0.04)} />
      <rect className="qr" x={(sw - q) / 2} y={sh * 0.24} width={q} height={q} rx={q * 0.05} />
      <rect className="bar" x={sw * 0.06} y={sh * 0.86} width={sw * 0.88} height={sh * 0.09} />
      <text x={sw / 2} y={sh * 0.125} textAnchor="middle" fontSize={sh * 0.11} fontWeight="700" fill={kind === 'R' ? '#fff' : 'currentColor'}>
        {kind}
      </text>
    </g>
  );
};

// The first printed page in miniature: retailer labels dark-headed with "R", consumer labels
// light-headed with "C", each pair outlined.
const PairPreview = ({ grid, pageSize }) => {
  const { width, height, cols, perPage, left, top, sw, sh, orientation } = grid;
  const at = (slot) => ({ x: left + (slot % cols) * (sw + GAP), y: top + Math.floor(slot / cols) * (sh + GAP) });
  const pairs = Array.from({ length: perPage / 2 }, (_, p) => {
    const r = at(pairSlot(grid, p * 2));
    const c = at(pairSlot(grid, p * 2 + 1));
    return { r, c };
  });
  return (
    <svg className="oh-print-page cx-pair-preview" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Preview of a ${pageSize} page: ${perPage / 2} pairs, ${orientation}`}>
      <rect className="paper" x="0" y="0" width={width} height={height} rx="10" />
      <rect className="page-head" x="22" y="12" width={Math.min(width * 0.42, 220)} height="7" rx="3.5" />
      {pairs.map(({ r, c }, i) => {
        const x0 = Math.min(r.x, c.x) - GAP / 2;
        const y0 = Math.min(r.y, c.y) - GAP / 2;
        const w = Math.abs(r.x - c.x) + sw + GAP;
        const h = Math.abs(r.y - c.y) + sh + GAP;
        return (
          <g key={`${pageSize}-${orientation}-${perPage}-${i}`}>
            <rect className="pair" x={x0} y={y0} width={w} height={h} rx={GAP / 2} />
            <PairLabel {...r} sw={sw} sh={sh} kind="R" />
            <PairLabel {...c} sw={sw} sh={sh} kind="C" />
          </g>
        );
      })}
    </svg>
  );
};

// `value` { pageSize, perPage, orientation }; `units` the batch size (for the page count).
export const PairPrintLayout = ({ value, onChange, units = 0 }) => {
  const id = useId();
  const { pageSize, orientation } = value;
  const min = 2;
  const max = MAX_PAIR_LABELS_PER_PAGE;
  const perPage = Math.min(max, Math.max(min, Math.round((value.perPage || PRINT_DEFAULTS.perPage) / 2) * 2));
  const grid = pairGridFor(pageSize, perPage, orientation);
  const full = fullSizeCount(pageSize, orientation);
  const size = stickerMm('bulk', grid.scale);
  const shrunk = grid.scale < 0.999;
  const pages = Math.max(1, Math.ceil((units * 2) / perPage));
  const set = (patch) => onChange({ ...value, perPage, ...patch });
  const setCount = (n) => set({ perPage: Math.min(max, Math.max(min, n)) });

  return (
    <div className="oh-print" style={{ '--fill': along(perPage, min, max), '--full': along(full + 1, min, max) }}>
      <div className="oh-print-preview">
        <PairPreview grid={grid} pageSize={pageSize} />
        <span className="oh-print-preview-caption">
          {grid.cols} × {grid.rows}
          {grid.upright ? '' : ' · sideways'}
        </span>
      </div>

      <div className="oh-print-controls">
        <div className="oh-print-row">
          <span className="oh-print-label" id={`${id}-paper`}>
            Paper
          </span>
          <div className="oh-print-segment" role="radiogroup" aria-labelledby={`${id}-paper`}>
            {PAGE_SIZE_NAMES.map((name) => (
              <button key={name} type="button" role="radio" aria-checked={pageSize === name} className={pageSize === name ? 'active' : ''} onClick={() => set({ pageSize: name })}>
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="oh-print-row">
          <span className="oh-print-label" id={`${id}-orient`}>
            Orientation
          </span>
          <div className="oh-print-segment" role="radiogroup" aria-labelledby={`${id}-orient`}>
            {ORIENTATIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={orientation === o.value}
                className={orientation === o.value ? 'active' : ''}
                title={o.hint}
                onClick={() => set({ orientation: o.value })}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <p className="cx-small cx-muted" style={{ margin: '-4px 0 0', textAlign: 'right' }}>
          {ORIENTATIONS.find((o) => o.value === orientation)?.hint}
        </p>

        <div className="oh-print-row">
          <label className="oh-print-label" htmlFor={`${id}-count`}>
            QR codes per page
          </label>
          <span className="oh-print-value" aria-hidden="true">
            <b key={perPage}>{perPage}</b>
            {perPage !== PRINT_DEFAULTS.perPage && (
              <button type="button" className="oh-print-reset" onClick={() => setCount(PRINT_DEFAULTS.perPage)}>
                Reset to {PRINT_DEFAULTS.perPage}
              </button>
            )}
          </span>
        </div>

        <div className="oh-print-slider">
          <button type="button" className="oh-print-step" onClick={() => setCount(perPage - 2)} disabled={perPage <= min} aria-label="Fewer QR codes per page">
            −
          </button>
          <div className="oh-print-track">
            <input
              id={`${id}-count`}
              type="range"
              min={min}
              max={max}
              step={2}
              value={perPage}
              onChange={(e) => setCount(Number(e.target.value))}
              aria-valuetext={`${perPage} QR codes (${perPage / 2} pairs) per page, ${shrunk ? 'shrunk to fit' : 'full size'}`}
            />
            <div className="oh-print-scale" aria-hidden="true">
              <span style={{ left: along(min, min, max) }}>{min}</span>
              {full < max && (
                <span className="full" style={{ left: along(full, min, max) }}>
                  {full}
                  <small>full size</small>
                </span>
              )}
              <span style={{ left: along(max, min, max) }}>{max}</span>
            </div>
          </div>
          <button type="button" className="oh-print-step" onClick={() => setCount(perPage + 2)} disabled={perPage >= max} aria-label="More QR codes per page">
            +
          </button>
        </div>

        <p className={`oh-print-summary ${shrunk ? 'shrunk' : ''}`} aria-live="polite">
          <span className="oh-print-chip">{shrunk ? `Shrunk to ${Math.round(grid.scale * 100)}%` : 'Full size'}</span>
          {perPage / 2} pairs per page · each QR label {size.w} × {size.h} mm · this batch prints on {pages} {pages === 1 ? 'page' : 'pages'}
        </p>
      </div>
    </div>
  );
};
