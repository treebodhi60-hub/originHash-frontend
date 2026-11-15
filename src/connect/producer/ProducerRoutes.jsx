import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import connectApi, { errorText } from '../api';
import { ProducerContext, isProducerAdmin, useAppUser, useProducer } from '../useChain';
import { Button, Card, Empty, ErrorNote, Input, Loading, Notice, PageHead, Stat, fmtDateTime, num, placeText, useFormError } from '../ui.jsx';
import { DayBars, scanLine } from '../shared.jsx';
import { ProducerProducts, ProductForm } from './ProducerProducts.jsx';
import { ProducerOffers } from './ProducerOffers.jsx';
import { ProducerBatch, ProducerBatches, ProducerUnit } from './ProducerBatches.jsx';
import { ProducerTeam } from './ProducerTeam.jsx';
import { ProducerRetailers } from './ProducerRetailers.jsx';
import { ProducerChats } from './ProducerChats.jsx';

// A producer's pages (admin and staff), inside the app's normal user layout at /producer/*:
// dashboard and analytics, products, offers, QR batches, tracking, warranty, chat, team and
// settings. Lazy-loaded from App.jsx.

const Dashboard = () => {
  const { producer } = useProducer();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    connectApi
      .get('/producer/overview')
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(errorText(err, 'Could not load the dashboard.')));
  }, []);
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Loading />;
  const soldPct = data.units.total ? Math.round((data.units.sold / data.units.total) * 100) : 0;
  return (
    <div className="cx-stack">
      <PageHead eyebrow="Dashboard" title={producer?.name || 'Dashboard'} subtitle="Sales, scans and engagement across your QR batches." />
      {data.chats.unread > 0 && (
        <Notice>
          {data.chats.unread} unread chat message{data.chats.unread === 1 ? '' : 's'}.{' '}
          <Link className="cx-link" to="/producer/chats">
            Open chat
          </Link>
        </Notice>
      )}
      <div className="cx-stats">
        <Stat label="Units sold" value={num(data.units.sold)} note={`${soldPct}% of ${num(data.units.total)} allotted`} />
        <Stat label="Consumer scans" value={num(data.consumerScans)} note={`${num(data.consumers)} signed-in consumers`} />
        <Stat label="Coupons claimed" value={num(data.coupons.claimed)} note={`of ${num(data.coupons.total)} issued`} />
        <Stat label="Warranty records" value={num(data.warranties)} note={`${num(data.tradeScans)} trade scans`} />
      </div>
      <div className="cx-grid-2">
        <Card title="Units sold · last 14 days">
          <DayBars days={data.days} field="sold" label="Units sold" />
        </Card>
        <Card title="Consumer scans · last 14 days">
          <DayBars days={data.days} field="consumerScans" label="Consumer scans" />
        </Card>
      </div>
      <div className="cx-grid-2">
        <Card title="Top retailers">
          {data.topRetailers.length ? (
            <ul className="cx-list">
              {data.topRetailers.map((r) => (
                <li key={r.id}>
                  <span className="cx-cell-main">
                    <strong>{r.name}</strong>
                    <span>{r.city || '—'}</span>
                  </span>
                  <strong>{num(r.sold)} sold</strong>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="No sales yet." />
          )}
        </Card>
        <Card title="Where your QR codes are scanned">
          {data.topPlaces.length ? (
            <ul className="cx-list">
              {data.topPlaces.map((p) => (
                <li key={p.place}>
                  <span>{p.place}</span>
                  <strong>{num(p.scans)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="No locations yet.">Locations appear when people allow their browser to share them.</Empty>
          )}
        </Card>
      </div>
      <Card title="Latest activity">
        {data.recent.length ? (
          <ol className="cx-timeline">
            {data.recent.map((s) => (
              <li key={s.id} className={s.action === 'sold' ? 'sold' : s.qrType === 'consumer' ? 'consumer' : ''}>
                <strong>
                  <Link className="cx-link" to={`/producer/units/${s.unitId}`}>
                    {s.serial}
                  </Link>{' '}
                  · {scanLine(s)}
                </strong>
                <span>
                  {fmtDateTime(s.at)}
                  {s.location ? ` · ${placeText(s.location)}` : ''}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <Empty title="Nothing yet.">Scans and sales show here as your products move.</Empty>
        )}
      </Card>
    </div>
  );
};

const SettingsPage = () => {
  const [notice, setNotice] = useState('');
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useFormError();

  const changePassword = async (e) => {
    e.preventDefault();
    setPwBusy(true);
    setPwError(null);
    try {
      const { data } = await connectApi.post('/producer/password', pw);
      setNotice(data.message);
      setPw({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setPwError(err, 'Could not change the password.');
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div className="cx-stack" style={{ maxWidth: 760 }}>
      <PageHead eyebrow="Company" title="Settings" />
      {notice && <Notice tone="success">{notice}</Notice>}
      <Notice>
        Tracking and Chat with brand are set for each QR batch: open a batch in <Link className="cx-link" to="/producer/batches">QR batches</Link>.
      </Notice>
      <Card title="Your password">
        <form className="cx-form two" onSubmit={changePassword}>
          <Input form={pw} setForm={setPw} name="currentPassword" label="Current password" type="password" autoComplete="current-password" error={pwError.field === 'currentPassword' ? pwError.message : null} />
          <Input form={pw} setForm={setPw} name="newPassword" label="New password" type="password" autoComplete="new-password" hint="At least 8 characters." error={pwError.field === 'newPassword' ? pwError.message : null} />
          {pwError.message && !pwError.field && (
            <div className="cx-field wide">
              <ErrorNote>{pwError.message}</ErrorNote>
            </div>
          )}
          <div className="cx-field wide" style={{ alignItems: 'flex-start' }}>
            <Button type="submit" busy={pwBusy} disabled={!pw.currentPassword || !pw.newPassword}>
              Change password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

// Loads the user's producer for every page below, and keeps non-producers out.
const ProducerRoutes = () => {
  const user = useAppUser();
  const [producer, setProducer] = useState(null);
  const [error, setError] = useState('');
  const refresh = useCallback(() => {
    connectApi
      .get('/producer/me')
      .then(({ data }) => setProducer(data.producer))
      .catch((err) => setError(errorText(err, 'Could not load your producer account.')));
  }, []);
  useEffect(() => {
    if (user?.producerId) refresh();
  }, [user?.producerId, refresh]);
  const value = useMemo(() => ({ producer, refresh }), [producer, refresh]);

  if (!user?.producerId) return <Navigate to="/home" replace />;
  if (error && !producer) return <ErrorNote>{error}</ErrorNote>;
  if (!producer) return <Loading />;
  const canChat = isProducerAdmin(user) || user.canChat;
  return (
    <ProducerContext.Provider value={value}>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<ProducerProducts />} />
        <Route path="products/:id" element={<ProductForm />} />
        <Route path="offers" element={<ProducerOffers />} />
        <Route path="batches" element={<ProducerBatches />} />
        <Route path="batches/:id" element={<ProducerBatch />} />
        <Route path="units/:id" element={<ProducerUnit />} />
        {canChat && <Route path="chats" element={<ProducerChats />} />}
        {canChat && <Route path="chats/:id" element={<ProducerChats />} />}
        {isProducerAdmin(user) && <Route path="team" element={<ProducerTeam />} />}
        <Route path="retailers" element={<ProducerRetailers />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/producer" replace />} />
      </Routes>
    </ProducerContext.Provider>
  );
};

export default ProducerRoutes;
