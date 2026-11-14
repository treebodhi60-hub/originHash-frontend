import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import AdminBottomNav, { adminMenuItems } from '../../components/AdminBottomNav.jsx';
import NavIcon from '../../components/NavIcons.jsx';
import { MenuButton, MenuDrawer } from '../../components/MobileMenu.jsx';
import SideNav from '../../components/SideNav.jsx';
import TopBar from '../../components/TopBar.jsx';
import { LogOut } from 'lucide-react';
import BrandLogo from '../../components/BrandLogo.jsx';
import { logout } from '../../store/authSlice';
import '../../styles/admin.css';
import '../../styles/app-shell.css';

// Laptop sidebar: operate, people, catalogue & stickers, then what is still to come.
const ADMIN_NAV = [
  {
    label: 'Operate',
    items: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { to: '/admin/scan', label: 'Scan QR code', icon: 'scan' },
      { to: '/admin/history', label: 'History', icon: 'history' },
    ],
  },
  { label: 'People', items: [{ to: '/admin/users', label: 'Users', icon: 'users' }] },
  {
    label: 'Catalogue & stickers',
    items: [
      { to: '/admin/images', label: 'Image stock', icon: 'images' },
      { to: '/admin/qr-stickers', label: 'QR stickers', hint: 'Generate QR stickers', icon: 'qr' },
      { to: '/admin/bulk-qr', label: 'Bulk QR stickers', hint: 'Generate bulk QR stickers', icon: 'bulk' },
      { to: '/admin/light-qr', label: 'Light QR stickers', hint: 'Generate light QR stickers', icon: 'light' },
    ],
  },
  { label: 'Soon', items: [{ label: 'Coming soon', icon: 'shield', disabled: true }] },
];
// Supply chain: the OriginHash superadmin only.
const CHAIN_NAV = {
  label: 'Supply chain',
  items: [
    { to: '/admin/chain', label: 'Overview', hint: 'Supply chain overview', icon: 'chain', end: true },
    { to: '/admin/chain/batches', label: 'QR batches', hint: 'Retailer + consumer QR batches', icon: 'batches' },
    { to: '/admin/chain/producers', label: 'Producers', icon: 'producer' },
    { to: '/admin/chain/accounts/distributor', label: 'Distributors', icon: 'distributor' },
    { to: '/admin/chain/accounts/retailer', label: 'Retailers', icon: 'retailer' },
    { to: '/admin/chain/accounts/consumer', label: 'Consumers', icon: 'consumer' },
  ],
};
const ADMIN_NAV_BOTTOM = [{ to: '/admin/profile', label: 'Settings / Profile', icon: 'settings' }];

const chainMenuItems = CHAIN_NAV.items.map((i) => ({ to: i.to, label: i.label === 'Overview' ? 'Supply chain' : i.label, icon: <NavIcon name={i.icon} /> }));

const AdminLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isSuperAdmin = useSelector((s) => Boolean(s.auth.user?.isSuperAdmin));
  const nav = isSuperAdmin ? [ADMIN_NAV[0], CHAIN_NAV, ...ADMIN_NAV.slice(1)] : ADMIN_NAV;
  const menuItems = isSuperAdmin ? [...chainMenuItems, ...adminMenuItems] : adminMenuItems;

  // Phone ☰ menu, opened from the top bar (shown, pinned, on every page on phones and tablets).
  const [menuOpen, setMenuOpen] = useState(false);
  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useEffect(() => setMenuOpen(false), [pathname]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  return (
    <div className="oh-admin-shell">
      <SideNav groups={nav} bottom={ADMIN_NAV_BOTTOM} onLogout={handleLogout} />

      <div className="oh-user-content-col">
        <header className="oh-mobile-topbar">
          <div className="oh-mobile-topbar-brand">
            <MenuButton onClick={openMenu} />
            <span className="oh-mobile-topbar-logo">
              <BrandLogo size={14} />
            </span>
            <span className="oh-wordmark">
              Origin<span>Hash</span>
            </span>
          </div>
          <button
            type="button"
            className="oh-mobile-topbar-logout"
            onClick={handleLogout}
            aria-label="Log out"
            title="Log out"
          >
            <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </header>

        <TopBar groups={nav} bottom={ADMIN_NAV_BOTTOM} profileTo="/admin/profile" />

        <main className="oh-admin-main">
          {/* No openMenu for pages: the top bar has the only ☰ button. */}
          <Outlet context={{}} />
        </main>
      </div>

      <AdminBottomNav />
      <MenuDrawer open={menuOpen} onClose={closeMenu} items={menuItems} onLogout={handleLogout} />
    </div>
  );
};

export default AdminLayout;
