import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { LoadingState, Spinner } from '../../components/Loader.jsx';
import StickerUsageBar from '../../components/StickerUsageBar.jsx';
import { PLAN_NAMES } from '../../store/walletSlice';
import { formatINR } from '../../utils/money';
import '../../styles/sticker-usage.css';

// Admins: where every user's stickers went — bought, used, expired, still left — per plan, with
// what expires soon. Pay As You Go stickers last two years; plan stickers expire each month end.

const PLANS = ['PAYG', 'SUBSCRIPTION', 'FIXED_VARIABLE', 'LIGHT'];
const fmt = (n) => (n ?? 0).toLocaleString('en-IN');
const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);
const day = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const COLUMNS = [
  { key: 'name', label: 'User', numeric: false },
  { key: 'bought', label: 'Bought' },
  { key: 'used', label: 'Used' },
  { key: 'expired', label: 'Expired' },
  { key: 'left', label: 'Left' },
  { key: 'expiringSoon', label: 'Expiring soon' },
  { key: 'lastExpiredAt', label: 'Last expiry' },
  { key: 'paidPaise', label: 'Paid' },
];

const sortValue = (row, key) => {
  if (key === 'name') return (row.user.name || row.user.code || '').toLowerCase();
  if (key === 'lastExpiredAt') return row.figures.lastExpiredAt ? new Date(row.figures.lastExpiredAt).getTime() : 0;
  return row.figures[key] || 0;
};

