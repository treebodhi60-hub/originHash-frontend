import {
  Activity,
  ArrowRight,
  Ban,
  CalendarDays,
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock,
  Crown,
  Factory,
  Folder,
  Image,
  Layers,
  Leaf,
  QrCode,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Store,
  TrendingUp,
  Truck,
  UserRound,
  UsersRound,
} from 'lucide-react';

// Line icons for the admin dashboard: Lucide at one stroke weight, drawn in currentColor so each
// one takes the colour of the chip or text it sits in.
const make = (Icon) => {
  const Wrapped = ({ size = 20 }) => <Icon size={size} strokeWidth={1.75} aria-hidden="true" focusable="false" />;
  return Wrapped;
};

export const UsersIcon = make(UsersRound);
export const UserIcon = make(UserRound);
export const QrIcon = make(QrCode);
export const ScanIcon = make(ScanLine);
export const ImageIcon = make(Image);
export const FolderIcon = make(Folder);
export const LayersIcon = make(Layers);
export const ShieldCheckIcon = make(ShieldCheck);
export const CrownIcon = make(Crown);
export const ActivityIcon = make(Activity);
export const CheckCircleIcon = make(CircleCheck);
export const XCircleIcon = make(CircleX);
export const AlertIcon = make(CircleAlert);
export const ClockIcon = make(Clock);
export const BanIcon = make(Ban);
export const LeafIcon = make(Leaf);
export const FactoryIcon = make(Factory);
export const TruckIcon = make(Truck);
export const StoreIcon = make(Store);
export const ArrowRightIcon = make(ArrowRight);
export const TrendUpIcon = make(TrendingUp);
export const RefreshIcon = make(RefreshCw);
export const CalendarIcon = make(CalendarDays);
