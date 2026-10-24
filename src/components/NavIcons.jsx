import {
  ClipboardClock,
  Images,
  Layers,
  LayoutGrid,
  QrCode,
  ScanLine,
  Settings2,
  ShieldCheck,
  SquareUserRound,
  House,
  UsersRound,
  Zap,
} from 'lucide-react';

// One icon set for every navigation surface (sidebar, phone bottom bar, ☰ menu): Lucide, drawn at
// 20px with one stroke weight, so the icons read as a family.
const ICONS = {
  home: House,
  dashboard: LayoutGrid,
  scan: ScanLine,
  history: ClipboardClock,
  users: UsersRound,
  images: Images,
  qr: QrCode,
  bulk: Layers,
  light: Zap,
  shield: ShieldCheck,
  person: SquareUserRound,
  settings: Settings2,
};

const NavIcon = ({ name, size = 20 }) => {
  const Icon = ICONS[name] || LayoutGrid;
  return <Icon size={size} strokeWidth={1.75} aria-hidden="true" focusable="false" />;
};

export default NavIcon;