// One CSV line per user and plan, so it can be pivoted in a spreadsheet.
const CSV_HEADER = [
  'User ID', 'Name', 'Mobile', 'Role', 'Plan', 'Bought', 'Used', 'Expired', 'Expired (last 30 days)',
  'Cleared (test)', 'Left', 'Expiring in 30 days', 'Next expiry', 'Last expiry', 'Paid (INR)',
];
const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const isoDay = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');
const downloadCsv = (rows, plan) => {
  const lines = [CSV_HEADER];
  for (const { user, plans } of rows) {
    for (const p of PLANS) {
      const f = plans[p];
      if (!f || (plan !== 'ALL' && p !== plan)) continue;
      lines.push([
        user.code, user.name, user.mobile, user.role, PLAN_NAMES[p], f.bought, f.used, f.expired, f.expiredRecent,
        f.cleared, f.left, f.expiringSoon, isoDay(f.nextExpiryAt), isoDay(f.lastExpiredAt), (f.paidPaise / 100).toFixed(2),
      ]);
    }
  }
  const blob = new Blob([`﻿${lines.map((l) => l.map(csvCell).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: `sticker-usage-${new Date().toISOString().slice(0, 10)}.csv` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const Kpi = ({ label, value, foot, tone }) => (
  <div className={`oh-su-kpi ${tone || ''}`}>
    <span className="oh-su-kpi-label">{label}</span>
    <strong className="oh-su-kpi-value">{value}</strong>
    {foot && <span className="oh-su-kpi-foot">{foot}</span>}
  </div>
);

const StickerUsage = () => {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('ALL');
  const [onlyExpired, setOnlyExpired] = useState(false);
  const [sort, setSort] = useState({ key: 'expired', dir: 'desc' });

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const { data: body } = await api.get('/stickers/usage');
      setData(body);
      setStatus('ready');
    } catch {
      setStatus('failed');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    if (!data?.users) return [];
    const q = search.trim().toLowerCase();
    const list = data.users
      .map((u) => ({ ...u, figures: plan === 'ALL' ? u.totals : u.plans[plan] }))
      .filter((r) => r.figures)
      .filter((r) => !onlyExpired || r.figures.expired > 0)
      .filter((r) => !q || [r.user.name, r.user.code, r.user.mobile].some((v) => v && String(v).toLowerCase().includes(q)));
    const dir = sort.dir === 'asc' ? 1 : -1;
    return list.sort((a, b) => {
      const va = sortValue(a, sort.key);
      const vb = sortValue(b, sort.key);
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir || a.user.id - b.user.id;
    });
  }, [data, search, plan, onlyExpired, sort]);

  if (status === 'loading' && !data) return <LoadingState label="Loading sticker usage…" />;
  if (status === 'failed' && !data) {
    return (
      <div className="oh-error" role="alert">
        Could not load the sticker report.{' '}
        <button type="button" className="oh-link-btn" onClick={load}>
          Try again
        </button>
      </div>
    );
  }
  if (!data.enabled) return <div className="oh-empty-state">Sticker billing is off, so there's nothing to report yet.</div>;

  const { totals, byPlan, expiringSoonDays } = data;
  const shown = plan === 'ALL' ? totals : byPlan[plan];
  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: key === 'name' ? 'asc' : 'desc' }));

  return (
    <section className={`oh-su ${status === 'loading' ? 'refreshing' : ''}`} aria-label="Sticker usage">
      <header className="oh-su-head">
        <div>
          <h2>Sticker usage</h2>
          <p>
            Where every user&apos;s stickers went. Pay As You Go and Light QR stickers last 2 years; Subscription and Fixed
            + Variable stickers expire at the end of each month.
          </p>
        </div>
        <div className="oh-su-head-actions">
          <button type="button" className="oh-su-btn ghost" onClick={load} disabled={status === 'loading'}>
            {status === 'loading' ? <Spinner /> : null} Refresh
          </button>
          <button type="button" className="oh-su-btn" onClick={() => downloadCsv(rows, plan)} disabled={!rows.length}>
            Export CSV
          </button>
        </div>
      </header>

      <div className="oh-su-kpis">
        <Kpi label="Bought" value={fmt(shown.bought)} foot={`${formatINR(shown.paidPaise, { whole: true })} paid`} />
        <Kpi label="Used" value={fmt(shown.used)} foot={`${pct(shown.used, shown.bought)}% of bought`} />
        <Kpi
          label="Expired"
          tone="danger"
          value={fmt(shown.expired)}
          foot={`${pct(shown.expired, shown.bought)}% of bought · ${fmt(shown.expiredRecent)} in the last ${expiringSoonDays} days`}
        />
        <Kpi label="Left" value={fmt(shown.left)} foot={`${pct(shown.left, shown.bought)}% of bought`} />
        <Kpi
          label={`Expiring in ${expiringSoonDays} days`}
          tone="warning"
          value={fmt(shown.expiringSoon)}
          foot={shown.nextExpiryAt ? `Next on ${day(shown.nextExpiryAt)}` : 'Nothing due'}
        />
      </div>

      <div className="oh-su-plans">
        {PLANS.map((p) => (
          <button
            key={p}
            type="button"
            className={`oh-su-plan plan-${p.toLowerCase()} ${plan === p ? 'active' : ''}`}
            onClick={() => setPlan(plan === p ? 'ALL' : p)}
            aria-pressed={plan === p}
          >
            <span className="oh-su-plan-top">
              <span className="oh-su-plan-name">{PLAN_NAMES[p]}</span>
              <span className="oh-su-plan-expired">
                <b>{fmt(byPlan[p].expired)}</b> expired
              </span>
            </span>
            <StickerUsageBar figures={byPlan[p]} legend={false} label={PLAN_NAMES[p]} />
            <span className="oh-su-plan-foot">
              {fmt(byPlan[p].bought)} bought · {fmt(byPlan[p].used)} used · {fmt(byPlan[p].left)} left
            </span>
          </button>
        ))}
      </div>
      <StickerUsageBar figures={shown} label={plan === 'ALL' ? 'All plans' : PLAN_NAMES[plan]} />

      <div className="oh-toolbar oh-su-toolbar">
        <input
          className="oh-search-input"
          placeholder="Search name, mobile or user ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search users"
        />
        <select className="oh-status-select" value={plan} onChange={(e) => setPlan(e.target.value)} aria-label="Plan">
          <option value="ALL">All plans</option>
          {PLANS.map((p) => (
            <option key={p} value={p}>
              {PLAN_NAMES[p]}
            </option>
          ))}
        </select>
        <label className="oh-su-check">
          <input type="checkbox" checked={onlyExpired} onChange={(e) => setOnlyExpired(e.target.checked)} />
          Only users with expired stickers
        </label>
      </div>

      <div className="oh-su-table-wrap">
        <table className="oh-su-table">
          <caption className="oh-visually-hidden">Stickers per user{plan === 'ALL' ? '' : `, ${PLAN_NAMES[plan]}`}</caption>
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={c.numeric === false ? '' : 'num'}
                  aria-sort={sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <button type="button" onClick={() => toggleSort(c.key)}>
                    {c.key === 'expiringSoon' ? `Expiring ≤ ${expiringSoonDays}d` : c.label}
                    <span className="oh-su-sort" aria-hidden="true">
                      {sort.key === c.key ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ user, figures: f }) => (
              <tr key={user.id}>
                <th scope="row">
                  <Link to={`/admin/users/${user.id}`} className="oh-su-user">
                    <span className="oh-su-user-name">{user.name || 'Unnamed user'}</span>
                    <span className="oh-su-user-meta">
                      {user.code}
                      {user.mobile ? ` · +91 ${user.mobile}` : ''}
                      {user.role !== 'user' ? ` · ${user.role === 'superadmin' ? 'Super-admin' : 'Admin'}` : ''}
                    </span>
                  </Link>
                </th>
                <td className="num">{fmt(f.bought)}</td>
                <td className="num">{fmt(f.used)}</td>
                <td className={`num ${f.expired ? 'expired' : 'zero'}`}>
                  {fmt(f.expired)}
                  {f.bought > 0 && f.expired > 0 && <small>{pct(f.expired, f.bought)}%</small>}
                </td>
                <td className="num">{fmt(f.left)}</td>
                <td className={`num ${f.expiringSoon ? 'soon' : 'zero'}`}>{fmt(f.expiringSoon)}</td>
                <td className="num date">{day(f.lastExpiredAt)}</td>
                <td className="num">{formatINR(f.paidPaise, { whole: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="oh-empty-state">No users match.</div>}
      </div>
      <p className="oh-su-note">
        {fmt(rows.length)} {rows.length === 1 ? 'user' : 'users'} · Bought includes each new month of a yearly Subscription ·
        Updated {new Date(data.generatedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
      </p>
    </section>
  );
};

export default StickerUsage;
