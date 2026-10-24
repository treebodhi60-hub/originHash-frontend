import {
  ArrowLeft,
  Box,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Eye,
  Flag,
  Flashlight,
  House,
  Image,
  Keyboard,
  Map,
  MapPin,
  OctagonAlert,
  QrCode,
  Search,
  Share2,
  ShieldCheck,
  TriangleAlert,
  Undo2,
  UserRound,
  X,
} from 'lucide-react';

// The scan screens' icons: Lucide at one stroke weight, sized by `size` (default 20) and drawn in
// currentColor so each takes the colour of the text or chip it sits in.
const make = (Icon, strokeWidth = 1.75) => {
  const Wrapped = ({ size = 20 }) => <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" focusable="false" />;
  return Wrapped;
};

export const ShieldIcon = make(ShieldCheck);
export const QrIcon = make(QrCode);
export const CheckIcon = make(Check, 2.25);
export const CrossIcon = make(X, 2.25);
export const AlertIcon = make(CircleAlert);
export const BoxIcon = make(Box);
export const ChevronRightIcon = make(ChevronRight);
export const ArrowLeftIcon = make(ArrowLeft);
export const FlashIcon = make(Flashlight);
export const ImageIcon = make(Image);
export const KeyboardIcon = make(Keyboard);
export const HomeIcon = make(House);
export const EyeIcon = make(Eye);
export const WarningIcon = make(TriangleAlert);
export const UndoIcon = make(Undo2);
export const CameraIcon = make(Camera);
export const FlagIcon = make(Flag);
export const PinIcon = make(MapPin);
export const UserIcon = make(UserRound);
export const ShareIcon = make(Share2);
export const MapIcon = make(Map);
export const DangerIcon = make(OctagonAlert);
export const ChevronLeftIcon = make(ChevronLeft);
export const SearchIcon = make(Search);
