import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Laptop top bar: where you are (section / page / detail) and the signed-in account, which opens
// the profile. Built from the same nav groups as the sidebar, so it never names a page the role
// can't open. Phones keep their own top bar (layouts) instead.

// Deeper pages that aren't in the nav, by the path segment after their section.
const DETAIL_LABELS = [
  [/\/scan\/camera$/, 'Scanner'],
  [/\/scan\/compare$/, 'Compare image'],
  [/\/scan\/result$/, 'Result'],
  [/\/history\/[^/]+$/, 'Scan details'],
  [/\/journey\/[^/]+$/, 'Product journey'],
  [/\/users\/[^/]+$/, 'User activity'],
  [/\/bulk-qr\/[^/]+$/, 'Batch'],
  [/\/light-qr\/[^/]+$/, 'Batch'],
];

// The nav item this path belongs to: the longest `to` that is the path or a parent of it.
const findItem = (groups, pathname) => {
  let best = null;
  groups.forEach((group) =>
    group.items.forEach((item) => {
      if (!item.to || item.disabled) return;
      const hit = pathname === item.to || pathname.startsWith(`${item.to}/`);
      if (hit && (!best || item.to.length > best.item.to.length)) best = { group, item };
    })
  );
  return best;
};

const TopBar = ({ groups, bottom = [], profileTo }) => {
  const { pathname } = useLocation();
  const user = useSelector((s) => s.auth.user);
  const all = [...groups, { label: 'Account', items: bottom }];
  const found = findItem(all, pathname);
  const detail = found && pathname !== found.item.to ? DETAIL_LABELS.find(([re]) => re.test(pathname))?.[1] : null;
  const name = user?.name || user?.username || (user?.mobile ? `+91 ${user.mobile}` : 'Account');
  const initial = (user?.name || user?.username || user?.mobile || '?').charAt(0).toUpperCase();

  return (
    <header className="oh-topbar">
      <nav aria-label="Breadcrumb">
        <ol className="oh-crumbs">
          <li className="oh-crumbs-root">{found ? found.group.label : 'OriginHash'}</li>
          {found && (
            <li>
              {detail ? (
                <Link to={found.item.to}>{found.item.label}</Link>
              ) : (
                <span aria-current="page">{found.item.label}</span>
              )}
            </li>
          )}
          {detail && (
            <li>
              <span aria-current="page">{detail}</span>
            </li>
          )}
        </ol>
      </nav>
      <div className="oh-topbar-end">
        <Link to={profileTo} className="oh-topbar-account" title="Your profile">
          <span className="oh-topbar-avatar" aria-hidden="true">
            {user?.photoUrl ? <img src={user.photoUrl} alt="" /> : initial}
          </span>
          {name}
        </Link>
      </div>
    </header>
  );
};

export default TopBar;
