import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import connectApi, { CHAIN_ADMIN, errorText } from '../api';
import { useAppUser } from '../useChain';
import { Card, ErrorNote, Loading, Notice, PageHead, Stat, num } from '../ui.jsx';
import { HqProducer, HqProducers } from './HqProducers.jsx';
import { HqBatch, HqBatches } from './HqBatches.jsx';
import { HqAccounts } from './HqAccounts.jsx';
import ProducerHistory from '../producer/ProducerHistory.jsx';

// The OriginHash superadmin's supply-chain pages, inside the admin panel at /admin/chain/*.
// Lazy-loaded from App.jsx; other admins are sent back to the panel.

const Overview = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    connectApi
      .get('/admin/overview')
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(errorText(err, 'Could not load the overview.')));
  }, []);
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Loading />;
  return (
    <div className="cx-stack">
      <PageHead eyebrow="Supply chain" title="Supply chain" subtitle="Producers, the trade, and every retailer + consumer QR pair OriginHash has allotted." />
      {data.pendingRequests > 0 && (
        <Notice tone="warning">
          {data.pendingRequests} batch request{data.pendingRequests === 1 ? '' : 's'} waiting for allotment.{' '}
          <Link className="cx-link" to={`${CHAIN_ADMIN}/batches`}>
            Review
          </Link>
        </Notice>
      )}
      {data.pendingRetailers > 0 && (
        <Notice tone="warning">
          {data.pendingRetailers} retailer application{data.pendingRetailers === 1 ? '' : 's'} waiting for approval.{' '}
          <Link className="cx-link" to={`${CHAIN_ADMIN}/accounts/retailer`}>
            Review
          </Link>
        </Notice>
      )}
      <div className="cx-stats">
        <Stat label="Producers" value={num(data.producers)} />
        <Stat label="Batches allotted" value={num(data.batches)} />
        <Stat label="Units (QR pairs)" value={num(data.units)} note={`${num(data.units * 2)} QR codes`} />
        <Stat label="Units sold" value={num(data.sold)} />
      </div>
      <div className="cx-stats">
        <Stat label="Distributors" value={num(data.accounts.distributor)} />
        <Stat label="Retailers" value={num(data.accounts.retailer)} />
        <Stat label="Consumers" value={num(data.accounts.consumer)} note="All app customers" />
        <Stat label="Pending requests" value={num(data.pendingRequests)} />
      </div>
      <Card title="How it works">
        <ol className="cx-muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
          <li>Register a producer (company, categories, verification document) with its admin login; they sign in on the normal login page with that username and password.</li>
          <li>Add distributors and retailers by mobile number (they sign in with OTP as usual), or approve retailers who apply themselves. Each retailer is associated with one producer.</li>
          <li>The producer adds products and requests a batch; allot it with a max discount and an expiry date.</li>
          <li>Print the retailer + consumer QR pairs. Distributors and retailers scan the retailer QR along the way.</li>
          <li>
            The producer itself, a retailer (any retailer, unless the batch is limited to the producer’s own), or you presses Sold once; that unlocks the consumer QR with its
            unique coupon. Other producers can only scan it, like a distributor.
          </li>
        </ol>
      </Card>
    </div>
  );
};

const HqRoutes = () => {
  const user = useAppUser();
  if (!user?.isSuperAdmin) return <Navigate to="/admin/users" replace />;
  return (
    <Routes>
      <Route index element={<Overview />} />
      <Route path="producers" element={<HqProducers />} />
      <Route path="producers/:id" element={<HqProducer />} />
      <Route path="accounts/:role" element={<HqAccounts />} />
      <Route path="batches" element={<HqBatches />} />
      <Route path="batches/:id" element={<HqBatch />} />
      <Route path="history" element={<ProducerHistory scope="admin" />} />
      <Route path="*" element={<Navigate to={CHAIN_ADMIN} replace />} />
    </Routes>
  );
};

export default HqRoutes;
