import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import connectApi, { errorText } from '../api';
import { isProducerAdmin, useAppUser } from '../useChain';
import { ImagePlus, X } from 'lucide-react';
import { Spinner } from '../../components/Loader.jsx';
import { Badge, Button, Card, Empty, ErrorNote, Loading, Notice, PageHead, fmtDateTime, roleLabel, usePoll } from '../ui.jsx';

// Producer: "Chat with brand" — consumers' conversations. New messages arrive by polling.

// A chat: the messages (text and / or a photo) and the box to write one. `onSend(body, image)`;
// `photoEndpoint` is where an attached photo is uploaded first (POST multipart file → { file }).
export const Conversation = ({ messages, mine, onSend, disabled, photoEndpoint, placeholder = 'Write a reply…' }) => {
  const [draft, setDraft] = useState('');
  const [photo, setPhoto] = useState(null); // { ref, url, name } once uploaded
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const fileRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);
  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Only photos can be sent in chat.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      const { data } = await connectApi.post(photoEndpoint, body);
      setPhoto(data.file);
    } catch (err) {
      setError(errorText(err, 'Could not upload the photo.'));
    } finally {
      setUploading(false);
    }
  };
  const send = async (e) => {
    e.preventDefault();
    if (!draft.trim() && !photo) return;
    setBusy(true);
    setError('');
    try {
      await onSend(draft.trim(), photo);
      setDraft('');
      setPhoto(null);
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
              {m.image && (
                <a className="cx-msg-photo" href={m.image.url} target="_blank" rel="noreferrer">
                  <img src={m.image.url} alt={m.image.name || 'Photo'} loading="lazy" />
                </a>
              )}
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
      {photo && (
        <div className="cx-compose-photo">
          <img src={photo.url} alt="" />
          <span>{photo.name || 'Photo'}</span>
          <button type="button" className="cx-icon-btn" onClick={() => setPhoto(null)} aria-label="Remove photo">
            <X size={14} />
          </button>
        </div>
      )}
      <form className="cx-compose" onSubmit={send}>
        {photoEndpoint && (
          <>
            <button
              type="button"
              className="cx-icon-btn cx-compose-attach"
              onClick={() => fileRef.current?.click()}
              disabled={disabled || uploading || busy}
              aria-label="Attach a photo"
              title="Attach a photo"
            >
              {uploading ? <Spinner className="solo" /> : <ImagePlus size={20} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickPhoto} />
          </>
        )}
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
        <Button type="submit" busy={busy} disabled={disabled || uploading || (!draft.trim() && !photo)}>
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

  const send = async (body, image) => {
    const { data } = await connectApi.post(`/producer/chats/${id}/messages`, { body, image });
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
                      <strong>
                        {t.consumer.name}
                        {t.consumer.role && t.consumer.role !== 'consumer' && <span className="cx-muted"> · {roleLabel(t.consumer.role)}</span>}
                      </strong>
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
                      <strong>
                        {current.consumer.name} {current.consumer.role && current.consumer.role !== 'consumer' && <Badge tone={`role-${current.consumer.role}`}>{roleLabel(current.consumer.role)}</Badge>}
                      </strong>
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
                  <Conversation messages={messages} mine="producer" onSend={send} photoEndpoint="/producer/chat-photo" />
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
