import { Suspense, lazy } from 'react';
import { Route } from 'react-router-dom';
import { LoadingState } from '../components/Loader.jsx';
import { SUPERADMIN_LOGIN_PATH } from './api';

// Routes of the supply-chain module, placed inside App.jsx's existing routes and layouts. Each
// group loads on demand, so the main bundle doesn't grow.

const SuperAdminLogin = lazy(() => import('../pages/SuperAdminLogin.jsx'));
const RetailerQrPage = lazy(() => import('./qr/RetailerQrPage.jsx'));
const ConsumerQrPage = lazy(() => import('./qr/ConsumerQrPage.jsx'));
const HqRoutes = lazy(() => import('./hq/HqRoutes.jsx'));
const ProducerRoutes = lazy(() => import('./producer/ProducerRoutes.jsx'));
const ChainUserRoutes = lazy(() => import('./ChainUserRoutes.jsx'));

const load = (element) => <Suspense fallback={<LoadingState className="oh-empty-state" label="Loading…" />}>{element}</Suspense>;

// Public: the superadmin's own login, and what the two QR codes of a unit open.
export const chainPublicRoutes = () => [
  <Route key="cx-hq-login" path={SUPERADMIN_LOGIN_PATH} element={load(<SuperAdminLogin />)} />,
  <Route key="cx-rq" path="/rq/:token" element={load(<RetailerQrPage />)} />,
  <Route key="cx-cq" path="/cq/:token" element={load(<ConsumerQrPage />)} />,
];

// Inside the admin panel (/admin): the superadmin's supply-chain pages.
export const chainAdminRoutes = () => [<Route key="cx-admin" path="chain/*" element={load(<HqRoutes />)} />];

// Inside the user layout: producer users' pages, and distributors' / retailers' / consumers' pages.
export const chainUserRoutes = () => [
  <Route key="cx-producer" path="/producer/*" element={load(<ProducerRoutes />)} />,
  <Route key="cx-chain" path="/chain/*" element={load(<ChainUserRoutes />)} />,
];
