import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, Leaf, Package, Route } from 'lucide-react';
import BrandLogo from './BrandLogo.jsx';

// The sign-in stage: "One scan. The whole story." A product's QR sits on a glass passport card;
// a scan line sweeps it, the viewfinder locks on — a ring of light runs out through a field of
// modules, every product connected — and the passport unfolds around it: origin, batch, journey,
// and the authentic seal. Decorative and labelled "Illustrative": no real data,
// no requests. Motion stops for people who ask for less of it.

// ---------- A modern QR: rounded finder squares, dot modules, a clear centre for the mark ----------
const N = 25;
const isFinder = (r, c) =>
  [
    [0, 0],
    [0, N - 7],
    [N - 7, 0],
  ].some(([fr, fc]) => r >= fr - 1 && r <= fr + 7 && c >= fc - 1 && c <= fc + 7);
const isCentre = (r, c) => Math.abs(r - 12) <= 3 && Math.abs(c - 12) <= 3;
const isAlign = (r, c) => r >= 16 && r <= 20 && c >= 16 && c <= 20;

// Fixed seed: the same code on every visit.
const MODULES = (() => {
  let seed = 7_302_026;
  const rand = () => {
    seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
    return seed / 2_147_483_648;
  };
  const out = [];
  for (let r = 0; r < N; r += 1) {
    for (let c = 0; c < N; c += 1) {
      if (isFinder(r, c) || isCentre(r, c) || isAlign(r, c)) continue;
      const timing = (r === 6 || c === 6) && (r + c) % 2 === 0;
      if (timing || rand() < 0.5) out.push([r, c]);
    }
  }
  return out;
})();

const Finder = ({ x, y }) => (
  <g>
    <rect x={x + 0.5} y={y + 0.5} width="6" height="6" rx="1.9" className="oh-qx-finder-ring" />
    <rect x={x + 2} y={y + 2} width="3" height="3" rx="0.9" className="oh-qx-finder-eye" />
  </g>
);

const Dots = ({ className }) => (
  <g className={className}>
    {MODULES.map(([r, c]) => (
      <circle key={`${r}-${c}`} cx={c + 0.5} cy={r + 0.5} r="0.42" />
    ))}
    <rect x="16.5" y="16.5" width="4" height="4" rx="1.1" className="oh-qx-align-ring" />
    <circle cx="18.5" cy="18.5" r="0.7" />
  </g>
);

// The QR glyph on its own (also used, small, on phones).
export const QrGlyph = ({ id = 'main', scanning = true }) => (
  <svg className="oh-qx-code" viewBox={`-1 -1 ${N + 2} ${N + 2}`} aria-hidden="true">
    <defs>
      <clipPath id={`oh-qx-band-${id}`}>
        <rect className="oh-qx-band" x="-1" y="-6" width={N + 2} height="6" />
      </clipPath>
      <linearGradient id={`oh-qx-lit-${id}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#5b7cff" />
        <stop offset="1" stopColor="#2347d6" />
      </linearGradient>
    </defs>
    <Dots className="oh-qx-mods" />
    <Finder x={0} y={0} />
    <Finder x={N - 7} y={0} />
    <Finder x={0} y={N - 7} />
    {scanning && (
      <g clipPath={`url(#oh-qx-band-${id})`} fill={`url(#oh-qx-lit-${id})`} className="oh-qx-lit">
        <Dots />
      </g>
    )}
    {scanning && <rect className="oh-qx-laser" x="-1" y="-0.3" width={N + 2} height="0.6" rx="0.3" />}
  </svg>
);

