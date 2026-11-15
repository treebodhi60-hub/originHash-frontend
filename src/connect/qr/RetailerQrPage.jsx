import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Lock, Package, Store, X } from 'lucide-react';
import connectApi, { errorText } from '../api';
import { rememberReturn } from '../../utils/returnTo';
import { homeOf, useAppUser } from '../useChain';
import { PhoneShell } from '../Shells.jsx';
import { Button, ErrorNote, Loading, Modal, Notice, RoleBadge, fmtDate, fmtDateTime, roleLabel } from '../ui.jsx';
import { WarrantyForm, WarrantyList } from '../shared.jsx';

// What a retailer QR opens. Producers, distributors and retailers scan it (recorded when the
// producer has Tracking on); a retailer or the OriginHash superadmin presses Sold, once, which
// unlocks the consumer QR. Everyone else is asked to sign in.

// Where this device is, if the browser shares it (asked once per page).
const locate = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
    return null;
  });

// One open per page view (React's development double-run isn't counted twice).
const opening = new Map();
const openOnce = (token, signedIn) => {
  const key = `${token}:${signedIn}`;
  const hit = opening.get(key);
  if (hit && Date.now() - hit.at < 4000) return hit.promise;
  const promise = connectApi.post(`/qr/r/${token}/open`).then((r) => r.data);
  opening.set(key, { at: Date.now(), promise });
  return promise;
};

const uploadEndpointFor = (role) => (role === 'admin' ? '/admin/uploads' : role === 'producer' ? '/producer/uploads' : '/me/uploads');

const RetailerQrPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const user = useAppUser();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [selling, setSelling] = useState(false);
  const [justSold, setJustSold] = useState(false);
  const [addingWarranty, setAddingWarranty] = useState(false);
  const whereRef = useRef(null);

  const load = useCallback(() => {
    setError('');
    openOnce(token, Boolean(user))
      .then((data) => {
        setInfo(data);
        if (!data.tradeOnly) {
          whereRef.current = locate();
          if (data.scan) {
            whereRef.current.then((pos) => pos && connectApi.patch(`/qr/scans/${data.scan.token}/location`, pos).catch(() => {}));
          }
        }
      })
      .catch((err) => setError(errorText(err, 'Could not open this QR code.')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.id]);
  useEffect(load, [load]);

  const signIn = () => {
    rememberReturn(`/rq/${token}`);
    navigate('/login');
  };

  const sell = async () => {
    setSelling(true);
    setError('');
    try {
      const pos = await Promise.race([whereRef.current || Promise.resolve(null), new Promise((r) => setTimeout(() => r(null), 3000))]);
      const { data } = await connectApi.post(`/qr/r/${token}/sold`, { scanToken: info.scan?.token, ...(pos || {}) });
      setInfo(data);
      setJustSold(true);
      setConfirming(false);
    } catch (err) {
      setError(errorText(err, 'Could not mark this product sold.'));
      setConfirming(false);
    } finally {
      setSelling(false);
    }
  };

  const done = () => navigate(homeOf(user), { replace: true });

  if (error && !info) {
    return (
      <PhoneShell>
        <div className="cx-hero-icon danger">
          <X size={34} />
        </div>
        <div className="cx-phone-title">
          <h2>QR code not recognised</h2>
          <p>{error}</p>
        </div>
      </PhoneShell>
    );
  }
  if (!info) {
    return (
      <PhoneShell>
        <Loading label="Checking this QR code…" />
      </PhoneShell>
    );
  }

  const details = (
    <dl className="cx-detail-box">
      <div>
        <dt>Product</dt>
        <dd>{info.product?.name || '—'}</dd>
      </div>
      <div>
        <dt>Producer</dt>
        <dd>{info.producer.name}</dd>
      </div>
      {info.batchNo && (
        <div>
          <dt>Batch No.</dt>
          <dd>{info.batchNo}</dd>
        </div>
      )}
      <div>
        <dt>Serial No.</dt>
        <dd className="cx-mono">{info.serial}</dd>
      </div>
    </dl>
  );

  // Not for guests or consumers.
  if (info.tradeOnly) {
    const consumer = info.viewer?.role === 'consumer';
    return (
      <PhoneShell>
        <div className="cx-hero-icon">
          <Lock size={32} />
        </div>
        <div className="cx-phone-title">
          <h2>Retailer QR</h2>
          <p>For authorised distributors, retailers and the producer.</p>
        </div>
        {details}
        {consumer ? (
          <>
            <Notice>You&apos;re signed in as a customer. Scan the consumer QR on the product to see its details, coupon and warranty.</Notice>
            <p className="cx-small">
              Are you a retailer?{' '}
              <Link className="cx-link" to="/chain/retailer">
                Apply for a retailer account
              </Link>
            </p>
          </>
        ) : (
          <>
            <Button className="large block" onClick={signIn}>
              Log in
            </Button>
            <p className="cx-small">
              Distributors and retailers log in with their mobile and OTP; producers with their username and password. New retailer? Log in with your mobile and apply
              from the menu (“Become a retailer”).
            </p>
          </>
        )}
      </PhoneShell>
    );
  }

  // Just sold: the confirmation.
  if (justSold) {
    return (
      <PhoneShell>
        <div className="cx-phone-title">
          <h2>Sale confirmation</h2>
        </div>
        <div className="cx-hero-icon success">
          <CheckCircle2 size={40} />
        </div>
        <p className="cx-phone-title" style={{ margin: 0, color: 'var(--oh-success)', fontWeight: 700, fontSize: '1.1rem' }}>
          Product activated
        </p>
        <dl className="cx-detail-box">
          <div>
            <dt>{info.soldBy?.type === 'retailer' ? 'Retailer' : 'Sold by'}</dt>
            <dd>
              {info.soldBy?.name}
              {info.soldBy?.city ? `, ${info.soldBy.city}` : ''}
            </dd>
          </div>
          <div>
            <dt>Date &amp; time</dt>
            <dd>{fmtDateTime(info.soldAt)}</dd>
          </div>
          <div>
            <dt>Serial No.</dt>
            <dd className="cx-mono">{info.serial}</dd>
          </div>
        </dl>
        <div className="cx-unlocked">
          <CheckCircle2 size={26} />
          <div>
            <strong>Consumer QR unlocked</strong>
            <span>The customer can now scan the consumer QR.</span>
          </div>
        </div>
        {info.canAddWarranty && (
          <Button variant="ghost" className="block" onClick={() => {
              setJustSold(false);
              setAddingWarranty(true);
            }}>
            Add warranty information
          </Button>
        )}
        <Button className="large block" onClick={done}>
          Done
        </Button>
      </PhoneShell>
    );
  }

  const sold = info.status === 'sold';
  return (
    <PhoneShell>
      <div className="cx-phone-title">
        <h2>Retailer verification</h2>
        <p>
          Signed in as <RoleBadge role={info.viewer.role} /> {info.viewer.name || ''}
        </p>
      </div>
      <div className="cx-hero-icon">{info.product?.image ? <img src={info.product.image.url} alt="" style={{ width: 76, height: 76, borderRadius: '50%', objectFit: 'cover' }} /> : sold ? <Package size={32} /> : <Store size={32} />}</div>
      <p className="cx-phone-title" style={{ margin: 0, fontWeight: 600 }}>
        {sold ? 'Already sold' : !info.canSell ? 'Retailer QR scanned' : info.isOwnProducer ? 'Your product' : 'Scan by authorised retailer'}
      </p>
      {details}

      {info.scan ? (
        <Notice tone="success">Scan recorded · {fmtDateTime(info.scan.at)}</Notice>
      ) : !info.trackingEnabled && !sold ? (
        <Notice>The producer has tracking off, so this scan isn&apos;t recorded.</Notice>
      ) : null}

      {sold && (
        <div className="cx-unlocked">
          <CheckCircle2 size={26} />
          <div>
            <strong>
              Sold {fmtDate(info.soldAt)} by {info.soldBy?.type === 'producer' ? `${info.soldBy.name} (producer)` : info.soldBy?.name || 'a retailer'}
            </strong>
            <span>The consumer QR is active. A product can be marked sold only once.</span>
          </div>
        </div>
      )}

      <ErrorNote>{error}</ErrorNote>

      {info.canSell && (
        <Button className="large block" onClick={() => setConfirming(true)}>
          Sold
        </Button>
      )}
      {!sold && !info.canSell && (
        <p className="cx-small">
          {info.sellBlocked === 'otherProducer' && info.viewer.role === 'producer'
            ? `This is ${info.producer.name}'s product. You can scan it like a distributor; only ${info.producer.name} or its retailers can mark it sold.`
            : info.sellBlocked === 'otherProducer'
            ? `Your scan is recorded, but only ${info.producer.name} or its retailers can mark this product sold.`
            : info.sellBlocked === 'noProducer'
              ? 'Your retailer account isn’t associated with a producer yet, so you can’t mark products sold. Contact OriginHash.'
              : `As a ${roleLabel(info.viewer.role).toLowerCase()} you can scan this QR. Only ${info.producer.name} or its retailers can mark it sold.`}
        </p>
      )}

      {info.canAddWarranty && (
        <section className="cx-section">
          <h3>Warranty information</h3>
          {addingWarranty ? (
            <WarrantyForm
              uploadEndpoint={uploadEndpointFor(info.viewer.role)}
              onCancel={() => setAddingWarranty(false)}
              onSave={async (body) => {
                const { data } = await connectApi.post(`/qr/r/${token}/warranty`, body);
                setInfo(data);
                setAddingWarranty(false);
              }}
            />
          ) : (
            <>
              <WarrantyList warranties={info.warranties || []} />
              <Button variant="ghost" className="block" onClick={() => setAddingWarranty(true)}>
                Add warranty information
              </Button>
            </>
          )}
        </section>
      )}

      {info.isOwnProducer && (
        <Button variant="ghost" className="block" onClick={() => navigate(`/producer/units/${info.unitId}`)}>
          Open in producer portal
        </Button>
      )}
      <Button variant="ghost" className="block" onClick={done}>
        Done
      </Button>

      {confirming && (
        <Modal
          title="Mark as sold?"
          onClose={() => !selling && setConfirming(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirming(false)} disabled={selling}>
                Cancel
              </Button>
              <Button busy={selling} onClick={sell}>
                Yes, sold
              </Button>
            </>
          }
        >
          <p style={{ margin: 0 }}>
            This records the sale of <strong>{info.product?.name || info.serial}</strong> ({info.serial}) by you and unlocks the consumer QR. It can be done only once.
          </p>
        </Modal>
      )}
    </PhoneShell>
  );
};

export default RetailerQrPage;
