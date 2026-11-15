import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ChevronRight, MessageCircle, Package } from 'lucide-react';
import connectApi, { errorText } from './api';
import { useAppUser } from './useChain';
import { fetchMe } from '../store/authSlice';
import { Button, Card, Empty, ErrorNote, Field, FileUpload, Input, Loading, Notice, PageHead, RoleBadge, Select, fmtDateTime, placeText, useFormError, usePoll } from './ui.jsx';
import { Conversation } from './producer/ProducerChats.jsx';

// Supply-chain pages for distributors, retailers and consumers, inside the app's normal user layout:
//   /chain/history          the retailer / consumer QR codes they scanned (consumers: their own scans only)
//   /chain/chats            consumers' conversations with brands
//   /chain/chats/:producerId one conversation (started from a consumer QR, ?unit=<token>)

const HistoryItem = ({ h }) => (
  <Link className="cx-history-item" to={`/${h.qrType === 'consumer' ? 'cq' : 'rq'}/${h.token}`}>
    {h.product?.image ? (
      <img src={h.product.image.url} alt="" />
    ) : (
      <span className="cx-product-ph">
        <Package size={20} />
      </span>
    )}
    <div>
      <strong>{h.product?.name || h.producer?.name || 'Product'}</strong>
      <span>
        {h.action === 'sold' ? 'You marked it sold' : h.qrType === 'consumer' ? 'You scanned it' : 'Retailer QR scanned'} · {fmtDateTime(h.at)}
      </span>
      <span>
        {h.producer?.name} · {h.serial}
        {h.location ? ` · ${placeText(h.location)}` : ''}
      </span>
    </div>
    <ChevronRight size={18} color="var(--oh-icon)" />
  </Link>
);

const History = () => {
  const user = useAppUser();
  const [history, setHistory] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    connectApi
      .get('/me/history')
      .then(({ data }) => setHistory(data.history))
      .catch((err) => setError(errorText(err, 'Could not load your history.')));
  }, []);
  const trade = Boolean(user?.partnerRole);
  return (
    <div className="cx-stack" style={{ maxWidth: 760 }}>
      <PageHead
        eyebrow="Supply chain"
        title={trade ? 'My product scans' : 'My products'}
        subtitle={
          trade
            ? 'Retailer QR codes you scanned, and the products you marked sold.'
            : 'Products you checked by scanning their consumer QR. Open one for its details, coupon, warranty and chat.'
        }
        actions={user?.partnerRole && <RoleBadge role={user.partnerRole} />}
      />
      {user?.partnerRole === 'retailer' && <Notice>Scan a product&apos;s retailer QR from the Scan tab to verify it and press Sold.</Notice>}
      <ErrorNote>{error}</ErrorNote>
      {!history ? (
        <Loading />
      ) : history.length ? (
        history.map((h) => <HistoryItem key={h.id} h={h} />)
      ) : (
        <Card>
          <Empty title="Nothing scanned yet.">Scan a product&apos;s QR code from the Scan tab.</Empty>
        </Card>
      )}
    </div>
  );
};

const Chats = () => {
  const [threads, setThreads] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    connectApi
      .get('/me/chats')
      .then(({ data }) => setThreads(data.threads))
      .catch((err) => setError(errorText(err, 'Could not load your chats.')));
  }, []);
  return (
    <div className="cx-stack" style={{ maxWidth: 760 }}>
      <PageHead eyebrow="Supply chain" title="Chats with brands" subtitle="Start a chat from the consumer QR on a product." />
      <ErrorNote>{error}</ErrorNote>
      {!threads ? (
        <Loading />
      ) : threads.length ? (
        threads.map((t) => (
          <Link key={t.id} className="cx-history-item" to={`/chain/chats/${t.producer.id}`}>
            <span className="cx-product-ph">
              <MessageCircle size={20} />
            </span>
            <div>
              <strong>{t.producer.name}</strong>
              <span>{t.lastMessagePreview}</span>
              <span>{fmtDateTime(t.lastMessageAt)}</span>
            </div>
            {t.unread > 0 && <span className="cx-unread">{t.unread}</span>}
          </Link>
        ))
      ) : (
        <Card>
          <Empty title="No chats yet.">Open a product&apos;s consumer QR and choose “Chat with brand”.</Empty>
        </Card>
      )}
    </div>
  );
};

