import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, BadgeCheck, ExternalLink, FileText, History, MessageCircle, Package, ShieldCheck, TicketPercent, X } from 'lucide-react';
import connectApi, { errorText } from '../api';
import { rememberReturn } from '../../utils/returnTo';
import { useAppUser } from '../useChain';
import { PhoneShell } from '../Shells.jsx';
import { useDispatch } from 'react-redux';
import { logout } from '../../store/authSlice';
import { Badge, Button, Empty, ErrorNote, Loading, Notice, fmtDate, fmtDateTime, placeText, roleLabel } from '../ui.jsx';
import { WarrantyList } from '../shared.jsx';

// What a consumer QR opens. Locked until a retailer marks the unit sold; then: authentic &
// verified, product info and certificates, discounts / loyalty (the unit's unique coupon and the
// producer's offers), warranty, the consumer's own history, and chat with the brand (when the
// producer has it on). Product info is public; the rest needs an OTP login.

const opening = new Map();
const openOnce = (token, signedIn) => {
  const key = `${token}:${signedIn}`;
  const hit = opening.get(key);
  if (hit && Date.now() - hit.at < 4000) return hit.promise;
  const promise = connectApi.post(`/qr/c/${token}/open`).then((r) => r.data);
  opening.set(key, { at: Date.now(), promise });
  return promise;
};

const SignInPrompt = ({ token, what }) => {
  const navigate = useNavigate();
  return (
    <div className="cx-stack" style={{ gap: 8 }}>
      <p className="cx-muted">Log in with your mobile number to {what}.</p>
      <Button
        onClick={() => {
          rememberReturn(`/cq/${token}`);
          navigate('/login');
        }}
      >
        Log in
      </Button>
    </div>
  );
};

const ProductSection = ({ product, producer }) => (
  <section className="cx-section">
    <h3>Product information</h3>
    {product.images?.length > 0 && (
      <div className="cx-gallery">
        {product.images.map((img) => (
          <img key={img.ref} src={img.url} alt={product.name} />
        ))}
      </div>
    )}
    <dl className="cx-dl">
      <dt>Product</dt>
      <dd>{product.name}</dd>
      {product.category && (
        <>
          <dt>Category</dt>
          <dd>{product.category}</dd>
        </>
      )}
      <dt>Producer</dt>
      <dd>{producer.name}</dd>
    </dl>
    {product.description && <p>{product.description}</p>}
    {(product.website || producer.website) && (
      <a className="cx-doc-link" href={product.website || producer.website} target="_blank" rel="noreferrer">
        <ExternalLink size={18} /> Visit website
      </a>
    )}
    <h3 style={{ marginTop: 6 }}>Certifications</h3>
    {product.nablCertificate || product.certifications?.length ? (
      <>
        {product.nablCertificate && (
          <a className="cx-doc-link" href={product.nablCertificate.url} target="_blank" rel="noreferrer">
            <BadgeCheck size={18} /> NABL certificate
          </a>
        )}
        {product.certifications.map((c) => (
          <a key={c.ref} className="cx-doc-link" href={c.url} target="_blank" rel="noreferrer">
            <FileText size={18} /> {c.title}
          </a>
        ))}
      </>
    ) : (
      <p className="cx-muted">No certificates uploaded.</p>
    )}
  </section>
);

