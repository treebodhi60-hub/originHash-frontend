import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWallet, tabFor } from '../store/walletSlice';
import { formatINR } from '../utils/money';
import { Modal } from './Wallet.jsx';

// The Light QR sticker balance (Pay As You Go, two years from purchase) and buying more of it.

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
const longDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const plural = (n, word) => `${fmt(n)} ${word}${n === 1 ? '' : 's'}`;

// Every sticker in a purchase costs the same: ₹15 when the purchase is up to the tier (1,000), ₹10 above.
export const lightPrice = (light, n) => (n <= light.tierQr ? light.pricePerQrPaise : light.priceAboveTierPaise);

const QrBoltIcon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="3" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.7" />
    <rect x="15" y="3" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.7" />
    <rect x="3" y="15" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.7" />
    <path d="M17.6 11.5 14 17h3l-1.2 4.5L20 15.6h-3.1l1.3-4.1h-.6Z" fill="currentColor" />
  </svg>
);
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const ReceiptIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 3.5h12v17l-2.5-1.5-2 1.5-1.5-1.2-1.5 1.2-2-1.5L6 20.5v-17Z" />
    <path d="M9 8h6M9 11.5h6M9 15h3.5" />
  </svg>
);

// The bar at the top of "Generate light QR stickers".
export const LightBalanceBar = ({ onBuy, onActivity }) => {
  const dispatch = useDispatch();
  const { status, tabs, catalog } = useSelector((s) => s.wallet);
  if (status === 'failed') {
    return (
      <section className="oh-wallet-bar" aria-label="Light QR balance">
        <span className="oh-wallet-bar-icon">
          <QrBoltIcon />
        </span>
        <div className="oh-wallet-bar-main">
          <span className="oh-wallet-bar-label">Light QR balance</span>
          <span className="oh-wallet-bar-sub">Couldn&apos;t load your balance. Check your connection.</span>
        </div>
        <div className="oh-wallet-bar-actions">
          <button type="button" className="oh-wallet-primary" onClick={() => dispatch(fetchWallet())}>
            Try again
          </button>
        </div>
      </section>
    );
  }
  if (status !== 'ready') {
    return (
      <section className="oh-wallet-bar loading" aria-busy="true" aria-label="Light QR balance">
        <span className="oh-wallet-bar-icon">
          <QrBoltIcon />
        </span>
        <div className="oh-wallet-bar-main">
          <span className="oh-wallet-bar-label">Light QR balance</span>
          <span className="oh-wallet-skel wide" />
          <span className="oh-wallet-skel" />
        </div>
      </section>
    );
  }

  const light = tabFor(tabs, 'LIGHT');
  const stickers = light ? light.stickers : 0;
  // Packs come soonest-expiring first.
  const first = light?.packs[0];
  const sub = !light
    ? catalog
      ? `Buy stickers to generate light QR codes · ${formatINR(catalog.light.pricePerQrPaise, { whole: true })} each, ${formatINR(catalog.light.priceAboveTierPaise, { whole: true })} each above ${fmt(catalog.light.tierQr)}`
      : 'Buy stickers to generate light QR codes.'
    : light.packs.length > 1
      ? `${plural(first.stickersLeft, 'sticker')} valid until ${longDate(first.expiresAt)}, the rest later`
      : `Valid until ${longDate(first.expiresAt)}`;

  return (
    <section className={`oh-wallet-bar ${stickers < 10 ? 'low' : ''}`} aria-label="Light QR balance">
      <span className="oh-wallet-bar-icon">
        <QrBoltIcon />
      </span>
      <div className="oh-wallet-bar-main" aria-live="polite">
        <span className="oh-wallet-bar-label">Light QR balance</span>
        <strong className="oh-wallet-bar-balance">{plural(stickers, 'sticker')}</strong>
        <span className="oh-wallet-bar-sub">{sub}</span>
      </div>
      <div className="oh-wallet-bar-actions">
        <button type="button" className="oh-wallet-ghost" onClick={onActivity}>
          <ReceiptIcon />
          Activity
        </button>
        <button type="button" className="oh-wallet-primary" onClick={() => onBuy()}>
          <PlusIcon />
          Buy stickers
        </button>
      </div>
    </section>
  );
};

const QUICK = [100, 500, 1000, 2000];

// Pick how many light QR stickers to buy and see the price; "Continue" goes on to payment.
export const BuyLightModal = ({ initial = 0, onContinue, onClose }) => {
  const { catalog } = useSelector((s) => s.wallet);
  const light = catalog?.light;
  const [text, setText] = useState(String(Math.max(initial, 100)));
  const inputRef = useRef(null);
  useEffect(() => inputRef.current?.select(), []);
  if (!light) return null;

  const n = Number(text);
  const valid = Number.isInteger(n) && n >= light.minQr && n <= light.maxQr;
  const price = valid ? lightPrice(light, n) : light.pricePerQrPaise;
  const total = valid ? n * price : 0;
  const until = new Date();
  until.setMonth(until.getMonth() + light.validityMonths);
  const chips = [...new Set([initial, ...QUICK].filter((v) => v > 0))].slice(0, 5);

  return (
    <Modal title="Buy light QR stickers" labelId="oh-buy-light-title" onClose={onClose}>
      <form
        className="oh-wallet-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onContinue({
            planType: 'LIGHT',
            quantity: n,
            title: 'Buy light QR stickers',
            amountPaise: total,
            lines: [
              ['Stickers', fmt(n)],
              ['Price per sticker', formatINR(price)],
              ['Valid until', longDate(until)],
            ],
          });
        }}
      >
        <label className="oh-wallet-amount-label" htmlFor="oh-buy-light-qty">
          How many stickers?
        </label>
        <div className={`oh-wallet-amount ${text && !valid ? 'invalid' : ''}`}>
          <input
            id="oh-buy-light-qty"
            ref={inputRef}
            inputMode="numeric"
            autoComplete="off"
            value={text}
            onChange={(e) => setText(e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 6))}
          />
          <span aria-hidden="true">stickers</span>
        </div>
        <div className="oh-wallet-chips" role="group" aria-label="Quick amounts">
          {chips.map((v) => (
            <button key={v} type="button" className={`oh-wallet-chip ${n === v ? 'active' : ''}`} onClick={() => setText(String(v))}>
              {fmt(v)}
              {v === initial && <small>needed</small>}
            </button>
          ))}
        </div>

        <dl className="oh-buy-light-lines">
          <div>
            <dt>Price per sticker</dt>
            <dd>
              {formatINR(price)}
              <small>
                {n > light.tierQr ? `above ${fmt(light.tierQr)} stickers` : `up to ${fmt(light.tierQr)} · ${formatINR(light.priceAboveTierPaise, { whole: true })} each above`}
              </small>
            </dd>
          </div>
          <div>
            <dt>Valid until</dt>
            <dd>
              {longDate(until)}
              <small>{light.validityMonths % 12 ? `${light.validityMonths} months` : `${light.validityMonths / 12} years`} from today</small>
            </dd>
          </div>
          <div className="total">
            <dt>Total</dt>
            <dd>{valid ? formatINR(total) : '—'}</dd>
          </div>
        </dl>
        {text && !valid && (
          <p className="oh-wallet-hint error">
            Choose between {fmt(light.minQr)} and {fmt(light.maxQr)} stickers.
          </p>
        )}

        <button type="submit" className="oh-wallet-pay" disabled={!valid}>
          Continue to payment
        </button>
      </form>
    </Modal>
  );
};
