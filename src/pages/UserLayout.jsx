import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import BottomNav, { userMenuItems } from "../components/BottomNav.jsx";
import { MenuButton, MenuDrawer } from "../components/MobileMenu.jsx";
import SideNav from "../components/SideNav.jsx";
import { logout } from "../store/authSlice";
import "../styles/admin.css";
import "../styles/app-shell.css";

// Laptop sidebar: everyday pages first, then products and stickers.
const USER_NAV = [
  [
    { to: "/home", label: "Home", icon: "home", end: true },
    { to: "/scan", label: "Scan", icon: "scan" },
    { to: "/history", label: "History", icon: "history" },
  ],
  [
    { to: "/images", label: "Image stock", icon: "images" },
    { to: "/qr-stickers", label: "Generate QR stickers", icon: "qr" },
    { to: "/bulk-qr", label: "Generate bulk QR stickers", icon: "bulk" },
    { to: "/light-qr", label: "Generate light QR stickers", icon: "light" },
  ],
];
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
    <SideNav className="oh-user-sidebar" groups={USER_NAV} bottom={USER_NAV_BOTTOM} />

    <div className="oh-user-content-col">
      <header className="oh-mobile-topbar">
        <div className="oh-mobile-topbar-brand">
          <MenuButton onClick={openMenu} />
          <span className="oh-mobile-topbar-logo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2c-2.2 0-4 1.8-4 4v1H7a1 1 0 0 0 0 2h1v2H7a1 1 0 0 0 0 2h1v1c0 2.2 1.8 4 4 4s4-1.8 4-4v-1h1a1 1 0 1 0 0-2h-1V9h1a1 1 0 1 0 0-2h-1V6c0-2.2-1.8-4-4-4Z"
                fill="var(--oh-gold)"
              />
            </svg>
          </span>
          OriginHash
        </div>
        <button
          type="button"
          className="oh-mobile-topbar-logout"
          onClick={handleLogout}
          aria-label="Log out"
          title="Log out"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16 17l5-5-5-5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M21 12H9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </header>

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
