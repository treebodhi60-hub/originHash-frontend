import { createContext, useContext } from 'react';
import { useSelector } from 'react-redux';
import { CHAIN_ADMIN } from './api';

// Who is signed in, for the supply-chain pages: the app's own account (redux auth).
export const useAppUser = () => useSelector((s) => (s.auth.token ? s.auth.user : null));

// Where each kind of account starts.
export const homeOf = (user) => {
  if (!user) return '/login';
  if (user.isSuperAdmin) return CHAIN_ADMIN;
  if (user.isAdmin) return '/admin/users';
  if (user.producerId) return '/producer';
  return '/home';
};

export const isProducerAdmin = (user) => user?.producerRole === 'admin';

// The producer company of a producer user, loaded once by the producer pages.
export const ProducerContext = createContext({ producer: null, refresh: () => {} });
export const useProducer = () => useContext(ProducerContext);
