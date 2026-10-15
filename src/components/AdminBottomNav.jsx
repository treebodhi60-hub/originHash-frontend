import { NavLink } from 'react-router-dom';
import NavIcon from './NavIcons.jsx';
import '../styles/app-shell.css';

// Phones show these four in the bottom bar; the other pages are in the ☰ menu (adminMenuItems).
const items = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/admin/scan', label: 'Scan', icon: 'scan' },
  { to: '/admin/history', label: 'History', icon: 'history' },
  { to: '/admin/profile', label: 'Profile', icon: 'settings' },
];

export const adminMenuItems = [
  { to: '/admin/users', label: 'Users', icon: <NavIcon name="users" /> },
  { to: '/admin/images', label: 'Image stock', icon: <NavIcon name="images" /> },
  { to: '/admin/qr-stickers', label: 'QR stickers', icon: <NavIcon name="qr" /> },
  { to: '/admin/bulk-qr', label: 'Bulk QR stickers', icon: <NavIcon name="bulk" /> },
  { to: '/admin/light-qr', label: 'Light QR stickers', icon: <NavIcon name="light" /> },
];

const AdminBottomNav = () => (
  <nav className="oh-bottom-nav" aria-label="Main">
    {items.map((item) => (
      <NavLink
        key={item.label}
        to={item.to}
        className={({ isActive }) => `oh-nav-item ${isActive ? 'active' : ''}`}
      >
        <NavIcon name={item.icon} />
        <span>{item.label}</span>
      </NavLink>
    ))}
  </nav>
);

export default AdminBottomNav;
