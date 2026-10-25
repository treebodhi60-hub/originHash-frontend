import { NavLink } from 'react-router-dom';
import NavIcon from './NavIcons.jsx';
import { USER_STICKERS_ENABLED } from '../utils/features';
import '../styles/app-shell.css';

// Phones show these four in the bottom bar; the other pages are in the ☰ menu (userMenuItems).
const items = [
  { to: '/home', label: 'Home', icon: 'home' },
  { to: '/scan', label: 'Scan', icon: 'scan' },
  { to: '/history', label: 'History', icon: 'history' },
  { to: '/profile', label: 'Profile', icon: 'person' },
];

export const userMenuItems = USER_STICKERS_ENABLED
  ? [
      { to: '/images', label: 'Image stock', icon: <NavIcon name="images" /> },
      { to: '/qr-stickers', label: 'QR stickers', icon: <NavIcon name="qr" /> },
      { to: '/bulk-qr', label: 'Bulk QR stickers', icon: <NavIcon name="bulk" /> },
      { to: '/light-qr', label: 'Light QR stickers', icon: <NavIcon name="light" /> },
    ]
  : [];

const BottomNav = () => (
  <nav className="oh-bottom-nav" aria-label="Main">
    {items.map((item) => (
      <NavLink
        key={item.label}
        to={item.disabled ? '#' : item.to}
        onClick={(e) => item.disabled && e.preventDefault()}
        className={({ isActive }) => `oh-nav-item ${isActive && !item.disabled ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`}
      >
        <NavIcon name={item.icon} />
        <span>{item.label}</span>
      </NavLink>
    ))}
  </nav>
);

export default BottomNav;
