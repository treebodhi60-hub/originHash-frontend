import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { HISTORY_STATUS } from '../History.jsx';
import { LoadingState } from '../../components/Loader.jsx';
import { ArrowLeftIcon, ChevronRightIcon, UndoIcon, UserIcon } from '../../components/ScanIcons.jsx';
import { QrIcon } from '../../components/DashboardIcons.jsx';
import { formatDate, userCode } from '../../utils/format';
import { PROFILE_FIELD_LABELS, formatProfileValue } from '../../utils/profileFields';
import StickerUsageBar from '../../components/StickerUsageBar.jsx';
import { PLAN_NAMES } from '../../store/walletSlice';
import '../../styles/admin.css';
import '../../styles/user-activity.css';
import '../../styles/sticker-usage.css';

// Admin page for one account: who they are, every name / set of details they have had, and
// everything they did — each action shown under the name they had when they did it.

const PAGE_STEP = 40;

const FILTERS = [
  ['all', 'All activity'],
  ['verified', 'Verified'],
  ['mismatched', 'Mismatched'],
  ['failed', 'Failed'],
  ['scanned', 'Scanned'],
  ['batch', 'QR batches'],
  ['profile', 'Profile changes'],
];

// A scan's filter group follows its History status (Verified / Mismatched / Failed / Scanned).
const TONE_FILTER = { success: 'verified', warning: 'mismatched', danger: 'failed', info: 'scanned' };
const OTHER_STATUS = { label: 'Not verified', tone: 'muted', icon: <UndoIcon size={18} /> };

const matches = (event, f) =>
  f === 'all' || (f === 'batch' && event.kind === 'batch') || (f === 'profile' && event.kind === 'profile') || event.group === f;

