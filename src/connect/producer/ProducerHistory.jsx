import { useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import connectApi from '../api';
import { byText, bySub, eventOf, whatHappened } from '../historyEvents.jsx';
import { LoadingState, Spinner } from '../../components/Loader.jsx';
import { MenuButton } from '../../components/MobileMenu.jsx';
import { CrossIcon, PinIcon, SearchIcon } from '../../components/ScanIcons.jsx';
import { Pagination } from '../../pages/History.jsx';
import { formatCoords, formatDateTimeShort } from '../../utils/format';
import '../../styles/app-shell.css';
import '../../styles/scan.css';
import '../../styles/history.css';

// The History tab for producer users: everything that happened to the company's QR codes, newest
// first — distributor / retailer scans, sales, consumer scans and the team's own scans. Same look
// and URL-kept filter / search / page as the verification history.

const FILTERS = [
  ['all', 'All'],
  ['trade', 'Trade scans'],
  ['sold', 'Sold'],
  ['consumer', 'Consumer scans'],
  ['team', 'Our team'],
  ['mine', 'Mine'],
];
const PAGE_SIZES = [10, 20, 50];
const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

const positiveInt = (value, fallback) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

const ProducerHistory = () => {
  const { openMenu } = useOutletContext() || {};
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = FILTERS.some(([key]) => key === searchParams.get('filter')) ? searchParams.get('filter') : 'all';
  const q = (searchParams.get('q') || '').trim();
  const requestedPage = positiveInt(searchParams.get('page'), 1);
  const pageSize = PAGE_SIZES.includes(Number(searchParams.get('size'))) ? Number(searchParams.get('size')) : DEFAULT_PAGE_SIZE;

  const [query, setQuery] = useState(q);
  const [rows, setRows] = useState([]);
  const [paging, setPaging] = useState({ page: 1, totalPages: 1, total: 0 });
  const [status, setStatus] = useState('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const requestRef = useRef(0);
  const panelRef = useRef(null);

  const updateParams = (changes, { keepPage = false } = {}) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        Object.entries(changes).forEach(([key, value]) => {
          if (value === null || value === '' || value === undefined) next.delete(key);
          else next.set(key, String(value));
        });
        if (!keepPage) next.delete('page');
        if (next.get('filter') === 'all') next.delete('filter');
        if (next.get('page') === '1') next.delete('page');
        if (next.get('size') === String(DEFAULT_PAGE_SIZE)) next.delete('size');
        return next;
      },
      { replace: true }
    );
  };

  useEffect(() => setQuery((current) => (current.trim() === q ? current : q)), [q]);
  useEffect(() => {
    if (query.trim() === q) return undefined;
    const timer = setTimeout(() => updateParams({ q: query.trim() }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, q]);

  useEffect(() => {
    const request = ++requestRef.current;
    setStatus('loading');
    connectApi
      .get('/producer/history', { params: { filter, q: q || undefined, page: requestedPage, pageSize } })
      .then(({ data }) => {
        if (request !== requestRef.current) return;
        setRows(data.history);
        setPaging({ page: data.page, total: data.total, totalPages: data.totalPages });
        setStatus('ready');
      })
      .catch(() => {
        if (request === requestRef.current) setStatus('failed');
      });
  }, [filter, q, requestedPage, pageSize, reloadKey]);

  const goToPage = (page) => {
    updateParams({ page }, { keepPage: true });
    const top = panelRef.current?.getBoundingClientRect().top;
    if (top !== undefined && top < 0) panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const clearSearch = () => {
    setQuery('');
    updateParams({ q: '' });
  };
  const openUnit = (h) => navigate(`/producer/units/${h.unitId}`);
  const serial = (index) => (paging.page - 1) * pageSize + index + 1;

  const loading = status === 'loading';
  const firstLoad = loading && rows.length === 0;
  const refreshing = loading && rows.length > 0;
  const showResults = rows.length > 0 && status !== 'failed';

  const filterChips = (
    <div className="oh-history-filters" role="group" aria-label="Filter history">
      {FILTERS.map(([key, label]) => (
        <button key={key} type="button" className={`oh-history-chip ${filter === key ? 'active' : ''}`} aria-pressed={filter === key} onClick={() => updateParams({ filter: key })}>
          {label}
        </button>
      ))}
    </div>
  );

  const searchBox = (
    <div className="oh-history-search" role="search">
      <SearchIcon size={18} />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') updateParams({ q: query.trim() });
          if (e.key === 'Escape' && query) clearSearch();
        }}
        placeholder="Search serial (OH000123), product, batch, retailer or place"
        aria-label="Search history"
        maxLength={100}
        enterKeyHint="search"
      />
      {loading && q && <Spinner className="oh-history-search-spinner" />}
      {query && (
        <button type="button" className="oh-history-search-clear" onClick={clearSearch} aria-label="Clear search">
          <CrossIcon size={14} />
        </button>
      )}
    </div>
  );

  const emptyMessage = q ? (
    <>
      Nothing matches “{q}”{filter !== 'all' && ' with this filter'}.
      <button type="button" className="oh-history-empty-action" onClick={clearSearch}>
        Clear search
      </button>
    </>
  ) : filter === 'all' ? (
    'Nothing yet. Scans of your QR codes by distributors, retailers and consumers, and every sale, show up here.'
  ) : (
    'Nothing matches this filter yet.'
  );

  return (
    <div className="oh-history-page">
      <div className="oh-history-desk-head oh-only-desktop">
        <div>
          <h1 className="oh-admin-title">Supply chain history</h1>
          <p className="oh-admin-subtitle">Every scan and sale of your company&apos;s QR codes</p>
        </div>
        {searchBox}
      </div>
      <div className="oh-history-desk-toolbar oh-only-desktop">
        {filterChips}
        {status === 'ready' && (
          <span className="oh-history-count">
            {paging.total} {paging.total === 1 ? 'entry' : 'entries'}
            {q && ' found'}
          </span>
        )}
      </div>

      <div className="oh-result-shell oh-history-shell">
        <header className="oh-result-head oh-history-head">
          {openMenu ? <MenuButton onClick={openMenu} /> : <span className="oh-scan-icon-spacer" />}
          <h1 className="oh-result-title">Supply chain history</h1>
          <span className="oh-scan-icon-spacer" />
        </header>

        <div className="oh-result-body oh-history-body">
          <div className="oh-only-mobile">
            {searchBox}
            {filterChips}
          </div>

          <div ref={panelRef} className={`oh-history-panel ${refreshing ? 'is-refreshing' : ''}`} aria-busy={loading}>
            {firstLoad && <LoadingState className="oh-history-empty" label="Loading history…" />}
            {status === 'failed' && (
              <div className="oh-history-empty">
                Couldn&apos;t load the history.
                <button type="button" className="oh-history-empty-action" onClick={() => setReloadKey((k) => k + 1)}>
                  Try again
                </button>
              </div>
            )}
            {status === 'ready' && rows.length === 0 && <div className="oh-history-empty">{emptyMessage}</div>}

            {showResults && (
              <>
                {/* Phone: cards. */}
                <ul className="oh-history-list oh-only-mobile">
                  {rows.map((h, index) => {
                    const e = eventOf(h);
                    return (
                      <li key={h.id} className="oh-history-card">
                        <span className={`oh-history-icon ${e.tone}`}>{e.icon}</span>
                        <div className="oh-history-text">
                          <div className="oh-history-name">
                            <span className="oh-history-sno">#{serial(index)}</span>
                            {h.product?.name || 'No product'} · {h.serial}
                          </div>
                          <div className="oh-history-producer">
                            {whatHappened(h)} · Batch {h.batch.batchNo}
                          </div>
                          <div className="oh-history-by">
                            by {byText(h)}
                            {bySub(h) && <span className="oh-now-called"> · {bySub(h)}</span>}
                          </div>
                          <div className="oh-history-meta">
                            {h.location && (
                              <span className="oh-history-loc">
                                <PinIcon size={12} />
                                {h.location.name || formatCoords(h.location)} ·
                              </span>
                            )}
                            <span>{formatDateTimeShort(h.at, { seconds: true })}</span>
                          </div>
                        </div>
                        <div className="oh-history-side">
                          <span className={`oh-history-status ${e.tone}`} title={e.label}>
                            {e.short}
                          </span>
                          <button type="button" className="oh-history-view" onClick={() => openUnit(h)}>
                            View
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {/* Laptop: a table; the whole row opens the unit. */}
                <div className="oh-only-desktop">
                  <table className="oh-history-table">
                    <thead>
                      <tr>
                        <th scope="col" className="oh-history-cell-sno">
                          S.No
                        </th>
                        <th scope="col">Event</th>
                        <th scope="col">Product</th>
                        <th scope="col">Batch</th>
                        <th scope="col">By</th>
                        <th scope="col">Location</th>
                        <th scope="col">Date &amp; time</th>
                        <th scope="col" aria-label="Open" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((h, index) => {
                        const e = eventOf(h);
                        return (
                          <tr key={h.id} onClick={() => openUnit(h)}>
                            <td className="oh-history-cell-sno">{serial(index)}</td>
                            <td>
                              <span className={`oh-history-status-cell ${e.tone}`}>
                                <span className={`oh-history-icon ${e.tone}`}>{e.icon}</span>
                                {e.label}
                              </span>
                            </td>
                            <td>
                              <div className="oh-history-cell-main">{h.product?.name || 'No product'}</div>
                              <div className="oh-history-cell-code">{h.serial}</div>
                            </td>
                            <td>
                              <div className="oh-history-cell-code">{h.batch.batchNo}</div>
                            </td>
                            <td>
                              <div className="oh-history-cell-main">{byText(h)}</div>
                              {bySub(h) && <div className="oh-history-cell-sub">{bySub(h)}</div>}
                            </td>
                            <td>
                              {h.location ? (
                                <>
                                  {h.location.name && <div className="oh-history-cell-main">{h.location.name}</div>}
                                  <div className={h.location.name ? 'oh-history-cell-sub' : undefined}>{formatCoords(h.location)}</div>
                                </>
                              ) : (
                                <span className="oh-history-cell-none">Not shared</span>
                              )}
                            </td>
                            <td className="oh-history-cell-date">{formatDateTimeShort(h.at, { seconds: true })}</td>
                            <td className="oh-history-cell-action">
                              <button
                                type="button"
                                className="oh-history-view"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  openUnit(h);
                                }}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  page={paging.page}
                  totalPages={paging.totalPages}
                  pageSize={pageSize}
                  total={paging.total}
                  onPage={goToPage}
                  onPageSize={(size) => updateParams({ size })}
                  disabled={loading}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProducerHistory;
