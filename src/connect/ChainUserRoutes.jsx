import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronRight, MessageCircle, Package } from 'lucide-react';
import connectApi, { errorText } from './api';
import { useAppUser } from './useChain';
import { Button, Card, Empty, ErrorNote, Loading, Notice, PageHead, RoleBadge, fmtDateTime, placeText, usePoll } from './ui.jsx';
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

const ChainUserRoutes = () => {
  const user = useAppUser();
  const consumer = user && !user.partnerRole && !user.producerId;
  return (
    <Routes>
      <Route path="history" element={<History />} />
      {consumer && <Route path="chats" element={<Chats />} />}
      {consumer && <Route path="chats/:producerId" element={<Chat />} />}
      <Route path="*" element={<Navigate to="/chain/history" replace />} />
    </Routes>
  );
};

export default ChainUserRoutes;