const time = (iso) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const dateTime = (iso) => `${formatDate(iso)}, ${time(iso)}`;
const count = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const dayLabel = (iso) => {
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const daysAgo = Math.round((startOf(new Date()) - startOf(new Date(iso))) / 86_400_000);
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

const whoChanged = (version, isFirst) => {
  if (version.source === 'self') return isFirst ? 'Filled in by the user' : 'Changed by the user';
  if (version.source === 'admin') {
    const who = version.changedBy?.name ? ` (${version.changedBy.name})` : '';
    return `${isFirst ? 'Added' : 'Changed'} by an admin${who}`;
  }
  return isFirst ? 'Recorded automatically' : 'Updated automatically';
};

const productLabel = (item) =>
  item.productName ? `${item.productName}${item.variantSize ? ` ${item.variantSize}` : ''}` : item.code || 'Unknown QR';

const Stat = ({ label, value, tone }) => (
  <div className={`oh-ua-stat ${tone || ''}`}>
    <div className="oh-ua-stat-value">{value}</div>
    <div className="oh-ua-stat-label">{label}</div>
  </div>
);

// "as Sachin": the name the account had when it did this. Old names stand out from the current one.
const AsName = ({ identity }) =>
  identity ? (
    <span className={`oh-ua-as ${identity.isCurrent ? 'current' : 'past'}`} title="Name on the account at the time">
      as {identity.name}
    </span>
  ) : (
    <span className="oh-ua-as unknown" title="Made before details were tracked">
      details unknown
    </span>
  );

const ChangeList = ({ changes }) => (
  <ul className="oh-ua-changes">
    {changes.map((c) => (
      <li key={c.field}>
        <span className="oh-ua-change-field">{PROFILE_FIELD_LABELS[c.field]}</span>
        <span className="oh-ua-change-old">{formatProfileValue(c.field, c.from)}</span>
        <span aria-hidden="true">→</span>
        <strong>{formatProfileValue(c.field, c.to)}</strong>
      </li>
    ))}
  </ul>
);

const ScanRow = ({ event }) => {
  const { scan, status, identity } = event;
  return (
    <li>
      <Link className="oh-ua-row" to={`/admin/history/${scan.id}`}>
        <span className={`oh-ua-icon ${status.tone}`}>{status.icon}</span>
        <span className="oh-ua-main">
          <span className="oh-ua-line">
            <span className={`oh-ua-status ${status.tone}`}>{status.label}</span>
            <span className="oh-ua-what">{productLabel(scan)}</span>
          </span>
          <span className="oh-ua-sub">
            {[scan.productName && scan.code, scan.batchNo && `Batch ${scan.batchNo}`, scan.producer].filter(Boolean).join(' · ') ||
              'Sticker not registered'}
          </span>
        </span>
        <AsName identity={identity} />
        <time className="oh-ua-time" dateTime={scan.createdAt}>{time(scan.createdAt)}</time>
        <ChevronRightIcon size={16} />
      </Link>
    </li>
  );
};

const BatchRow = ({ event }) => {
  const { batch, identity } = event;
  return (
    <li>
      <div className="oh-ua-row static">
        <span className="oh-ua-icon batch">
          <QrIcon size={18} />
        </span>
        <span className="oh-ua-main">
          <span className="oh-ua-line">
            <span className="oh-ua-status batch">Generated</span>
            <span className="oh-ua-what">{count(batch.numberOfQrs, 'QR sticker')}</span>
          </span>
          <span className="oh-ua-sub">
            {[`Batch ${batch.batchNo}`, productLabel(batch), batch.producer].filter(Boolean).join(' · ')}
          </span>
        </span>
        <AsName identity={identity} />
        <time className="oh-ua-time" dateTime={batch.createdAt}>{time(batch.createdAt)}</time>
        <span className="oh-ua-chevron-space" />
      </div>
    </li>
  );
};

const ProfileRow = ({ event }) => {
  const { version, isFirst } = event;
  const renamed = version.changes.find((c) => c.field === 'name');
  const title = isFirst
    ? `Profile started as ${version.name || 'an unnamed user'}`
    : renamed
      ? `Renamed to ${renamed.to || 'no name'}`
      : `Updated ${version.changes.map((c) => PROFILE_FIELD_LABELS[c.field].toLowerCase()).join(', ') || 'details'}`;
  return (
    <li>
      <div className="oh-ua-row static profile">
        <span className="oh-ua-icon profile">
          <UserIcon size={18} />
        </span>
        <span className="oh-ua-main">
          <span className="oh-ua-line">
            <span className="oh-ua-what">{title}</span>
          </span>
          <span className="oh-ua-sub">{whoChanged(version, isFirst)}</span>
          {!isFirst && version.changes.length > 0 && <ChangeList changes={version.changes} />}
        </span>
        <span />
        <time className="oh-ua-time" dateTime={version.createdAt}>{time(version.createdAt)}</time>
        <span className="oh-ua-chevron-space" />
      </div>
    </li>
  );
};

const STICKER_PLANS = ['PAYG', 'SUBSCRIPTION', 'FIXED_VARIABLE', 'LIGHT'];
const num = (n) => (n ?? 0).toLocaleString('en-IN');

// What this user bought per plan, and where it went: used, expired, still left.
const StickersCard = ({ stickers }) => {
  const plans = STICKER_PLANS.filter((p) => stickers.plans[p]);
  const { totals, expiries, expiringSoonDays } = stickers;
  const row = (label, f, key) => (
    <tr key={key}>
      <td>{label}</td>
      <td>{num(f.bought)}</td>
      <td>{num(f.used)}</td>
      <td className={f.expired ? 'expired' : ''}>{num(f.expired)}</td>
      <td>{num(f.left)}</td>
      <td>{num(f.expiringSoon)}</td>
      <td>{f.nextExpiryAt ? formatDate(f.nextExpiryAt) : '—'}</td>
    </tr>
  );
  return (
    <section className="oh-ua-card oh-ua-stickers" aria-label="Stickers">
      <div className="oh-ua-section-head">
        <h2>Stickers</h2>
        <p>Bought, used and expired per plan. Pay As You Go stickers last 2 years; plan stickers expire at the end of each month.</p>
      </div>
      {plans.length === 0 ? (
        <div className="oh-empty-state">No stickers bought yet.</div>
      ) : (
        <>
          <StickerUsageBar figures={totals} label="This user's stickers" />
          <div className="oh-ua-sticker-scroll">
            <table className="oh-ua-sticker-table">
              <thead>
                <tr>
                  <th scope="col">Plan</th>
                  <th scope="col">Bought</th>
                  <th scope="col">Used</th>
                  <th scope="col">Expired</th>
                  <th scope="col">Left</th>
                  <th scope="col">Expiring ≤ {expiringSoonDays}d</th>
                  <th scope="col">Next expiry</th>
                </tr>
              </thead>
              <tbody>{plans.map((p) => row(PLAN_NAMES[p], stickers.plans[p], p))}</tbody>
              {plans.length > 1 && <tfoot>{row('Total', totals, 'total')}</tfoot>}
            </table>
          </div>
          {expiries.length > 0 && (
            <>
              <h3 className="oh-ua-expiries-title">Expiries</h3>
              <ul className="oh-ua-expiries">
                {expiries.map((e) => (
                  <li key={e.id}>
                    <span>
                      <b>{count(e.stickers, 'sticker')}</b> expired · {PLAN_NAMES[e.planType]}
                    </span>
                    <time dateTime={e.at}>{dateTime(e.at)}</time>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
};

const UserActivity = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [identityId, setIdentityId] = useState(null); // show only what was done under one set of details
  const [shown, setShown] = useState(PAGE_STEP);
  const [stickers, setStickers] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError('');
    setStickers(null);
    // Extra detail: the page works without it (e.g. while sticker billing is off).
    api
      .get(`/stickers/usage/${id}`)
      .then(({ data: body }) => !cancelled && body.enabled && setStickers(body))
      .catch(() => {});
    api
      .get(`/users/${id}/history`)
      .then(({ data: body }) => !cancelled && setData(body))
      .catch((err) => !cancelled && setError(err.response?.data?.message || 'Could not load this user.'));
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => setShown(PAGE_STEP), [filter, identityId]);

  // One "identity" per profile version: the name and details in force from when it was saved
  // until the next change, with everything done in that time.
  const { identities, events } = useMemo(() => {
    if (!data) return { identities: [], events: [] };
    const versions = data.versions || [];
    const byId = new Map();
    const list = versions.map((v, i) => {
      const identity = {
        id: v.id,
        name: v.name?.trim() || 'No name',
        version: v,
        isFirst: i === 0,
        isCurrent: i === versions.length - 1,
        from: v.createdAt,
        until: versions[i + 1]?.createdAt ?? null,
        tally: { actions: 0, verified: 0, mismatched: 0, failed: 0, scanned: 0, batches: 0 },
      };
      byId.set(v.id, identity);
      return identity;
    });

    const all = [];
    list.forEach((identity) =>
      all.push({ kind: 'profile', key: `p${identity.id}`, at: identity.from, identity, version: identity.version, isFirst: identity.isFirst })
    );
    for (const batch of data.batches || []) {
      const identity = byId.get(batch.profileVersionId) || null;
      if (identity) identity.tally.batches += 1;
      all.push({ kind: 'batch', key: `b${batch.id}`, at: batch.createdAt, identity, batch });
    }
    for (const scan of data.scans || []) {
      const status = HISTORY_STATUS[scan.result] || OTHER_STATUS;
      const group = TONE_FILTER[status.tone] || 'other';
      const identity = byId.get(scan.profileVersionId) || null;
      if (identity) {
        identity.tally.actions += 1;
        if (identity.tally[group] !== undefined) identity.tally[group] += 1;
      }
      all.push({ kind: 'scan', key: `s${scan.id}`, at: scan.createdAt, identity, scan, status, group });
    }
    all.sort((a, b) => new Date(b.at) - new Date(a.at) || b.key.localeCompare(a.key));
    return { identities: list.reverse(), events: all };
  }, [data]);

  const scoped = useMemo(
    () => (identityId ? events.filter((e) => e.identity?.id === identityId) : events),
    [events, identityId]
  );
  const filtered = useMemo(() => scoped.filter((e) => matches(e, filter)), [scoped, filter]);
  const filterCounts = useMemo(
    () => Object.fromEntries(FILTERS.map(([key]) => [key, scoped.filter((e) => matches(e, key)).length])),
    [scoped]
  );

  const days = useMemo(() => {
    const groups = [];
    for (const event of filtered.slice(0, shown)) {
      const label = dayLabel(event.at);
      if (groups.at(-1)?.label !== label) groups.push({ label, events: [] });
      groups.at(-1).events.push(event);
    }
    return groups;
  }, [filtered, shown]);

  const backLink = (
    <Link className="oh-ua-back" to="/admin/users">
      <ArrowLeftIcon size={16} /> All users
    </Link>
  );

  if (error) {
    return (
      <div className="oh-ua-page">
        {backLink}
        <div className="oh-error">{error}</div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="oh-ua-page">
        {backLink}
        <LoadingState label="Loading activity…" />
      </div>
    );
  }

  const { user } = data;
  const scans = data.scans || [];
  const batches = data.batches || [];
  const tally = (group) => scans.filter((s) => TONE_FILTER[(HISTORY_STATUS[s.result] || OTHER_STATUS).tone] === group).length;
  const qrTotal = batches.reduce((sum, b) => sum + (b.numberOfQrs || 0), 0);
  const nameTrail = [...identities].reverse().filter((it, i, arr) => i === 0 || it.name !== arr[i - 1].name);
  const selected = identities.find((it) => it.id === identityId);
  const initial = (user.name || user.mobile || user.username || '?').charAt(0).toUpperCase();

  return (
    <div className="oh-ua-page">
      {backLink}

      {/* ---------- Who this is ---------- */}
      <section className="oh-ua-card oh-ua-profile">
        <div className="oh-ua-avatar">{user.photoUrl ? <img src={user.photoUrl} alt="" /> : initial}</div>
        <div className="oh-ua-profile-body">
          <div className="oh-ua-name-row">
            <h1 className="oh-ua-name">{user.name || user.username || 'Unnamed user'}</h1>
            <span className="oh-ua-id">{userCode(user.id)}</span>
            {user.userType && <span className={`oh-badge ${user.userType}`}>{user.userType}</span>}
            {user.isAdmin && <span className="oh-badge producer">{user.isSuperAdmin ? 'Super-admin' : 'Admin'}</span>}
            {user.isBlocked && <span className="oh-badge blocked">Blocked</span>}
          </div>
          <div className="oh-ua-contact">
            {user.mobile && <span>+91 {user.mobile}</span>}
            {user.username && !user.mobile && <span>@{user.username}</span>}
            {user.email && <span>{user.email}</span>}
            {user.address && <span>{user.address}</span>}
            {user.joinedAt && <span>Joined {formatDate(user.joinedAt)}</span>}
          </div>
          {nameTrail.length > 1 && (
            <div className="oh-ua-trail" aria-label="Names used, oldest first">
              <span className="oh-ua-trail-label">Known as</span>
              {nameTrail.map((it, i) => (
                <span className="oh-ua-trail-item" key={it.id}>
                  {i > 0 && <span className="oh-ua-trail-arrow" aria-hidden="true">→</span>}
                  <span className={`oh-ua-trail-name ${i === nameTrail.length - 1 ? 'current' : ''}`}>{it.name}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="oh-ua-stats" aria-label="Totals">
        <Stat label="Actions" value={scans.length} />
        <Stat label="Verified" value={tally('verified')} tone="success" />
        <Stat label="Mismatched" value={tally('mismatched')} tone="warning" />
        <Stat label="Failed" value={tally('failed')} tone="danger" />
        <Stat label="QR batches" value={batches.length} tone="batch" />
        <Stat label="QR stickers" value={qrTotal} tone="batch" />
        {stickers && <Stat label="Stickers expired" value={num(stickers.totals.expired)} tone="danger" />}
      </section>

      {stickers && <StickersCard stickers={stickers} />}

      <div className="oh-ua-layout">
        {/* ---------- Names / details over time ---------- */}
        <aside className="oh-ua-identities" aria-label="Names and details over time">
          <div className="oh-ua-section-head">
            <h2>Names &amp; details over time</h2>
            <p>Every action is kept under the details the account had at that moment. Pick one to see only what was done with it.</p>
          </div>
          <div className="oh-ua-identity-list">
            <button
              type="button"
              className={`oh-ua-identity all ${identityId === null ? 'selected' : ''}`}
              onClick={() => setIdentityId(null)}
              aria-pressed={identityId === null}
            >
              <span className="oh-ua-identity-name">All names</span>
              <span className="oh-ua-identity-period">Everything this account did</span>
              <span className="oh-ua-identity-tally">
                {count(scans.length, 'action')} · {count(batches.length, 'QR batch', 'QR batches')}
              </span>
            </button>
            {identities.map((it) => (
              <button
                type="button"
                key={it.id}
                className={`oh-ua-identity ${identityId === it.id ? 'selected' : ''} ${it.isCurrent ? 'current' : ''}`}
                onClick={() => setIdentityId(identityId === it.id ? null : it.id)}
                aria-pressed={identityId === it.id}
              >
                <span className="oh-ua-identity-top">
                  <span className="oh-ua-identity-name">{it.name}</span>
                  {it.isCurrent && <span className="oh-ua-identity-badge">Current</span>}
                </span>
                <span className="oh-ua-identity-period">
                  {it.until ? `${dateTime(it.from)} → ${dateTime(it.until)}` : `Since ${dateTime(it.from)}`}
                </span>
                <span className="oh-ua-identity-source">{whoChanged(it.version, it.isFirst)}</span>
                {!it.isFirst && it.version.changes.length > 0 && <ChangeList changes={it.version.changes} />}
                {it.isFirst && (
                  <span className="oh-ua-identity-details">
                    {[formatProfileValue('userType', it.version.userType), it.version.address, it.version.email]
                      .filter((v) => v && v !== '—')
                      .join(' · ')}
                  </span>
                )}
                <span className="oh-ua-identity-tally">
                  {count(it.tally.actions, 'action')} · {count(it.tally.batches, 'QR batch', 'QR batches')}
                </span>
                {it.tally.actions > 0 && (
                  <span className="oh-ua-identity-split">
                    {it.tally.verified > 0 && <span className="success">{it.tally.verified} verified</span>}
                    {it.tally.mismatched > 0 && <span className="warning">{it.tally.mismatched} mismatched</span>}
                    {it.tally.failed > 0 && <span className="danger">{it.tally.failed} failed</span>}
                    {it.tally.scanned > 0 && <span className="info">{it.tally.scanned} scanned</span>}
                  </span>
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* ---------- Everything they did ---------- */}
        <section className="oh-ua-card oh-ua-activity" aria-label="Activity">
          <div className="oh-ua-section-head">
            <h2>Activity</h2>
            <p>
              {selected ? (
                <>
                  Only what was done as <strong>{selected.name}</strong> ({selected.until ? `${formatDate(selected.from)} – ${formatDate(selected.until)}` : `since ${formatDate(selected.from)}`}).{' '}
                  <button type="button" className="oh-link-btn" onClick={() => setIdentityId(null)}>
                    Show all
                  </button>
                </>
              ) : (
                'Newest first. Open any scan to see its full details.'
              )}
            </p>
          </div>

          <div className="oh-ua-filters" role="tablist" aria-label="Filter activity">
            {FILTERS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                className={`oh-ua-chip ${filter === key ? 'active' : ''}`}
                onClick={() => setFilter(key)}
              >
                {label}
                <span className="oh-ua-chip-count">{filterCounts[key]}</span>
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="oh-empty-state">Nothing here yet.</div>
          ) : (
            days.map((day) => (
              <div className="oh-ua-day" key={day.label}>
                <h3 className="oh-ua-day-label">{day.label}</h3>
                <ul className="oh-ua-rows">
                  {day.events.map((event) =>
                    event.kind === 'scan' ? (
                      <ScanRow key={event.key} event={event} />
                    ) : event.kind === 'batch' ? (
                      <BatchRow key={event.key} event={event} />
                    ) : (
                      <ProfileRow key={event.key} event={event} />
                    )
                  )}
                </ul>
              </div>
            ))
          )}

          {filtered.length > shown && (
            <button type="button" className="oh-ua-more" onClick={() => setShown((n) => n + PAGE_STEP)}>
              Show more ({filtered.length - shown} left)
            </button>
          )}
          {scans.length >= 500 && (
            <p className="oh-ua-note">Showing this user&apos;s latest 500 scans. Older ones are in History.</p>
          )}
        </section>
      </div>
    </div>
  );
};

export default UserActivity;
