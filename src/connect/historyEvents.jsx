import { CheckIcon, PinIcon, QrIcon, ShieldIcon, UserIcon } from '../components/ScanIcons.jsx';
import { roleLabel } from './ui.jsx';

// How a supply-chain history entry (GET /producer/history) reads: its event chip, what happened,
// and who did it. Shared by the producer's History tab and Scan / Home page.

// `short` is for narrow places (phone cards). `homeTone` maps to the home page's tones.
export const eventOf = (h, size = 18) => {
  if (h.action === 'sold') return { label: 'Sold', short: 'Sold', tone: 'success', homeTone: 'success', icon: <CheckIcon size={size} /> };
  if (h.qrType === 'consumer') return { label: 'Consumer scan', short: 'Consumer', tone: 'info', homeTone: 'neutral', icon: <UserIcon size={size} /> };
  if (h.actorType === 'retailer') return { label: 'Retailer scan', short: 'Retailer', tone: 'muted', homeTone: 'muted', icon: <PinIcon size={size} /> };
  if (h.actorType === 'distributor') return { label: 'Distributor scan', short: 'Distrib.', tone: 'muted', homeTone: 'muted', icon: <PinIcon size={size} /> };
  // Another producer scanning the QR counts as the trade (distributor-level access).
  if (h.actorType === 'producer' && h.ownTeam === false) return { label: 'Producer scan', short: 'Producer', tone: 'muted', homeTone: 'muted', icon: <PinIcon size={size} /> };
  if (h.actorType === 'producer') return { label: 'Team scan', short: 'Team', tone: 'muted', homeTone: 'muted', icon: <ShieldIcon size={size} /> };
  if (h.actorType === 'admin') return { label: 'OriginHash scan', short: 'Admin', tone: 'muted', homeTone: 'muted', icon: <ShieldIcon size={size} /> };
  return { label: 'Retailer QR opened', short: 'Opened', tone: 'muted', homeTone: 'muted', icon: <QrIcon size={size} /> };
};

export const whatHappened = (h) => {
  if (h.action === 'sold') return 'Marked sold';
  if (h.qrType === 'consumer') return h.actorType === 'consumer' ? 'Consumer QR scanned' : `Consumer QR scanned by a ${roleLabel(h.actorType).toLowerCase()}`;
  return 'Retailer QR scanned';
};

export const byText = (h) => (h.isYou ? 'You' : h.by?.name || roleLabel(h.actorType));

export const bySub = (h) => {
  const role = h.actorType === 'producer' ? (h.ownTeam === false ? 'Another producer' : 'Producer team') : roleLabel(h.actorType);
  return [role !== byText(h) ? role : null, h.by?.city].filter(Boolean).join(' · ');
};
