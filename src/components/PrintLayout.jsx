import { useId } from 'react';
import {
  DEFAULT_PER_PAGE,
  GAP,
  PAGE_SIZE_NAMES,
  fullSizePerPage,
  gridFor,
  maxPerPage,
  stickerMm,
} from '../utils/stickerLayout';
import '../styles/print-layout.css';

const THUMB = 22; // px, the slider thumb; marks under the track are offset to line up with its centre

// Where value n sits along a 1…max range, as a CSS length that matches the native thumb's centre.
const along = (n, max) => {
  const t = max > 1 ? (n - 1) / (max - 1) : 0;
  return `calc(${t * 100}% + ${(0.5 - t) * THUMB}px)`;
};

// A bulk (identical-QR) label in miniature, in the proportions of the printed one (150 × 180):
// brand and batch line, the QR card with its logo, and the orange number bar.
const BulkCell = ({ sw, sh }) => {
  const q = sw * 0.65;
  return (
    <>
      <rect className="band" x={sw * 0.053} y={sh * 0.06} width={sw * 0.7} height={sh * 0.04} rx={sh * 0.02} />
      <rect className="card" x={sw * 0.053} y={sh * 0.155} width={sw * 0.894} height={sh * 0.69} rx={sw * 0.04} />
      <rect className="qr" x={(sw - q) / 2} y={sh * 0.19} width={q} height={q} rx={q * 0.04} />
      <circle className="logo" cx={sw / 2} cy={sh * 0.19 + q / 2} r={q * 0.13} />
      <rect className="bar" x={sw * 0.053} y={sh * 0.867} width={sw * 0.894} height={sh * 0.1} />
    </>
  );
};

