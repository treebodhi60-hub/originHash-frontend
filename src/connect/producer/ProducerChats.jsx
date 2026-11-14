import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import connectApi, { errorText } from '../api';
import { isProducerAdmin, useAppUser } from '../useChain';
import { Button, Card, Empty, ErrorNote, Loading, Notice, PageHead, fmtDateTime, usePoll } from '../ui.jsx';

// Producer: "Chat with brand" — consumers' conversations. New messages arrive by polling.

export const Conversation = ({ messages, mine, onSend, disabled, placeholder = 'Write a reply…' }) => {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);
  const send = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    setError('');
    try {
      await onSend(draft.trim());
      setDraft('');
    } catch (err) {
      setError(errorText(err, 'Could not send.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="cx-messages">
        {messages.length ? (
          messages.map((m) => (
            <div key={m.id} className={`cx-msg ${m.from === mine ? 'mine' : ''}`}>
              {m.body}
              <small>
                {m.from === 'producer' && m.sender ? `${m.sender} · ` : ''}
                {fmtDateTime(m.at)}
              </small>
            </div>
          ))
        ) : (
          <Empty title="No messages yet." />
        )}
        <span ref={endRef} />
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      <form className="cx-compose" onSubmit={send}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) send(e);
          }}
          placeholder={disabled ? 'Chat is switched off.' : placeholder}
          disabled={disabled}
          maxLength={2000}
          aria-label="Message"
        />
        <Button type="submit" busy={busy} disabled={disabled || !draft.trim()}>
          Send
        </Button>
      </form>
    </>
  );
};

export const ProducerChats = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isAdmin = isProducerAdmin(useAppUser());
  const [threads, setThreads] = useState(null);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [current, setCurrent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [team, setTeam] = useState([]);
  const [error, setError] = useState('');

  const loadThreads = useCallback(() => {
    connectApi
      .get('/producer/chats')
      .then(({ data }) => {
        setThreads(data.threads);
        setChatEnabled(data.chatEnabled);
      })
      .catch((err) => setError(errorText(err, 'Could not load conversations.')));
  }, []);
  useEffect(loadThreads, [loadThreads]);
  useEffect(() => {
    if (isAdmin) connectApi.get('/producer/users').then(({ data }) => setTeam(data.users.filter((u) => u.canChat && !u.isBlocked))).catch(() => {});
  }, [isAdmin]);

  const lastId = messages.length ? messages[messages.length - 1].id : 0;
  const loadMessages = useCallback(
    (after = 0) => {
      if (!id) return;
      connectApi
        .get(`/producer/chats/${id}`, { params: { after } })
        .then(({ data }) => {
          setCurrent(data.thread);
          setMessages((m) => (after ? [...m, ...data.messages.filter((x) => !m.some((y) => y.id === x.id))] : data.messages));
        })
        .catch((err) => setError(errorText(err, 'Could not load the conversation.')));
    },
    [id]
  );
  useEffect(() => {
    setMessages([]);
    setCurrent(null);
    loadMessages(0);
  }, [loadMessages]);
  usePoll(
    () => {
      loadThreads();
      if (id) loadMessages(lastId);
    },
    6000,
    [id, lastId]
  );

  const send = async (body) => {
    const { data } = await connectApi.post(`/producer/chats/${id}/messages`, { body });
    setMessages((m) => [...m, data.message]);
    loadThreads();
  };

  const assign = async (userId) => {
    try {
      const { data } = await connectApi.put(`/producer/chats/${id}/assign`, { userId: userId || null });
      setCurrent(data.thread);
      loadThreads();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <div className="cx-stack">
      <PageHead eyebrow="Consumers" title="Chat with brand" subtitle="Consumers write from a product's consumer QR. Replies show in their app." />
      {!chatEnabled && <Notice tone="warning">Chat is switched off in Settings: consumers can&apos;t send new messages.</Notice>}
      <ErrorNote>{error}</ErrorNote>
      <Card flush>
        {!threads ? (
          <Loading />
        ) : (
          <div className="cx-chat">
            <div className="cx-chat-list" style={id ? undefined : { borderRight: 'none' }}>
              {threads.length ? (
                threads.map((t) => (
                  <button key={t.id} type="button" className={String(t.id) === id ? 'active' : ''} onClick={() => navigate(`/producer/chats/${t.id}`)}>
                    <span className="row">
                      <strong>{t.consumer.name}</strong>
                      {t.unread > 0 && <span className="cx-unread">{t.unread}</span>}
                    </span>
                    <span>{t.lastMessagePreview}</span>
                    <span>
                      {t.unit?.productName ? `${t.unit.productName} · ` : ''}
                      {fmtDateTime(t.lastMessageAt)}
                    </span>
                  </button>
                ))
              ) : (
                <Empty title="No conversations yet." />
              )}
            </div>
            <div className="cx-convo">
              {id && current ? (
                <>
                  <div className="cx-convo-head">
                    <div className="cx-cell-main">
                      <strong>{current.consumer.name}</strong>
                      <span>
                        {current.consumer.mobile}
                        {current.consumer.city ? ` · ${current.consumer.city}` : ''}
                        {current.unit ? ` · ${current.unit.productName || ''} ${current.unit.serial}` : ''}
                      </span>
                    </div>
                    {isAdmin && (
                      <select className="cx-input" style={{ width: 'auto' }} value={current.assignee?.id || ''} onChange={(e) => assign(e.target.value)} aria-label="Assigned to">
                        <option value="">Unassigned (all chat staff)</option>
                        {team.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name || u.username}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <Conversation messages={messages} mine="producer" onSend={send} />
                </>
              ) : (
                <Empty title={id ? 'Loading…' : 'Choose a conversation.'} />
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
