import { useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import NavIcon from './NavIcons.jsx';

// Laptop sidebar shared by the admin and user shells.
// `groups` is a list of item lists (a quiet divider sits between groups); `bottom` is pinned to the foot.
// Items: { to, label, icon, end?, disabled? }. A disabled item is shown but does nothing.
// One gold indicator slides to whichever item is current, so moving between pages reads as one motion.

const Item = ({ item }) =>
  item.disabled ? (
    <span className="oh-sidebar-item disabled" data-tip={item.label} aria-disabled="true" role="link" aria-label={item.label}>
      <NavIcon name={item.icon} />
    </span>
  ) : (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) => `oh-sidebar-item ${isActive ? 'active' : ''}`}
      data-tip={item.label}
      aria-label={item.label}
    >
      <NavIcon name={item.icon} />
    </NavLink>
  );

const Logo = () => (
  <div className="oh-sidebar-logo" role="img" aria-label="OriginHash">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2c-2.2 0-4 1.8-4 4v1H7a1 1 0 0 0 0 2h1v2H7a1 1 0 0 0 0 2h1v1c0 2.2 1.8 4 4 4s4-1.8 4-4v-1h1a1 1 0 1 0 0-2h-1V9h1a1 1 0 1 0 0-2h-1V6c0-2.2-1.8-4-4-4Z"
        fill="var(--oh-gold)"
      />
    </svg>
  </div>
);

const SideNav = ({ groups, bottom = [], className = '' }) => {
  const asideRef = useRef(null);
  const { pathname } = useLocation();
  const [mark, setMark] = useState({ top: 0, shown: false, animate: false });

  useLayoutEffect(() => {
    const place = (animate) => {
      const active = asideRef.current?.querySelector('.oh-sidebar-item.active');
      setMark((prev) =>
        active
          ? { top: active.offsetTop, shown: true, animate: animate && prev.shown }
          : { ...prev, shown: false, animate: false }
      );
    };
    place(true);
    // The foot item moves with the window height; follow it without animating.
    const onResize = () => place(false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [pathname]);

  return (
    <aside ref={asideRef} className={`oh-sidebar ${className}`}>
      <Logo />
      <span
        className={`oh-sidebar-mark ${mark.shown ? 'shown' : ''} ${mark.animate ? 'animate' : ''}`}
        style={{ transform: `translateY(${mark.top}px)` }}
        aria-hidden="true"
      />
      <nav className="oh-sidebar-nav" aria-label="Main">
        {groups.map((group, i) => (
          <div className="oh-sidebar-group" key={i}>
            {group.map((item) => (
              <Item key={item.label} item={item} />
            ))}
          </div>
        ))}
      </nav>
      {bottom.length > 0 && (
        <div className="oh-sidebar-bottom">
          {bottom.map((item) => (
            <Item key={item.label} item={item} />
          ))}
        </div>
      )}
    </aside>
  );
};

export default SideNav;
