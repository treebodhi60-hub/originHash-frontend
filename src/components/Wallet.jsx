import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import api from '../api/axios';
import { PLAN_NAMES, fetchWallet, setTabs, stickerTabs } from '../store/walletSlice';
import { formatINR } from '../utils/money';
import { loadRazorpay } from '../utils/razorpay';
import { formatDateTimeShort } from '../utils/format';
import { Spinner } from './Loader.jsx';
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, CrossIcon, QrIcon } from './ScanIcons.jsx';

const Svg = ({ size = 20, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const PlusIcon = ({ size }) => (
  <Svg size={size}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

const ReceiptIcon = ({ size }) => (
  <Svg size={size}>
    <path d="M6 3.5h12v17l-2.5-1.5-2 1.5-1.5-1.2-1.5 1.2-2-1.5L6 20.5v-17Z" />
    <path d="M9 8h6M9 11.5h6M9 15h3.5" />
  </Svg>
);

const ResetIcon = ({ size }) => (
  <Svg size={size}>
    <path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" />
  </Svg>
);

const LockIcon = ({ size }) => (
  <Svg size={size}>
    <rect x="5" y="10.5" width="14" height="10" rx="2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Svg>
);

const plural = (n, word) => `${n.toLocaleString('en-IN')} ${word}${n === 1 ? '' : 's'}`;
const shortDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const longDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// A centred dialog: Esc and the backdrop close it unless `locked` (a payment step is running).
export const Modal = ({ title, labelId, onClose, locked = false, children, className = '' }) => {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !locked && onClose();
    window.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [locked, onClose]);

  return (
    <div className="oh-wallet-backdrop" onClick={() => !locked && onClose()}>
      <div
        className={`oh-wallet-modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="oh-wallet-modal-head">
          <h2 id={labelId}>{title}</h2>
          <button type="button" className="oh-wallet-close" onClick={onClose} disabled={locked} aria-label="Close">
            <CrossIcon size={16} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
};

// ---------- Sticker balances (top of Generate) ----------

// One line about when a tab's stickers run out. Packs come soonest-expiring first.
const tabDetail = (tab) => {
  const [first] = tab.packs;
  if (tab.planType === 'PAYG') {
    return tab.packs.length > 1
      ? `${plural(first.stickersLeft, 'sticker')} valid until ${longDate(first.expiresAt)}, the rest later`
      : `Valid until ${longDate(first.expiresAt)}`;
  }
  if (tab.planType === 'FIXED_VARIABLE') {
    const extras = tab.packs.reduce((sum, p) => sum + p.extrasBought, 0);
    return `Expire ${shortDate(first.expiresAt)}${extras ? ` · ${plural(extras, 'extra sticker')} bought this month` : ''}`;
  }
  return first.billingCycle === 'YEARLY'
    ? `${plural(first.monthlyQuota, 'sticker')} a month until ${longDate(first.periodEnd)} · this month's expire ${shortDate(first.expiresAt)}`
    : `${plural(first.monthlyQuota, 'sticker')} a month · expire ${shortDate(first.expiresAt)}`;
};

// Admins, test mode: clear the stickers on one plan's tab, or on all of them. Starts on the tab
// that's selected in the bar, the smaller step.
const ResetModal = ({ tabs, initial, onClose }) => {
  const dispatch = useDispatch();
  const [choice, setChoice] = useState(tabs.some((t) => t.planType === initial) ? initial : 'ALL');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const total = tabs.reduce((sum, t) => sum + t.stickers, 0);
  const options = [{ key: 'ALL', name: 'All plans', stickers: total, hint: `${tabs.length} ${tabs.length === 1 ? 'plan' : 'plans'}` }, ...tabs.map((t) => ({ key: t.planType, name: t.name, stickers: t.stickers }))];
  const chosen = options.find((o) => o.key === choice);

  const reset = async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/wallet/reset', choice === 'ALL' ? {} : { planType: choice });
      dispatch(setTabs(data.tabs));
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset your stickers.');
      setBusy(false);
    }
  };

  return (
    <Modal title="Reset stickers" labelId="oh-reset-title" onClose={onClose} locked={busy}>
      <div className="oh-reset">
        <p className="oh-reset-note">Test mode · clears your own stickers so purchases can be tried again. It shows in Activity.</p>
        <div className="oh-reset-options" role="radiogroup" aria-label="Which stickers to clear">
          {options.map((o) => (
            <label key={o.key} className={`oh-reset-option ${choice === o.key ? 'active' : ''}`}>
              <input type="radio" name="oh-reset-plan" value={o.key} checked={choice === o.key} onChange={() => setChoice(o.key)} disabled={busy} />
              <span className="oh-reset-option-name">
                {o.name}
                {o.hint && <small>{o.hint}</small>}
              </span>
              <b>{plural(o.stickers, 'sticker')}</b>
            </label>
          ))}
        </div>
        {error && (
          <div className="oh-error" role="alert">
            {error}
          </div>
        )}
        <button type="button" className="oh-wallet-pay danger" onClick={reset} disabled={busy}>
          {busy ? (
            <>
              <Spinner /> Resetting…
            </>
          ) : (
            `Clear ${plural(chosen.stickers, 'sticker')}${choice === 'ALL' ? ' on every plan' : ` · ${chosen.name}`}`
          )}
        </button>
      </div>
    </Modal>
  );
};

// Every plan the user has bought stickers from is a tab; the selected tab is the balance the next
// batch is generated from.
export const StickerBar = ({ source, onSource, onBuy, onActivity }) => {
  const dispatch = useDispatch();
  const { status, tabs: allTabs, razorpayKeyId } = useSelector((s) => s.wallet);
  const tabs = stickerTabs(allTabs);
  const user = useSelector((s) => s.auth.user);
  const [resetOpen, setResetOpen] = useState(false);
  // Admins only, and only with Razorpay test keys (the server refuses otherwise too).
  const canReset = Boolean(user?.isAdmin || user?.isSuperAdmin) && razorpayKeyId?.startsWith('rzp_test_');
  if (status === 'failed') {
    return (
      <section className="oh-wallet-bar" aria-label="Sticker balance">
        <span className="oh-wallet-bar-icon">
          <QrIcon size={22} />
        </span>
        <div className="oh-wallet-bar-main">
          <span className="oh-wallet-bar-label">Sticker balance</span>
          <span className="oh-wallet-bar-sub">Couldn't load your stickers. Check your connection.</span>
        </div>
        <div className="oh-wallet-bar-actions">
          <button type="button" className="oh-wallet-primary" onClick={() => dispatch(fetchWallet())}>
            Try again
          </button>
        </div>
      </section>
    );
  }
  // Same size as the real bar, so nothing jumps when the balances arrive.
  if (status !== 'ready') {
    return (
      <section className="oh-wallet-bar loading" aria-busy="true" aria-label="Sticker balance">
        <span className="oh-wallet-bar-icon">
          <QrIcon size={22} />
        </span>
        <div className="oh-wallet-bar-main">
          <span className="oh-wallet-bar-label">Sticker balance</span>
          <span className="oh-wallet-skel wide" />
          <span className="oh-wallet-skel" />
        </div>
      </section>
    );
  }
  const current = tabs.find((t) => t.planType === source) || null;

  return (
    <section className={`oh-wallet-bar ${current && current.stickers < 10 ? 'low' : ''}`} aria-label="Sticker balance">
      <span className="oh-wallet-bar-icon">
        <QrIcon size={22} />
      </span>
      <div className="oh-wallet-bar-main" aria-live="polite">
        <span className="oh-wallet-bar-label">{current ? `${current.name} balance` : 'Sticker balance'}</span>
        <strong className="oh-wallet-bar-balance">{plural(current ? current.stickers : 0, 'sticker')}</strong>
        <span className="oh-wallet-bar-sub">{current ? tabDetail(current) : 'Buy a plan to start generating stickers.'}</span>
      </div>
      <div className="oh-wallet-bar-actions">
        {canReset && (
          <button
            type="button"
            className="oh-wallet-ghost"
            onClick={() => setResetOpen(true)}
            disabled={!allTabs.length}
            title={allTabs.length ? 'Admins, test mode only: clear one plan\'s stickers or all of them' : 'No stickers to reset'}
          >
            <ResetIcon size={16} />
            Reset
          </button>
        )}
        <button type="button" className="oh-wallet-ghost" onClick={onActivity}>
          <ReceiptIcon size={16} />
          Activity
        </button>
        <button type="button" className="oh-wallet-primary" onClick={onBuy}>
          <PlusIcon size={16} />
          Buy stickers
        </button>
      </div>
      {tabs.length > 0 && (
        <div className="oh-sticker-tabs" role="radiogroup" aria-label="Generate from">
          <span className="oh-sticker-tabs-label">Generate from</span>
          {tabs.map((t) => (
            <button
              key={t.planType}
              type="button"
              role="radio"
              aria-checked={t.planType === source}
              className={`oh-sticker-tab ${t.planType === source ? 'active' : ''}`}
              onClick={() => onSource(t.planType)}
            >
              <span>{t.name}</span>
              <b>{t.stickers.toLocaleString('en-IN')}</b>
            </button>
          ))}
        </div>
      )}
      {/* Fixed-position dialog: the bar's overflow doesn't clip it. */}
      {resetOpen && <ResetModal tabs={allTabs} initial={source} onClose={() => setResetOpen(false)} />}
    </section>
  );
};

// ---------- Buying stickers (Razorpay Checkout) ----------

// `purchase`: { planType, billingCycle, quantity, title, lines: [[label, value]], amountPaise } —
// what the plan card shows. The server prices it again and Razorpay charges the server's amount.
// phase: idle → starting (creating the order) → checkout (Razorpay open) → verifying → success
export const CheckoutModal = ({ purchase, onClose, onDone }) => {
  const dispatch = useDispatch();
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const checkoutRef = useRef(null);

  // If this dialog goes away while Razorpay is open, close Razorpay too.
  useEffect(() => () => checkoutRef.current?.close?.(), []);

  const busy = phase === 'starting' || phase === 'verifying';

  const verify = useCallback(
    async (response) => {
      setPhase('verifying');
      try {
        const { data } = await api.post('/wallet/purchases/verify', {
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
        dispatch(setTabs(data.tabs));
        setResult(data);
        setPhase('success');
      } catch (err) {
        setError(
          `${err.response?.data?.message || 'We could not confirm your payment yet.'} If money was deducted, your stickers will be added automatically within a few minutes.`
        );
        setPhase('idle');
        dispatch(fetchWallet());
      }
    },
    [dispatch]
  );

  const pay = async () => {
    if (busy) return;
    setError('');
    setPhase('starting');
    try {
      const [Razorpay, { data: order }] = await Promise.all([
        loadRazorpay(),
        api.post('/wallet/purchases', {
          planType: purchase.planType,
          billingCycle: purchase.billingCycle,
          quantity: purchase.quantity,
        }),
      ]);
      let lastFailure = '';
      const checkout = new Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amountPaise,
        currency: order.currency,
        name: 'OriginHash',
        description: order.description,
        prefill: order.prefill,
        notes: { purpose: 'sticker_purchase' },
        theme: { color: '#12151a' },
        handler: verify,
        modal: {
          confirm_close: true,
          ondismiss: () => {
            setPhase((p) => (p === 'checkout' ? 'idle' : p));
            if (lastFailure) setError(`Payment failed: ${lastFailure} No money was taken. You can try again.`);
          },
        },
      });
      // Razorpay keeps its window open so the user can retry; remember why the last try failed.
      checkout.on('payment.failed', (resp) => {
        lastFailure = resp?.error?.description || 'the payment was not completed.';
      });
      checkoutRef.current = checkout;
      setPhase('checkout');
      checkout.open();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not start the payment. Please try again.');
      setPhase('idle');
    }
  };

  if (phase === 'success' && result) {
    const tab = result.tabs.find((t) => t.planType === result.planType);
    return (
      <Modal title="Stickers added" labelId="oh-checkout-title" onClose={onClose}>
        <div className="oh-wallet-success" role="status">
          <span className="oh-wallet-success-icon">
            <CheckIcon size={30} />
          </span>
          <strong>{plural(result.stickers, 'sticker')} added</strong>
          <p>
            Your {PLAN_NAMES[result.planType]} balance is now <b>{plural(tab ? tab.stickers : result.stickers, 'sticker')}</b>.
          </p>
          <button type="button" className="oh-wallet-pay" onClick={() => onDone(result.planType)}>
            Start generating
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={purchase.title} labelId="oh-checkout-title" onClose={onClose} locked={busy}>
      <div className="oh-plan-confirm">
        <dl>
          {purchase.lines.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
          <div className="total">
            <dt>To pay</dt>
            <dd>{formatINR(purchase.amountPaise)}</dd>
          </div>
        </dl>

        {error && (
          <div className="oh-error" role="alert">
            {error}
          </div>
        )}

        <button type="button" className="oh-wallet-pay" disabled={busy || phase === 'checkout'} onClick={pay}>
          {phase === 'starting' ? (
            <>
              <Spinner /> Opening Razorpay…
            </>
          ) : phase === 'verifying' ? (
            <>
              <Spinner /> Confirming payment…
            </>
          ) : phase === 'checkout' ? (
            'Complete the payment in the Razorpay window'
          ) : (
            <>
              <LockIcon size={16} /> Pay {formatINR(purchase.amountPaise)} securely
            </>
          )}
        </button>
        <p className="oh-wallet-secure">
          Payments are processed by Razorpay (UPI, cards, net banking, wallets). OriginHash never sees your card or bank
          details.
        </p>
      </div>
    </Modal>
  );
};

// ---------- Activity (ledger) ----------

const TYPE_LABELS = {
  PURCHASE: 'Stickers bought',
  GENERATE: 'Stickers used',
  REFILL: 'New month of stickers',
  EXPIRE: 'Stickers expired',
  RESET: 'Reset (test mode)',
};

export const WalletActivityModal = ({ onClose }) => {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    api
      .get('/wallet/transactions', { params: { page } })
      .then(({ data: body }) => {
        if (cancelled) return;
        setData(body);
        setStatus('ready');
      })
      .catch(() => !cancelled && setStatus('failed'));
    return () => {
      cancelled = true;
    };
  }, [page]);

  return (
    <Modal title="Sticker activity" labelId="oh-wallet-activity-title" onClose={onClose} className="wide">
      {status === 'loading' && !data && (
        <div className="oh-wallet-empty">
          <Spinner /> Loading…
        </div>
      )}
      {status === 'failed' && <div className="oh-wallet-empty">Couldn't load your activity. Please try again.</div>}
      {data && data.total === 0 && <div className="oh-wallet-empty">No activity yet. Buy stickers to get started.</div>}
      {data && data.total > 0 && (
        <>
          <ul className={`oh-wallet-ledger ${status === 'loading' ? 'refreshing' : ''}`}>
            {data.transactions.map((t) => {
              const credit = t.stickers > 0;
              return (
                <li key={t.id}>
                  <span className={`oh-wallet-ledger-icon ${credit ? 'credit' : 'debit'}`}>
                    {credit ? <PlusIcon size={16} /> : <QrIcon size={16} />}
                  </span>
                  <div className="oh-wallet-ledger-main">
                    <strong>{TYPE_LABELS[t.type] || t.type}</strong>
                    <span>{t.description}</span>
                    <time dateTime={t.createdAt}>
                      {formatDateTimeShort(t.createdAt)}
                      {t.amountPaise ? ` · paid ${formatINR(t.amountPaise)}` : ''}
                    </time>
                  </div>
                  <div className="oh-wallet-ledger-amount">
                    <strong className={credit ? 'credit' : 'debit'}>
                      {credit ? '+' : '−'}
                      {Math.abs(t.stickers).toLocaleString('en-IN')}
                    </strong>
                    <span>
                      {PLAN_NAMES[t.planType]} · {t.balanceAfter.toLocaleString('en-IN')} left
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          {data.totalPages > 1 && (
            <nav className="oh-wallet-pager" aria-label="Activity pages">
              <button type="button" onClick={() => setPage((p) => p - 1)} disabled={page <= 1 || status === 'loading'} aria-label="Newer">
                <ChevronLeftIcon size={16} />
              </button>
              <span>
                Page {data.page} of {data.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.totalPages || status === 'loading'}
                aria-label="Older"
              >
                <ChevronRightIcon size={16} />
              </button>
            </nav>
          )}
        </>
      )}
    </Modal>
  );
};
