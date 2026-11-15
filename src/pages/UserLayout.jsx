import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import BottomNav, { userMenuItems } from "../components/BottomNav.jsx";
import { MenuButton, MenuDrawer } from "../components/MobileMenu.jsx";
import SideNav from "../components/SideNav.jsx";
import NavIcon from "../components/NavIcons.jsx";
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

// Supply chain: a producer's admin and staff get their producer pages; everyone else their scanned
// products (and, for consumers, chats with brands).
export const chainNavFor = (user) => {
  if (!user) return null;
  if (user.producerId) {
    const admin = user.producerRole === "admin";
    return {
      label: "Producer",
      items: [
        { to: "/producer", label: "Dashboard", hint: "Producer dashboard", icon: "dashboard", end: true },
        { to: "/producer/products", label: "Products", icon: "product" },
        { to: "/producer/offers", label: "Discounts", hint: "Discounts & loyalty", icon: "offer" },
        { to: "/producer/batches", label: "QR batches", icon: "batches" },
        { to: "/history", label: "History", hint: "Supply chain history", icon: "history" },
        { to: "/producer/retailers", label: "Retailers", icon: "retailer" },
        ...(admin || user.canChat ? [{ to: "/producer/chats", label: "Chat", hint: "Chat with brand", icon: "chat" }] : []),
        // Team: the producer admin only (the superadmin sees teams in the console).
        ...(admin ? [{ to: "/producer/team", label: "Team", icon: "users" }] : []),
        { to: "/producer/settings", label: "Settings", hint: "Producer settings", icon: "settings" },
      ],
    };
  }
  return {
    label: "Supply chain",
    items: [
      // Distributors and retailers see their scans under History.
      ...(user.partnerRole ? [] : [{ to: "/chain/history", label: "My products", icon: "product" }]),
      { to: "/chain/chats", label: "Brand chats", hint: "Chats with brands", icon: "chat" },
      // Anyone not yet in the trade can apply to be a retailer; retailers see their account.
      ...(user.partnerRole === "distributor"
        ? []
        : [{ to: "/chain/retailer", label: user.partnerRole === "retailer" ? "Retailer account" : "Become a retailer", icon: "retailer" }]),
    ],
  };
};

const UserLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const user = useSelector((s) => s.auth.user);
  const chainNav = chainNavFor(user);
  // Producer users have no Home tab (their Dashboard is their home), and History sits in their
  // Producer group.
  const userNav = user?.producerId
    ? USER_NAV.map((g, i) => (i === 0 ? { ...g, items: g.items.filter((item) => item.to !== "/home" && item.to !== "/history") } : g))
    : USER_NAV;
  const groups = chainNav ? (user?.producerId ? [chainNav, ...userNav] : [userNav[0], chainNav, ...userNav.slice(1)]) : userNav;
  const menuItems = [
    ...(chainNav ? chainNav.items.map((i) => ({ to: i.to, label: i.hint || i.label, icon: <NavIcon name={i.icon} /> })) : []),
    ...userMenuItems,
  ];

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
    <SideNav className="oh-user-sidebar" groups={groups} bottom={USER_NAV_BOTTOM} onLogout={handleLogout} />

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

      <TopBar groups={groups} bottom={USER_NAV_BOTTOM} profileTo="/profile" />

      <main className="oh-admin-main oh-user-main">
        {/* No openMenu for pages: the top bar has the only ☰ button. */}
        <Outlet context={{}} />
      </main>
    </div>

    <BottomNav />
    <MenuDrawer open={menuOpen} onClose={closeMenu} items={menuItems} onLogout={handleLogout} />
  </div>
  );
};

export default UserLayout;
