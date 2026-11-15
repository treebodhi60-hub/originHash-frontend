import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { ChevronRight, MessageCircle, Package } from 'lucide-react';
import connectApi, { errorText } from './api';
import { useAppUser } from './useChain';
import { fetchMe } from '../store/authSlice';
import { Button, Card, Empty, ErrorNote, Input, Loading, Notice, PageHead, RoleBadge, Select, fmtDateTime, placeText, useFormError, usePoll } from './ui.jsx';
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

  const send = async (body) => {
    const { data: d } = await connectApi.post(`/me/chats/${producerId}/messages`, { body, unitToken });
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
            <Conversation messages={messages} mine="consumer" onSend={send} disabled={!data.producer.chatEnabled} placeholder="Ask the brand anything…" />
          </div>
        </Card>
      )}
    </div>
  );
};

// /chain/retailer — apply to be a retailer (any ordinary user), follow the application, and (once
// approved) see which producer's products they can mark sold.
const RETAILER_BLANK = { businessName: '', city: '', address: '', producerId: '', note: '' };
const RetailerAccount = () => {
  const user = useAppUser();
  const dispatch = useDispatch();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(RETAILER_BLANK);
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
        // Approved since this session started: refresh the account so the menus show it.
        if (d.role === 'retailer' && userRef.current && !userRef.current.partnerRole) dispatch(fetchMe());
      })
      .catch((err) => setLoadError(errorText(err, 'Could not load your retailer account.')));
  }, [dispatch]);
  useEffect(load, [load]);
  useEffect(() => {
    setForm((f) => ({ ...f, businessName: f.businessName || user?.businessName || '', city: f.city || user?.city || '', address: f.address || user?.address || '' }));
  }, [user]);

  const apply = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data: d } = await connectApi.post('/me/retailer-application', form);
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
  const showForm = data.canApply && (!app || app.status === 'rejected');

  return (
    <div className="cx-stack" style={{ maxWidth: 760 }}>
      <PageHead
        eyebrow="Supply chain"
        title={data.role === 'retailer' ? 'Retailer account' : 'Become a retailer'}
        subtitle={
          data.role === 'retailer'
            ? 'You can scan retailer QR codes of any producer, and mark sold the products of the producer you are associated with.'
            : 'Retailers scan the retailer QR on a product and press Sold when they sell it, which unlocks the consumer QR for the buyer. OriginHash approves each retailer and associates them with one producer.'
        }
      />
      {notice && <Notice tone="success">{notice}</Notice>}

      {data.role === 'retailer' ? (
        <Card>
          {data.producerName ? (
            <Notice tone="success">
              You are a retailer of <strong>{data.producerName}</strong>. Scan the retailer QR on their products from the Scan tab and press Sold when you sell one.
              Other producers&apos; retailer QR codes can be scanned but not marked sold.
            </Notice>
          ) : (
            <Notice tone="warning">Your retailer account isn&apos;t associated with a producer yet, so you can&apos;t mark products sold. Contact OriginHash.</Notice>
          )}
        </Card>
      ) : !data.canApply ? (
        <Card>
          <Notice>Your account can&apos;t apply to be a retailer.</Notice>
        </Card>
      ) : (
        <>
          {app?.status === 'pending' && (
            <Card title="Application sent">
              <Notice tone="warning">Waiting for OriginHash to approve it. You&apos;ll get the Sold button once it&apos;s approved.</Notice>
              <dl className="cx-dl" style={{ marginTop: 12 }}>
                <dt>Business</dt>
                <dd>{app.businessName}</dd>
                <dt>City</dt>
                <dd>{app.city || '—'}</dd>
                <dt>Sells for</dt>
                <dd>{app.producer?.name || '—'}</dd>
                <dt>Applied</dt>
                <dd>{fmtDateTime(app.createdAt)}</dd>
              </dl>
            </Card>
          )}
          {app?.status === 'rejected' && (
            <Notice tone="warning">
              Your last application was not approved{app.decisionNote ? `: “${app.decisionNote}”` : '.'} You can apply again below.
            </Notice>
          )}
          {showForm && (
            <form onSubmit={apply}>
              <Card title="Your shop">
                <div className="cx-form two">
                  <Input form={form} setForm={setForm} name="businessName" label="Shop / business name" required wide error={fe('businessName')} />
                  <Select
                    form={form}
                    setForm={setForm}
                    name="producerId"
                    label="Producer whose products you sell"
                    required
                    wide
                    placeholder="Choose the producer"
                    options={data.producers.map((p) => ({ value: String(p.id), label: p.name }))}
                    error={fe('producerId')}
                  />
                  <Input form={form} setForm={setForm} name="city" label="City" required error={fe('city')} />
                  <Input form={form} setForm={setForm} name="address" label="Shop address" />
                  <Input form={form} setForm={setForm} name="note" label="Anything else OriginHash should know" type="textarea" wide hint="e.g. GST number, how long you have sold this brand." />
                </div>
                {error.message && !error.field && <ErrorNote>{error.message}</ErrorNote>}
                <div className="cx-page-actions" style={{ marginTop: 14 }}>
                  <Button type="submit" busy={busy}>
                    Send application
                  </Button>
                </div>
              </Card>
            </form>
          )}
        </>
      )}
    </div>
  );
};

const ChainUserRoutes = () => {
  const user = useAppUser();
  const consumer = user && !user.partnerRole && !user.producerId;
  return (
    <Routes>
      <Route path="history" element={<History />} />
      {!user?.producerId && user?.partnerRole !== 'distributor' && <Route path="retailer" element={<RetailerAccount />} />}
      {consumer && <Route path="chats" element={<Chats />} />}
      {consumer && <Route path="chats/:producerId" element={<Chat />} />}
      <Route path="*" element={<Navigate to="/chain/history" replace />} />
    </Routes>
  );
};

export default ChainUserRoutes;
