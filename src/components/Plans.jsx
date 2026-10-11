import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { tabFor } from '../store/walletSlice';
import { formatINR } from '../utils/money';
import { Spinner } from './Loader.jsx';

// ---------- icons ----------
const Svg = ({ size = 22, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const CartIcon = ({ size }) => (
  <Svg size={size}>
    <path d="M3 4h2l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.2" />
    <circle cx="9.5" cy="19.5" r="1.3" />
    <circle cx="17" cy="19.5" r="1.3" />
  </Svg>
);
const CrownIcon = ({ size }) => (
  <Svg size={size}>
    <path d="m4 8 4 3.5L12 5l4 6.5L20 8l-1.6 9.5H5.6L4 8Z" />
    <path d="M6 20.5h12" />
  </Svg>
);
const CoinsIcon = ({ size }) => (
  <Svg size={size}>
    <ellipse cx="12" cy="6" rx="7" ry="2.8" />
    <path d="M5 6v6c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V6M5 12v6c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-6" />
  </Svg>
);
const ArrowIcon = ({ size = 18 }) => (
  <Svg size={size}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);
const Check = () => (
  <Svg size={18}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);
const MinusIcon = ({ size = 18 }) => (
  <Svg size={size}>
    <path d="M6 12h12" />
  </Svg>
);
const PlusIcon = ({ size = 18 }) => (
  <Svg size={size}>
    <path d="M12 6v12M6 12h12" />
  </Svg>
);
const SlidersIcon = () => (
  <Svg>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </Svg>
);
const WalletIcon = () => (
  <Svg>
    <path d="M19 7V5.5A1.5 1.5 0 0 0 17.5 4h-12A2.5 2.5 0 0 0 3 6.5v11A2.5 2.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
    <path d="M3 6.5A2.5 2.5 0 0 0 5.5 9h13A1.5 1.5 0 0 1 20 10.5V15h-4a2 2 0 0 1 0-4h4" />
  </Svg>
);
const QrIcon = () => (
  <Svg>
    <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.4" />
    <rect x="14" y="3.5" width="6.5" height="6.5" rx="1.4" />
    <rect x="3.5" y="14" width="6.5" height="6.5" rx="1.4" />
    <path d="M14 14h2.6v2.6M20.5 14v.01M14 20.5h2.6M20.5 18v2.5h-1.4" />
  </Svg>
);
const GearIcon = () => (
  <Svg>
    <circle cx="12" cy="12" r="3" />
    <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.3.9a7 7 0 0 0-2.1-1.2L14 3h-4l-.5 2.5a7 7 0 0 0-2.1 1.2l-2.3-.9-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.3-.9a7 7 0 0 0 2.1 1.2L10 21h4l.5-2.5a7 7 0 0 0 2.1-1.2l2.3.9 2-3.4-2-1.6c.07-.4.1-.8.1-1.2Z" />
  </Svg>
);

// ---------- helpers ----------
const qty = (n) => n.toLocaleString('en-IN');
const longDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const whole = (paise) => formatINR(paise, { whole: true });

// Same arithmetic as the server (config/plans.js).
// Subscription volume price: every QR costs the same, ₹15 up to the tier (1,000 a month), ₹10 above.
const subPricePerQr = ({ subscription: s }, quota) => (quota <= s.tierQr ? s.pricePerQrPaise : s.priceAboveTierPaise);
const subTermsFor = (catalog, billingCycle, quota) => {
  const monthly = quota * subPricePerQr(catalog, quota);
  const yearly = billingCycle === 'YEARLY';
  const price = yearly ? Math.round((monthly * 12 * (100 - catalog.yearlyDiscountPct)) / 100) : monthly;
  return { monthlyPricePaise: monthly, pricePaise: price, perMonthPaise: yearly ? Math.round(price / 12) : monthly };
};
// Fixed + Variable extras: [[count, price], …] — the month's first `extraTierQr` at ₹15, the rest at
// ₹10, counting `alreadyBought` extras bought earlier in the same month.
const fixedExtraSplit = ({ fixed: f }, extras, alreadyBought = 0) => {
  const full = Math.max(0, Math.min(extras, f.extraTierQr - alreadyBought));
  return [
    [full, f.extraPricePaise],
    [extras - full, f.extraPriceAboveTierPaise],
  ].filter(([n]) => n > 0);
};
const splitTotal = (split) => split.reduce((sum, [n, price]) => sum + n * price, 0);
const splitText = (split) => split.map(([n, price]) => `${qty(n)} × ${whole(price)}`).join(' + ');

// The slider moves evenly between these stops (as in the design: 100 · 500 · 1,000 · 5,000 · 10,000).
const SLIDER_STOPS = [100, 500, 1000, 5000, 10000];
const posToQuota = (pos, step) => {
  const seg = Math.min(SLIDER_STOPS.length - 2, Math.floor(pos / 25));
  const t = (pos - seg * 25) / 25;
  const raw = SLIDER_STOPS[seg] + t * (SLIDER_STOPS[seg + 1] - SLIDER_STOPS[seg]);
  return Math.max(SLIDER_STOPS[0], Math.round(raw / step) * step);
};
const quotaToPos = (quota) => {
  for (let i = 0; i < SLIDER_STOPS.length - 1; i++) {
    if (quota <= SLIDER_STOPS[i + 1]) return i * 25 + ((quota - SLIDER_STOPS[i]) / (SLIDER_STOPS[i + 1] - SLIDER_STOPS[i])) * 25;
  }
  return 100;
};

// A quantity box. Totals follow every keystroke (any whole number in range); − / + move by `step`,
// and keep going (faster) while held; ↑ / ↓ work too. Typing outside the range shows a hint and the
// totals keep the last valid number; leaving the box brings it back into range.
const Stepper = ({ value, onChange, min, max, step, label }) => {
  const [text, setText] = useState(String(value));
  const valueRef = useRef(value);
  const repeatRef = useRef(null);
  valueRef.current = value;

  useEffect(() => {
    setText((current) => (Number(current) === value && current !== '' ? current : String(value)));
  }, [value]);

  const stopRepeat = () => {
    clearTimeout(repeatRef.current);
    repeatRef.current = null;
  };
  useEffect(() => stopRepeat, []);

  const clamp = (n) => Math.min(max, Math.max(min, n));
  const typed = Number(text);
  const hint = text === '' || typed < min ? `Minimum ${qty(min)}` : typed > max ? `Maximum ${qty(max)}` : '';

  const type = (raw) => {
    const digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 6);
    setText(digits);
    const n = Number(digits);
    if (digits && n >= min && n <= max) onChange(n);
  };
  const settle = () => {
    const n = clamp(Number(text) || min);
    setText(String(n));
    if (n !== valueRef.current) onChange(n);
  };
  const bump = (direction) => {
    const n = clamp(valueRef.current + direction * step);
    if (n === valueRef.current) return false;
    valueRef.current = n;
    setText(String(n));
    onChange(n);
    return n !== min && n !== max;
  };
  const startRepeat = (direction) => {
    stopRepeat();
    if (!bump(direction)) return;
    let delay = 400;
    const tick = () => {
      if (!bump(direction)) return stopRepeat();
      delay = Math.max(45, delay * 0.8);
      repeatRef.current = setTimeout(tick, delay);
      return undefined;
    };
    repeatRef.current = setTimeout(tick, delay);
  };
  // Mouse / touch use press-and-hold; a keyboard "click" (detail 0) steps once.
  const buttonProps = (direction) => ({
    type: 'button',
    onPointerDown: (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      startRepeat(direction);
    },
    onPointerUp: stopRepeat,
    onPointerLeave: stopRepeat,
    onPointerCancel: stopRepeat,
    onClick: (e) => e.detail === 0 && bump(direction),
  });

  return (
    <div className="oh-plan-stepper-wrap">
      <div className={`oh-plan-stepper ${hint ? 'invalid' : ''}`} role="group" aria-label={label}>
        <button {...buttonProps(-1)} disabled={value <= min} aria-label={`Fewer ${label}`}>
          <MinusIcon />
        </button>
        <input
          inputMode="numeric"
          value={text}
          onChange={(e) => type(e.target.value)}
          onBlur={settle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') settle();
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault();
              bump(e.key === 'ArrowUp' ? 1 : -1);
            }
          }}
          aria-label={label}
          aria-invalid={Boolean(hint)}
        />
        <button {...buttonProps(1)} disabled={value >= max} aria-label={`More ${label}`}>
          <PlusIcon />
        </button>
      </div>
      {hint && (
        <span className="oh-plan-stepper-hint" role="alert">
          {hint}
        </span>
      )}
    </div>
  );
};