const Chat = () => {
  const { producerId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const unitToken = params.get('unit');
  const [data, setData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const lastId = messages.length ? messages[messages.length - 1].id : 0;

  const load = useCallback(
    (after = 0) =>
      connectApi
        .get(`/me/chats/${producerId}`, { params: { after } })
        .then(({ data: d }) => {
          setData(d);
          setMessages((m) => (after ? [...m, ...d.messages.filter((x) => !m.some((y) => y.id === x.id))] : d.messages));
        })
        .catch((err) => setError(errorText(err, 'Could not load the chat.'))),
    [producerId]
  );
  useEffect(() => {
    load(0);
  }, [load]);
  usePoll(() => load(lastId), 5000, [lastId, load]);

  const send = async (body, image) => {
    const { data: d } = await connectApi.post(`/me/chats/${producerId}/messages`, { body, image, unitToken });
    setMessages((m) => [...m, d.message]);
  };

  return (
    <div className="cx-stack" style={{ maxWidth: 760 }}>
      <PageHead
        eyebrow={<Link to="/chain/chats">Chats with brands</Link>}
        title={data?.producer.name || 'Chat'}
        actions={
          unitToken && (
            <Button variant="ghost" onClick={() => navigate(`/cq/${unitToken}`)}>
              Back to the product
            </Button>
          )
        }
      />
      <ErrorNote>{error}</ErrorNote>
      {!data ? (
        <Loading />
      ) : (
        <Card flush>
          {!data.producer.chatEnabled && <Notice tone="warning">{data.producer.name} isn&apos;t taking chat messages right now.</Notice>}
          <div className="cx-convo">
            <Conversation
              messages={messages}
              mine="consumer"
              onSend={send}
              photoEndpoint="/me/chat-photo"
              disabled={!data.producer.chatEnabled}
              placeholder="Ask the brand anything, or attach a photo…"
            />
          </div>
        </Card>
      )}
    </div>
  );
};

// /chain/retailer — register as a retailer (any ordinary user): they're a general retailer at once,
// and OriginHash's approval links them with a producer. Retailers see which products they can sell.
const RETAILER_BLANK = { name: '', email: '', businessName: '', city: '', address: '', producerId: '', note: '' };
const RetailerAccount = () => {
  const user = useAppUser();
  const dispatch = useDispatch();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(RETAILER_BLANK);
  const [identityDoc, setIdentityDoc] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useFormError();
  const fe = (f) => (error.field === f ? error.message : null);

  const userRef = useRef(user);
  userRef.current = user;
  const load = useCallback(() => {
    connectApi
      .get('/me/retailer-application')
      .then(({ data: d }) => {
        setData(d);
        // Became a retailer (registered, or approved) in this session: refresh the account so the
        // menus show it.
        const u = userRef.current;
        if (d.role === 'retailer' && u && (!u.partnerRole || (u.partnerProducerId ?? null) !== (d.producerId ?? null))) dispatch(fetchMe());
      })
      .catch((err) => setLoadError(errorText(err, 'Could not load your retailer account.')));
  }, [dispatch]);
  useEffect(load, [load]);
  useEffect(() => {
    setForm((f) => ({
      ...f,
      name: f.name || user?.name || '',
      email: f.email || user?.email || '',
      businessName: f.businessName || user?.businessName || '',
      city: f.city || user?.city || '',
      address: f.address || user?.address || '',
    }));
  }, [user]);

  const apply = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data: d } = await connectApi.post('/me/retailer-application', { ...form, identityDoc });
      setNotice(d.message);
      load();
    } catch (err) {
      setError(err, 'Could not send your application.');
    } finally {
      setBusy(false);
    }
  };

  if (loadError) return <ErrorNote>{loadError}</ErrorNote>;
  if (!data) return <Loading />;
  const app = data.application;
  const retailer = data.role === 'retailer';
  const general = retailer && !data.producerName;
  const pending = app?.status === 'pending';
  const showForm = data.canApply && !pending;

  return (
    <div className="cx-stack" style={{ maxWidth: 760 }}>
      <PageHead
        eyebrow="Supply chain"
        title={retailer ? 'Retailer account' : 'Become a retailer'}
        subtitle={
          retailer
            ? 'Scan the retailer QR on a product from the Scan tab; press Sold when you sell it, which unlocks the consumer QR for the buyer.'
            : 'Register as a retailer to press Sold when you sell a product, which unlocks its consumer QR for the buyer. You can start right away as a general retailer; OriginHash then links you with the producer you sell for.'
        }
      />
      {notice && <Notice tone="success">{notice}</Notice>}

      {retailer && !general && (
        <Card>
          <Notice tone="success">
            You are a retailer of <strong>{data.producerName}</strong>: you can mark their products sold. Other producers&apos; retailer QR codes can be scanned but
            not marked sold.
          </Notice>
        </Card>
      )}
      {general && (
        <Card title="General retailer">
          <Notice>
            You can mark sold the products of any batch open to all retailers (the default). Batches limited to a producer&apos;s own retailers can only be
            scanned.
          </Notice>
          {pending && (
            <dl className="cx-dl" style={{ marginTop: 12 }}>
              <dt>Request</dt>
              <dd>Waiting for OriginHash to link you with a producer</dd>
              <dt>Producer asked for</dt>
              <dd>{app.producer?.name || 'Any — OriginHash decides'}</dd>
              <dt>Sent</dt>
              <dd>{fmtDateTime(app.createdAt)}</dd>
            </dl>
          )}
          {app?.status === 'rejected' && (
            <p className="cx-small cx-muted" style={{ marginBottom: 0 }}>
              Your last request wasn&apos;t approved{app.decisionNote ? `: “${app.decisionNote}”` : '.'} You stay a general retailer and can ask again below.
            </p>
          )}
        </Card>
      )}
      {!retailer && !data.canApply && (
        <Card>
          <Notice>Your account can&apos;t register as a retailer.</Notice>
        </Card>
      )}

      {showForm && (
        <form onSubmit={apply}>
          <Card title={general ? 'Ask to be linked with a producer' : 'Your details'}>
            <div className="cx-form two">
              <Input form={form} setForm={setForm} name="name" label="Name" required error={fe('name')} />
              <Input form={form} setForm={setForm} name="email" label="Email" type="email" error={fe('email')} />
              <Input form={form} setForm={setForm} name="businessName" label="Shop / business name" wide error={fe('businessName')} />
              <Input form={form} setForm={setForm} name="city" label="City" required error={fe('city')} />
              <Input form={form} setForm={setForm} name="address" label="Shop address" />
              <Select
                form={form}
                setForm={setForm}
                name="producerId"
                label="Producer whose products you sell"
                wide
                placeholder="Not sure / several — OriginHash decides"
                options={data.producers.map((p) => ({ value: String(p.id), label: p.name }))}
                error={fe('producerId')}
              />
              <Field
                label="Identity document"
                required={!data.identityDoc}
                wide
                hint={
                  data.identityDoc && !identityDoc
                    ? `You already gave ${data.identityDoc.name || 'an ID document'}. Upload a new one only to replace it.`
                    : 'A photo or PDF of your ID (Aadhaar, PAN, driving licence or shop licence), up to 10 MB. Only OriginHash and the producer you’re linked with can see it.'
                }
                error={fe('identityDoc')}
              >
                <FileUpload endpoint="/me/identity" folder="identity" value={identityDoc} onChange={setIdentityDoc} label="Upload ID (image or PDF)" />
              </Field>
              <Input form={form} setForm={setForm} name="note" label="Anything else OriginHash should know" type="textarea" wide hint="e.g. GST number, the brands you sell." />
            </div>
            <p className="cx-small cx-muted">Your mobile number (+91 {user?.mobile}) is your login.</p>
            {error.message && !error.field && <ErrorNote>{error.message}</ErrorNote>}
            <div className="cx-page-actions" style={{ marginTop: 14 }}>
              <Button type="submit" busy={busy}>
                {general ? 'Send request' : 'Register as a retailer'}
              </Button>
            </div>
          </Card>
        </form>
      )}
    </div>
  );
};

const ChainUserRoutes = () => {
  const user = useAppUser();
  // Chat with brand: consumers, retailers and distributors (anyone but producer users).
  const customer = user && !user.producerId;
  return (
    <Routes>
      <Route path="history" element={<History />} />
      {!user?.producerId && user?.partnerRole !== 'distributor' && <Route path="retailer" element={<RetailerAccount />} />}
      {customer && <Route path="chats" element={<Chats />} />}
      {customer && <Route path="chats/:producerId" element={<Chat />} />}}
      <Route path="*" element={<Navigate to="/chain/history" replace />} />
    </Routes>
  );
};

export default ChainUserRoutes;