const usePrefersLessMotion = () => {
  const [less, setLess] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return undefined;
    const on = () => setLess(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return less;
};

// Small QR tiles drifting in the light: every product, one label each.
const TILES = [
  { x: 8, y: 16, s: 46, d: 0, b: 1 },
  { x: 82, y: 10, s: 34, d: -3, b: 2 },
  { x: 88, y: 58, s: 54, d: -6, b: 0 },
  { x: 4, y: 64, s: 30, d: -9, b: 2 },
  { x: 84, y: 78, s: 40, d: -4, b: 1 },
  { x: 30, y: 6, s: 26, d: -7, b: 3 },
];

const QrStage = () => {
  const less = usePrefersLessMotion();
  const ref = useRef(null);

  // The passport tilts towards the pointer, a little.
  useEffect(() => {
    const el = ref.current;
    if (!el || less || window.matchMedia?.('(pointer: coarse)').matches) return undefined;
    let frame = 0;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const mx = (e.clientX - r.left) / r.width - 0.5;
      const my = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.setProperty('--mx', mx.toFixed(3));
        el.style.setProperty('--my', my.toFixed(3));
      });
    };
    const leave = () => {
      el.style.setProperty('--mx', 0);
      el.style.setProperty('--my', 0);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, [less]);

  return (
    <div ref={ref} className={`oh-qx ${less ? 'still' : ''}`}>
      <div className="oh-qx-sky" aria-hidden="true">
        <i className="o1" />
        <i className="o2" />
        <i className="o3" />
        <i className="o4" />
        <i className="o5" />
      </div>
      <div className="oh-qx-grain" aria-hidden="true" />
      <div className="oh-qx-field" aria-hidden="true" />
      <div className="oh-qx-tiles" aria-hidden="true">
        {TILES.map((t, i) => (
          <span
            key={i}
            className={`oh-qx-tile b${t.b}`}
            style={{ left: `${t.x}%`, top: `${t.y}%`, width: t.s, height: t.s, animationDelay: `${t.d}s` }}
          >
            <QrGlyph id={`t${i}`} scanning={false} />
          </span>
        ))}
      </div>

      <header className="oh-qx-head">
        <span className="oh-qx-brand">
          <BrandLogo size={30} />
          <span className="oh-wordmark on-paper">
            Origin<span>Hash</span>
          </span>
        </span>
        <span className="oh-qx-tag">Illustrative</span>
      </header>

      <div className="oh-qx-scene" aria-hidden="true">
        <span className="oh-qx-halo">
          <i />
          <i />
        </span>
        <span className="oh-qx-floor" />
        <div className="oh-qx-passport">
          <div className="oh-qx-passport-top">
            <span>Product passport</span>
            <span className="oh-qx-live">
              <i />
              Scanning
            </span>
          </div>
          <div className="oh-qx-frame">
            <QrGlyph />
            <span className="oh-qx-mark">
              <BrandLogo size={40} />
            </span>
            <span className="oh-qx-corner tl" />
            <span className="oh-qx-corner tr" />
            <span className="oh-qx-corner bl" />
            <span className="oh-qx-corner br" />
          </div>
          <div className="oh-qx-passport-foot">
            <code>OHL-7Q2F9C4KX1</code>
            <span className="oh-qx-locked">Code read</span>
          </div>
          <span className="oh-qx-sheen" />
        </div>

        <div className="oh-qx-card c1">
          <span className="oh-qx-card-icon leaf">
            <Leaf size={16} strokeWidth={1.8} />
          </span>
          <span className="oh-qx-card-text">
            <small>Origin</small>
            <strong>Tea estate, Darjeeling</strong>
          </span>
        </div>

        <div className="oh-qx-card c2">
          <span className="oh-qx-card-icon box">
            <Package size={16} strokeWidth={1.8} />
          </span>
          <span className="oh-qx-card-text">
            <small>Batch</small>
            <strong>DFF-2026-09 · 250 g</strong>
          </span>
        </div>

        <div className="oh-qx-card c3 wide">
          <span className="oh-qx-card-icon route">
            <Route size={16} strokeWidth={1.8} />
          </span>
          <span className="oh-qx-card-text">
            <small>Journey · 4 hand-offs</small>
            <span className="oh-qx-trail">
              <i />
              <b />
              <i />
              <b />
              <i />
              <b />
              <i className="end" />
            </span>
          </span>
        </div>

        <div className="oh-qx-card c4 ok">
          <span className="oh-qx-card-icon seal">
            <BadgeCheck size={17} strokeWidth={1.9} />
          </span>
          <span className="oh-qx-card-text">
            <small>Verification</small>
            <strong>Authentic · verified once</strong>
          </span>
        </div>
      </div>

      <div className="oh-qx-copy">
        <span className="oh-qx-eyebrow">Product trust intelligence</span>
        <p className="oh-qx-title">
          One scan. <em>The whole story.</em>
        </p>
        <p className="oh-qx-sub">
          Every OriginHash QR opens a verified product passport — where it began, every hand-off on the way, and proof
          it&rsquo;s genuine.
        </p>
      </div>
    </div>
  );
};

export default QrStage;