// ---------- the page ----------
// Each card buys stickers straight into that plan's own balance — its tab on Generate — paid
// through Razorpay. A user can hold stickers from all three plans at once.
export const PlansTab = ({ onBuy }) => {
  const { tabs, catalog, status } = useSelector((s) => s.wallet);
  const ready = status === 'ready';
  const [subCycle, setSubCycle] = useState('MONTHLY');
  const [paygQty, setPaygQty] = useState(100);
  const [subQuota, setSubQuota] = useState(1000);
  const [fixedExtra, setFixedExtra] = useState(500);

  if (!catalog) {
    return (
      <div className="oh-wallet-empty">
        <Spinner /> Loading plans…
      </div>
    );
  }

  const { payg, subscription, fixed, yearlyDiscountPct } = catalog;
  const { minQr, maxQr, stepQr, tierQr, pricePerQrPaise, priceAboveTierPaise } = subscription;
  const { feePaise, includedQr, extraTierQr, extraPricePaise, extraPriceAboveTierPaise, maxExtraQr, minAddQr } = fixed;
  const owned = (planType) => (ready ? tabFor(tabs, planType) : null);

  // Pay As You Go
  const paygTotal = paygQty * payg.pricePerQrPaise;
  const months = payg.validityMonths || 24;
  const validity = months % 12 ? `${months} months` : `${months / 12} year${months === 12 ? '' : 's'}`;

  // Subscription
  const subTerms = subTermsFor(catalog, subCycle, subQuota);
  const subYearly = subCycle === 'YEARLY';

  // Fixed + Variable: while a month is running, the card adds extras to it (no fee) instead of
  // starting a new one — the same month the server adds to (the one that ends last).
  const fixedTab = owned('FIXED_VARIABLE');
  const running = fixedTab ? [...fixedTab.packs].sort((a, b) => new Date(b.periodEnd) - new Date(a.periodEnd))[0] : null;
  const extras = running ? Math.max(minAddQr, fixedExtra) : fixedExtra;
  const fixedSplit = fixedExtraSplit(catalog, extras, running ? running.extrasBought : 0);
  const fixedTotal = (running ? 0 : feePaise) + splitTotal(fixedSplit);
  const fixedStickers = (running ? 0 : includedQr) + extras;

  const ribbon = (planType) => {
    const tab = owned(planType);
    return tab && <span className="oh-plan-ribbon">{qty(tab.stickers)} in balance</span>;
  };

  const buyPayg = () =>
    onBuy({
      planType: 'PAYG',
      quantity: paygQty,
      title: 'Buy Pay As You Go stickers',
      amountPaise: paygTotal,
      lines: [
        ['Stickers', qty(paygQty)],
        ['Price per sticker', formatINR(payg.pricePerQrPaise)],
        ['Valid', `${validity} from today`],
      ],
    });
  const buySub = () =>
    onBuy({
      planType: 'SUBSCRIPTION',
      billingCycle: subCycle,
      quantity: subQuota,
      title: 'Buy a Subscription',
      amountPaise: subTerms.pricePaise,
      lines: [
        ['Stickers each month', qty(subQuota)],
        ['Price per sticker', formatINR(subPricePerQr(catalog, subQuota))],
        ['Billing', subYearly ? `12 months upfront (−${yearlyDiscountPct}%)` : 'One month'],
        ['Unused stickers', 'Expire at the end of each month'],
      ],
    });
  const buyFixed = () =>
    onBuy({
      planType: 'FIXED_VARIABLE',
      billingCycle: 'MONTHLY',
      quantity: extras,
      title: running ? 'Add Fixed + Variable stickers' : 'Buy Fixed + Variable',
      amountPaise: fixedTotal,
      lines: running
        ? [
            ['Adding to this month', `${qty(extras)} stickers`],
            ['Price', splitText(fixedSplit)],
            ['Expire', longDate(running.expiresAt)],
          ]
        : [
            ['Fixed monthly fee', `${whole(feePaise)} · ${qty(includedQr)} stickers`],
            ['Additional stickers', extras ? splitText(fixedSplit) : 'None'],
            ['Stickers for the month', qty(fixedStickers)],
          ],
    });

  return (
    <div className="oh-plans">
      <header className="oh-plans-head">
        <div>
          <h2>Choose your plan</h2>
          <p>Buy stickers with any plan. Each plan keeps its own sticker balance, and you choose which one to generate from.</p>
        </div>
        <span className="oh-plans-save">Save {yearlyDiscountPct}% with a yearly Subscription</span>
      </header>

      <div className="oh-plans-grid">
        {/* Pay As You Go */}
        <article className={`oh-plan-card tone-payg ${owned('PAYG') ? 'current' : ''}`}>
          {ribbon('PAYG')}
          <span className="oh-plan-icon">
            <CartIcon />
          </span>
          <h3>Pay As You Go</h3>
          <p className="oh-plan-sub">Pay only for what you use. Stickers stay valid for {validity}.</p>
          <div className="oh-plan-panel">
            <label className="oh-plan-label">How many QR codes do you need?</label>
            <Stepper value={paygQty} onChange={setPaygQty} min={payg.minQr} max={payg.maxQr} step={10} label="QR codes" />
            <div className="oh-plan-lines">
              <div>
                <span>Price per QR code</span>
                <strong>{formatINR(payg.pricePerQrPaise)}</strong>
              </div>
              <div className="total">
                <span>Total amount</span>
                <strong>{formatINR(paygTotal)}</strong>
              </div>
            </div>
          </div>
          <button type="button" className="oh-plan-cta" onClick={buyPayg}>
            Buy now <ArrowIcon />
          </button>
          <p className="oh-plan-foot">Adds {qty(paygQty)} stickers to your Pay As You Go balance.</p>
        </article>

        {/* Subscription */}
        <article className={`oh-plan-card tone-sub ${owned('SUBSCRIPTION') ? 'current' : ''}`}>
          {ribbon('SUBSCRIPTION')}
          <span className="oh-plan-icon">
            <CrownIcon />
          </span>
          <h3>Subscription</h3>
          <p className="oh-plan-sub">A fresh set of stickers every month.</p>
          <div className="oh-plan-panel">
            <div className="oh-plan-cycle-row">
              <span className="oh-plan-label">Billing</span>
              <div className="oh-segment small" role="group" aria-label="Subscription billing">
                {['MONTHLY', 'YEARLY'].map((c) => (
                  <button key={c} type="button" className={subCycle === c ? 'active' : ''} aria-pressed={subCycle === c} onClick={() => setSubCycle(c)}>
                    {c === 'MONTHLY' ? 'Monthly' : `Yearly · −${yearlyDiscountPct}%`}
                  </button>
                ))}
              </div>
            </div>
            <div className="oh-plan-quota-head">
              <label className="oh-plan-label" htmlFor="oh-sub-quota">
                QR codes per month
              </label>
              <Stepper value={subQuota} onChange={setSubQuota} min={minQr} max={maxQr} step={Math.max(stepQr, 100)} label="QR codes per month" />
            </div>
            <input
              id="oh-sub-quota"
              className="oh-plan-slider"
              type="range"
              min={0}
              max={100}
              step={0.5}
              value={quotaToPos(subQuota)}
              onChange={(e) => setSubQuota(Math.min(maxQr, posToQuota(Number(e.target.value), Math.max(stepQr, 100))))}
              style={{ '--fill': `${quotaToPos(subQuota)}%` }}
              aria-valuetext={`${qty(subQuota)} QR codes per month`}
            />
            <div className="oh-plan-ticks" aria-hidden="true">
              {SLIDER_STOPS.map((s) => (
                <span key={s}>{qty(s)}</span>
              ))}
            </div>
            <div className="oh-plan-lines">
              <div>
                <span>Price per QR code</span>
                <strong>{formatINR(subPricePerQr(catalog, subQuota))}</strong>
              </div>
              <div>
                <span>Monthly price</span>
                <strong>
                  {subYearly && <s>{whole(subTerms.monthlyPricePaise)}</s>} {formatINR(subTerms.perMonthPaise)}
                </strong>
              </div>
              <div className="total">
                <span>{subYearly ? 'Billed yearly (12 months)' : 'Billed monthly'}</span>
                <strong>{formatINR(subTerms.pricePaise)}</strong>
              </div>
              <p className="oh-plan-note">
                {subYearly && `You save ${whole(subTerms.monthlyPricePaise * 12 - subTerms.pricePaise)} · `}
                {qty(subQuota)} stickers every month{subYearly ? ' for 12 months' : ''}
              </p>
            </div>
          </div>
          <button type="button" className="oh-plan-cta" onClick={buySub}>
            Subscribe now <ArrowIcon />
          </button>
          <p className="oh-plan-foot">
            {whole(pricePerQrPaise)} per QR code up to {qty(tierQr)} a month, {whole(priceAboveTierPaise)} each above · unused stickers
            expire at month end.
          </p>
        </article>

        {/* Fixed + Variable */}
        <article className={`oh-plan-card tone-fixed ${fixedTab ? 'current' : ''}`}>
          {ribbon('FIXED_VARIABLE')}
          <span className="oh-plan-icon">
            <CoinsIcon />
          </span>
          <h3>Fixed + Variable</h3>
          <p className="oh-plan-sub">A fixed monthly fee plus as many additional QR codes as you need that month.</p>
          <div className="oh-plan-panel">
            {running ? (
              <div className="oh-plan-running">
                <span className="oh-plan-label">This month</span>
                <strong>{qty(fixedTab.stickers)} stickers left</strong>
                <span>
                  Expire {longDate(running.expiresAt)} · {qty(running.extrasBought)} additional bought so far
                </span>
              </div>
            ) : (
              <div className="oh-plan-fixed-row">
                <div>
                  <span className="oh-plan-label">Fixed monthly fee</span>
                  <strong className="oh-plan-big">{whole(feePaise)}</strong>
                </div>
                <div className="oh-plan-includes">
                  <span>Includes</span>
                  <strong>{qty(includedQr)}</strong>
                  <span>QR codes per month</span>
                </div>
              </div>
            )}
            <label className="oh-plan-label">{running ? 'Add more QR codes this month' : 'Additional QR codes (this month)'}</label>
            <Stepper value={extras} onChange={setFixedExtra} min={running ? minAddQr : 0} max={maxExtraQr} step={100} label="additional QR codes" />
            <div className="oh-plan-lines">
              <div>
                <span>Price per additional QR code</span>
                <strong>{formatINR(extraPricePaise)}</strong>
              </div>
              <div>
                <span>After {qty(extraTierQr)} additional a month</span>
                <strong>{formatINR(extraPriceAboveTierPaise)}</strong>
              </div>
              <div className="total">
                <span>{running ? 'To pay' : 'Total for the month'}</span>
                <strong>{formatINR(fixedTotal)}</strong>
              </div>
              <p className="oh-plan-note">
                {[running ? null : `${whole(feePaise)} fixed`, ...fixedSplit.map(([n, price]) => `(${qty(n)} × ${whole(price)})`)]
                  .filter(Boolean)
                  .join(' + ')}{' '}
                · you get {qty(fixedStickers)} stickers
              </p>
            </div>
          </div>
          <button type="button" className="oh-plan-cta" disabled={!ready} onClick={buyFixed}>
            {running ? `Add ${qty(extras)} stickers` : 'Choose this plan'} <ArrowIcon />
          </button>
          <p className="oh-plan-foot">Paid upfront · every sticker bought for the month expires at its end.</p>
        </article>
      </div>

      <section className="oh-plans-compare" aria-label="Compare plans">
        <table>
          <thead>
            <tr>
              <th scope="col">Features</th>
              <th scope="col" className="tone-payg">Pay As You Go</th>
              <th scope="col" className="tone-sub">Subscription</th>
              <th scope="col" className="tone-fixed">Fixed + Variable</th>
            </tr>
          </thead>
          <tbody>
            {[
              [
                'Price per QR code',
                whole(payg.pricePerQrPaise),
                `${whole(pricePerQrPaise)} up to ${qty(tierQr)} a month · ${whole(priceAboveTierPaise)} above`,
                `${whole(feePaise)} for ${qty(includedQr)} · then ${whole(extraPricePaise)}, ${whole(extraPriceAboveTierPaise)} after ${qty(extraTierQr)}`,
              ],
              ['Monthly fee', false, true, true],
              ['QR codes each month', false, `You choose (${qty(minQr)}–${qty(maxQr)})`, `${qty(includedQr)} + any you add`],
              [`Yearly billing (save ${yearlyDiscountPct}%)`, false, true, false],
              ['Unused QR codes', `Expire after ${validity}`, 'Expire at month end', 'Expire at month end'],
              ['Own balance to generate from', true, true, true],
            ].map(([feature, ...cells]) => (
              <tr key={feature}>
                <th scope="row">{feature}</th>
                {cells.map((cell, i) => (
                  <td key={i} className={['tone-payg', 'tone-sub', 'tone-fixed'][i]}>
                    {cell === true ? (
                      <span className="oh-plans-yes" aria-label="Yes">
                        <Check />
                      </span>
                    ) : cell === false ? (
                      <span className="oh-plans-no" aria-label="No">
                        <MinusIcon size={16} />
                      </span>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="oh-plans-steps" aria-label="How it works">
        <div className="oh-plans-steps-title">
          <h3>How it works</h3>
          <p>Get started in a few steps</p>
        </div>
        {[
          [GearIcon, 'Choose a plan', 'Pick the option that fits your needs'],
          [SlidersIcon, 'Enter numbers', 'See the price for your quantity instantly'],
          [WalletIcon, 'Pay securely', "Razorpay adds the stickers to that plan's balance"],
          [QrIcon, 'Start using', 'Pick a balance and generate your QR stickers'],
        ].map(([Icon, title, text], i) => (
          <div key={title} className="oh-plans-step">
            <span className="oh-plans-step-no">{i + 1}</span>
            <span className="oh-plans-step-icon">
              <Icon />
            </span>
            <div>
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};
