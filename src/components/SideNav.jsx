import { useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { LogOut } from 'lucide-react';
import NavIcon from './NavIcons.jsx';
import BrandLogo from './BrandLogo.jsx';

// Laptop sidebar shared by the admin and user shells.
// `groups`: [{ label, items }] — items are { to, label, hint?, icon, end?, disabled? }; `hint` is the full name
// for the tooltip and screen readers when the visible label is shortened. A disabled item is shown
// but does nothing. `bottom` items sit at the foot, above the signed-in account and Log out.
// Wide laptops show labels; narrower ones collapse to an icon rail with tooltips (CSS only).
// One signal marker slides to whichever item is current, so changing page reads as one motion.

const Item = ({ item }) =>
  item.disabled ? (
    <span className="oh-sidebar-item disabled" data-tip={item.hint || item.label} aria-disabled="true" role="link" aria-label={item.hint || item.label}>
      <NavIcon name={item.icon} />
      <span className="oh-sidebar-label">{item.label}</span>
    </span>
  ) : (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) => `oh-sidebar-item ${isActive ? 'active' : ''}`}
      data-tip={item.hint || item.label}
      aria-label={item.hint || item.label}
    >
      <NavIcon name={item.icon} />
      <span className="oh-sidebar-label">{item.label}</span>
    </NavLink>
  );

const roleOf = (user) =>
  user?.isSuperAdmin ? 'Super-admin' : user?.isAdmin ? 'Admin' : user?.userType ? user.userType : 'Member';

const SideNav = ({ groups, bottom = [], onLogout, className = '' }) => {
  const asideRef = useRef(null);
  const { pathname } = useLocation();
  const user = useSelector((s) => s.auth.user);
  const [mark, setMark] = useState({ top: 0, left: 0, width: 0, height: 0, shown: false, animate: false });

  useLayoutEffect(() => {
    const place = (animate) => {
      const active = asideRef.current?.querySelector('.oh-sidebar-item.active');
      setMark((prev) =>
        active
          ? {
              top: active.offsetTop,
              left: active.offsetLeft,
              width: active.offsetWidth,
              height: active.offsetHeight,
              shown: true,
              animate: animate && prev.shown,
            }
          : { ...prev, shown: false, animate: false }
      );
    };
    place(true);
    // The rail/expanded switch and the foot items move with the window; follow without animating.
    const onResize = () => place(false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [pathname]);

  const name = user?.name || user?.username || (user?.mobile ? `+91 ${user.mobile}` : 'Signed in');
  const initial = (user?.name || user?.username || user?.mobile || '?').charAt(0).toUpperCase();

  return (
    <aside ref={asideRef} className={`oh-sidebar ${className}`}>
      <div className="oh-sidebar-brand">
        <span className="oh-sidebar-logo">
          <BrandLogo size={18} />
        </span>
        <span className="oh-wordmark">
          Origin<span>Hash</span>
        </span>
      </div>

      <span
        className={`oh-sidebar-mark ${mark.shown ? 'shown' : ''} ${mark.animate ? 'animate' : ''}`}
        style={{ transform: `translate(${mark.left}px, ${mark.top}px)`, width: mark.width, height: mark.height }}
        aria-hidden="true"
      />

      <nav className="oh-sidebar-nav" aria-label="Main">
        {groups.map((group) => (
          <div className="oh-sidebar-group" key={group.label}>
            <span className="oh-sidebar-group-label">{group.label}</span>
            {group.items.map((item) => (
              <Item key={item.label} item={item} />
            ))}
          </div>
        ))}
      </nav>

      <div className="oh-sidebar-bottom">
        {bottom.map((item) => (
          <Item key={item.label} item={item} />
        ))}
        {onLogout && (
          <div className="oh-sidebar-account">
            <span className="oh-sidebar-avatar" aria-hidden="true">
              {user?.photoUrl ? <img src={user.photoUrl} alt="" /> : initial}
            </span>
            <span className="oh-sidebar-who">
              <span className="oh-sidebar-name">{name}</span>
              <span className="oh-sidebar-role">{roleOf(user)}</span>
            </span>
            <button type="button" className="oh-sidebar-logout" onClick={onLogout} aria-label="Log out" data-tip="Log out">
              <LogOut size={17} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default SideNav;