// A small picture of the first printed page: the paper (turned sideways when the PDF is), the
// label grid with each label's dark header and its photo + QR squares, and the dashed cut lines.
const PagePreview = ({ grid, splitType, pageSize }) => {
  const { width, height, cols, rows, perPage, left, top, sw, sh } = grid;
  const tall = splitType === 'horizontal-50-50';
  const bulk = splitType === 'bulk';
  const cells = Array.from({ length: perPage }, (_, i) => ({
    x: left + (i % cols) * (sw + GAP),
    y: top + Math.floor(i / cols) * (sh + GAP),
  }));
  const usedCols = Math.min(perPage, cols);
  const xs = Array.from({ length: usedCols + 1 }, (_, k) => left - GAP / 2 + k * (sw + GAP));
  const ys = Array.from({ length: rows + 1 }, (_, k) => top - GAP / 2 + k * (sh + GAP));
  const band = sh * (tall ? 0.15 : 0.21);
  // The photo and QR squares, relative to a label (side by side, or stacked on a tall label).
  const tile = tall ? Math.min(sw * 0.62, (sh - band) * 0.38) : Math.min(sw * 0.3, (sh - band) * 0.62);
  const squares = tall
    ? [
        [(sw - tile) / 2, band + (sh - band) * 0.12],
        [(sw - tile) / 2, band + (sh - band) * 0.12 + tile + sh * 0.03],
      ]
    : [
        [sw * 0.25 - tile / 2 + sw * 0.03, band + (sh - band - tile) / 2 + sh * 0.04],
        [sw * 0.75 - tile / 2 - sw * 0.03, band + (sh - band - tile) / 2 + sh * 0.04],
      ];

  return (
    <svg className="oh-print-page" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Preview of a ${pageSize} page with ${perPage} labels, ${cols} across and ${rows} down`}>
      <rect className="paper" x="0" y="0" width={width} height={height} rx="10" />
      <rect className="page-head" x="22" y="12" width={Math.min(width * 0.42, 220)} height="7" rx="3.5" />
      {cells.map(({ x, y }, i) => (
        // Keyed by the layout too, so the labels fade in afresh whenever it changes.
        <g key={`${pageSize}-${splitType}-${perPage}-${i}`} className="label" transform={`translate(${x} ${y})`} style={{ animationDelay: `${Math.min(i, 40) * 12}ms` }}>
          {bulk ? (
            <BulkCell sw={sw} sh={sh} />
          ) : (
            <>
              <rect className="card" width={sw} height={sh} rx={Math.max(2, sw * 0.03)} />
              <rect className="band" width={sw} height={band} />
              {squares.map(([sx, sy], k) => (
                <rect key={k} className={k ? 'qr' : 'photo'} x={sx} y={sy} width={tile} height={tile} rx={tile * 0.06} />
              ))}
            </>
          )}
        </g>
      ))}
      <g className="cuts">
        {xs.map((x) => (
          <line key={`x${x}`} x1={x} x2={x} y1={ys[0] - 12} y2={ys[rows] + 12} />
        ))}
        {ys.map((y) => (
          <line key={`y${y}`} x1={xs[0] - 12} x2={xs[usedCols] + 12} y1={y} y2={y} />
        ))}
      </g>
    </svg>
  );
};

// Paper size and how many labels go on each page of the PDF. The slider runs from 1 to the most the
// paper takes before labels get too small to scan; past the full-size mark, labels shrink evenly.
const PrintLayout = ({ pageSize, splitType, labelsPerPage, count, onPageSize, onLabelsPerPage }) => {
  const id = useId();
  const max = maxPerPage(pageSize, splitType);
  const fullMax = fullSizePerPage(pageSize, splitType);
  const value = Math.min(Math.max(1, labelsPerPage), max);
  const grid = gridFor(pageSize, splitType, value);
  const size = stickerMm(splitType, grid.scale);
  const shrunk = grid.scale < 0.999;
  const pages = Math.max(1, Math.ceil((Number(count) || 0) / value));
  const set = (n) => onLabelsPerPage(Math.min(max, Math.max(1, n)));

  return (
    <div className="oh-print" style={{ '--fill': along(value, max), '--full': along(fullMax + 0.5, max) }}>
      <div className="oh-print-preview">
        <PagePreview grid={grid} splitType={splitType} pageSize={pageSize} />
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
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={pageSize === name}
                className={pageSize === name ? 'active' : ''}
                onClick={() => onPageSize(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="oh-print-row">
          <label className="oh-print-label" htmlFor={`${id}-labels`}>
            Labels per page
          </label>
          <span className="oh-print-value" aria-hidden="true">
            <b key={value}>{value}</b>
            {value !== DEFAULT_PER_PAGE && DEFAULT_PER_PAGE <= max && (
              <button type="button" className="oh-print-reset" onClick={() => set(DEFAULT_PER_PAGE)}>
                Reset to {DEFAULT_PER_PAGE}
              </button>
            )}
          </span>
        </div>

        <div className="oh-print-slider">
          <button type="button" className="oh-print-step" onClick={() => set(value - 1)} disabled={value <= 1} aria-label="Fewer labels per page">
            −
          </button>
          <div className="oh-print-track">
            <input
              id={`${id}-labels`}
              type="range"
              min={1}
              max={max}
              step={1}
              value={value}
              onChange={(e) => set(Number(e.target.value))}
              aria-valuetext={`${value} labels per page, ${grid.cols} across by ${grid.rows} down, ${shrunk ? 'shrunk to fit' : 'full size'}`}
            />
            <div className="oh-print-scale" aria-hidden="true">
              <span style={{ left: along(1, max) }}>1</span>
              {fullMax < max && (
                <span className="full" style={{ left: along(fullMax, max) }}>
                  {fullMax}
                  <small>full size</small>
                </span>
              )}
              <span style={{ left: along(max, max) }}>{max}</span>
            </div>
          </div>
          <button type="button" className="oh-print-step" onClick={() => set(value + 1)} disabled={value >= max} aria-label="More labels per page">
            +
          </button>
        </div>

        <p className={`oh-print-summary ${shrunk ? 'shrunk' : ''}`} aria-live="polite">
          <span className="oh-print-chip">{shrunk ? `Shrunk to ${Math.round(grid.scale * 100)}%` : 'Full size'}</span>
          Each label {size.w} × {size.h} mm · this batch prints on {pages} {pages === 1 ? 'page' : 'pages'}
        </p>
      </div>
    </div>
  );
};

export default PrintLayout;
