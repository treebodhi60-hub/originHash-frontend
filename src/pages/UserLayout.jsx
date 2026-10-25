import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import BottomNav, { userMenuItems } from "../components/BottomNav.jsx";
import { MenuButton, MenuDrawer } from "../components/MobileMenu.jsx";
import SideNav from "../components/SideNav.jsx";
import TopBar from "../components/TopBar.jsx";
import { LogOut } from "lucide-react";
import BrandLogo from "../components/BrandLogo.jsx";
import { logout } from "../store/authSlice";
import { USER_STICKERS_ENABLED } from "../utils/features";
import "../styles/admin.css";
import "../styles/app-shell.css";

// Laptop sidebar: everyday pages first, then products and stickers.
const USER_NAV = [
  {
    label: "Everyday",
    items: [
      { to: "/home", label: "Home", icon: "home", end: true },
      { to: "/scan", label: "Scan", icon: "scan" },
      { to: "/history", label: "History", icon: "history" },
    ],
  },
  USER_STICKERS_ENABLED && {
    label: "Catalogue & stickers",
    items: [
      { to: "/images", label: "Image stock", icon: "images" },
      { to: "/qr-stickers", label: "QR stickers", hint: "Generate QR stickers", icon: "qr" },
      { to: "/bulk-qr", label: "Bulk QR stickers", hint: "Generate bulk QR stickers", icon: "bulk" },
      { to: "/light-qr", label: "Light QR stickers", hint: "Generate light QR stickers", icon: "light" },
    ],
  },
].filter(Boolean);
const USER_NAV_BOTTOM = [{ to: "/profile", label: "Profile", icon: "person" }];

const UserLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Phone ☰ menu, opened from the top bar (shown, pinned, on every page on phones and tablets).
  const [menuOpen, setMenuOpen] = useState(false);
  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useEffect(() => setMenuOpen(false), [pathname]);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login", { replace: true });
  };

  return (
  <div className="oh-admin-shell oh-user-shell">
    <SideNav className="oh-user-sidebar" groups={USER_NAV} bottom={USER_NAV_BOTTOM} onLogout={handleLogout} />

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

      <TopBar groups={USER_NAV} bottom={USER_NAV_BOTTOM} profileTo="/profile" />

      <main className="oh-admin-main oh-user-main">
        {/* No openMenu for pages: the top bar has the only ☰ button. */}
        <Outlet context={{}} />
      </main>
    </div>

    <BottomNav />
    <MenuDrawer open={menuOpen} onClose={closeMenu} items={userMenuItems} onLogout={handleLogout} />
  </div>
  );
};

export default UserLayout;