const DiscountSection = ({ info, token, onClaimed }) => {
  const { discount, offers, viewer } = info;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const consumer = viewer?.role === 'consumer';
  const claim = async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await connectApi.post(`/qr/c/${token}/coupon`);
      onClaimed(data.coupon);
    } catch (err) {
      setError(errorText(err, 'Could not get the coupon.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="cx-section">
      <h3>Discounts / loyalty</h3>
      {discount.hasCoupon ? (
        <div className="cx-coupon">
          <strong>{discount.percent}% off</strong>
          <span className="cx-muted">Your unique coupon for this product · valid till {fmtDate(discount.validTill)}</span>
          {discount.code ? (
            <code>{discount.code}</code>
          ) : discount.expired ? (
            <Badge tone="danger">Expired</Badge>
          ) : discount.claimed ? (
            <Badge>Already claimed by another customer</Badge>
          ) : !info.signedIn ? (
            <SignInPrompt token={token} what="see your coupon code" />
          ) : consumer ? (
            <Button busy={busy} onClick={claim}>
              Get my coupon code
            </Button>
          ) : (
            <span className="cx-muted">Coupons are for customers.</span>
          )}
          <ErrorNote>{error}</ErrorNote>
        </div>
      ) : (
        <p className="cx-muted">No discount on this product.</p>
      )}
      {offers.length > 0 && (
        <>
          <h3 style={{ marginTop: 6 }}>Offers from {info.producer.name}</h3>
          {offers.map((o) => (
            <div key={o.id} className="cx-doc-link" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
              <strong>{o.title}</strong>
              {o.details && <span className="cx-muted" style={{ fontWeight: 400 }}>{o.details}</span>}
              <span>
                {o.couponCode ? <code className="cx-mono">{o.couponCode}</code> : <span className="cx-muted">Log in to see the coupon</span>}
                {o.validTill && <span className="cx-muted"> · till {fmtDate(o.validTill)}</span>}
              </span>
            </div>
          ))}
        </>
      )}
    </section>
  );
};

const ConsumerQrPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useAppUser();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  // Signed in with a producer / OriginHash account: log out and come back here as a customer.
  const switchAccount = () => {
    dispatch(logout());
    rememberReturn(`/cq/${token}`);
    navigate('/login');
  };
  const [open, setOpen] = useState(null);

  const load = useCallback(() => {
    openOnce(token, Boolean(user))
      .then((data) => {
        setInfo(data);
        if (navigator.geolocation && data.scan) {
          navigator.geolocation.getCurrentPosition(
            ({ coords }) => connectApi.patch(`/qr/scans/${data.scan.token}/location`, { latitude: coords.latitude, longitude: coords.longitude }).catch(() => {}),
            () => {},
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
          );
        }
      })
      .catch((err) => setError(errorText(err, 'Could not open this QR code.')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.id]);
  useEffect(load, [load]);

  if (error) {
    return (
      <PhoneShell>
        <div className="cx-hero-icon danger">
          <X size={34} />
        </div>
        <div className="cx-phone-title">
          <h2>QR code not recognised</h2>
          <p>{error} It may not be a genuine OriginHash label.</p>
        </div>
      </PhoneShell>
    );
  }
  if (!info) {
    return (
      <PhoneShell>
        <Loading label="Verifying this product…" />
      </PhoneShell>
    );
  }

  const image = info.product?.images?.[0] || info.product?.image;
  const hero = (
    <section className="cx-product-hero">
      {image ? (
        <img src={image.url} alt="" />
      ) : (
        <span className="cx-product-ph">
          <Package size={30} />
        </span>
      )}
      <div>
        <h2>{info.product?.name || info.producer.name}</h2>
        <dl>
          <div>
            <dt>Batch:</dt>
            <dd>{info.batchNo}</dd>
          </div>
          <div>
            <dt>Serial:</dt>
            <dd className="cx-mono">{info.serial}</dd>
          </div>
          {info.purchasedFrom && (
            <div>
              <dt>Purchased from:</dt>
              <dd>{info.purchasedFrom.name}</dd>
            </div>
          )}
        </dl>
      </div>
    </section>
  );

  if (!info.activated) {
    return (
      <PhoneShell>
        <div className="cx-hero-icon warning">
          <AlertTriangle size={34} />
        </div>
        <div className="cx-phone-title">
          <h2>Not activated yet</h2>
          <p>This product hasn&apos;t been sold through an authorised retailer yet.</p>
        </div>
        {hero}
        <Notice tone="warning">If you just bought it, ask the retailer to scan the retailer QR and press Sold. This consumer QR then shows the product&apos;s details, coupon and warranty.</Notice>
      </PhoneShell>
    );
  }

  const tiles = [
    { key: 'info', label: 'Product info / Certifications', icon: Package },
    { key: 'discounts', label: 'Discounts / Loyalty', icon: TicketPercent },
    { key: 'warranty', label: 'Warranty info', icon: ShieldCheck },
    { key: 'history', label: 'My history', icon: History },
    ...(info.features.chat ? [{ key: 'chat', label: 'Chat with brand', icon: MessageCircle }] : []),
  ];
  // Chat with brand: any customer — consumers, and retailers / distributors buying for themselves.
  const canChat = ['consumer', 'retailer', 'distributor'].includes(info.viewer?.role);
  const toggle = (key) => {
    if (key === 'chat' && canChat) {
      navigate(`/chain/chats/${info.producer.id}?unit=${token}`);
      return;
    }
    setOpen(open === key ? null : key);
  };

  return (
    <PhoneShell>
      <span className="cx-verified">
        <ShieldCheck size={16} /> Authentic &amp; verified
      </span>
      {hero}
      {info.soldAt && <p className="cx-small" style={{ margin: 0 }}>Sold {fmtDate(info.soldAt)}{info.purchasedFrom?.city ? ` in ${info.purchasedFrom.city}` : ''}</p>}
      <div className="cx-tiles">
        {tiles.map((t) => (
          <button key={t.key} type="button" className={`cx-tile ${open === t.key ? 'active' : ''}`} onClick={() => toggle(t.key)} aria-expanded={open === t.key}>
            <t.icon size={26} />
            {t.label}
            {t.key === 'discounts' && info.discount.hasCoupon && <small>{info.discount.percent}% off</small>}
          </button>
        ))}
      </div>

      {open === 'info' && <ProductSection product={info.product || {}} producer={info.producer} />}
      {open === 'discounts' && <DiscountSection info={info} token={token} onClaimed={(c) => setInfo({ ...info, discount: { ...info.discount, code: c.code, claimed: true, claimedByMe: true } })} />}
      {open === 'warranty' && (
        <section className="cx-section">
          <h3>Warranty information</h3>
          {info.product?.warrantyTerms && <p style={{ whiteSpace: 'pre-wrap' }}>{info.product.warrantyTerms}</p>}
          {info.product?.warrantyDocs?.map((d) => (
            <a key={d.ref} className="cx-doc-link" href={d.url} target="_blank" rel="noreferrer">
              <FileText size={18} /> {d.title || d.name || 'Warranty document'}
            </a>
          ))}
          {info.signedIn ? <WarrantyList warranties={info.warranties || []} /> : <SignInPrompt token={token} what="see the warranty registered for this product" />}
        </section>
      )}
      {open === 'history' && (
        <section className="cx-section">
          <h3>My history</h3>
          {!info.signedIn ? (
            <SignInPrompt token={token} what="see your scan history" />
          ) : info.myScans?.length ? (
            <>
              <ol className="cx-timeline">
                {info.myScans.map((s) => (
                  <li key={s.id} className="consumer">
                    <strong>You scanned this product</strong>
                    <span>
                      {fmtDateTime(s.at)}
                      {s.location ? ` · ${placeText(s.location)}` : ''}
                    </span>
                  </li>
                ))}
              </ol>
              <Link className="cx-link" to="/chain/history">
                All my scans
              </Link>
            </>
          ) : (
            <Empty title="No scans by you yet." />
          )}
        </section>
      )}
      {open === 'chat' && (
        <section className="cx-section">
          <h3>Chat with {info.producer.name}</h3>
          {!info.signedIn ? (
            <SignInPrompt token={token} what="chat with the brand" />
          ) : (
            <>
              <p className="cx-muted">
                You&apos;re signed in as {info.viewer?.role === 'admin' ? 'OriginHash' : `a ${roleLabel(info.viewer?.role).toLowerCase()}`}
                {info.viewer?.name ? ` (${info.viewer.name})` : ''}. Chat with the brand is for customers: log in with your own mobile number to message{' '}
                {info.producer.name}.
              </p>
              <Button variant="ghost" className="block" onClick={switchAccount}>
                Log in with another account
              </Button>
            </>
          )}
        </section>
      )}
      <p className="cx-small">Opening this page is recorded for the brand, with your approximate location if you allow it.</p>
    </PhoneShell>
  );
};

export default ConsumerQrPage;
