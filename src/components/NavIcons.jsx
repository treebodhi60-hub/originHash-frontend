// One icon set for every navigation surface (sidebar, phone bottom bar, ☰ menu):
// a 24px grid drawn at 20px, one stroke weight, so the icons read as a family.
const STROKE = 1.75;

const Svg = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    {children}
  </svg>
);

const paths = {
  home: (
    <>
      <path d="M3 11 12 4l9 7" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" stroke="currentColor" strokeWidth={STROKE} strokeLinejoin="round" />
    </>
  ),
  dashboard: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth={STROKE} />
      <rect x="13" y="4" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth={STROKE} />
      <rect x="4" y="13" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth={STROKE} />
      <rect x="13" y="13" width="7" height="7" rx="1.6" stroke="currentColor" strokeWidth={STROKE} />
    </>
  ),
  scan: (
    <>
      <path
        d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
      <path d="M4 12h16" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
    </>
  ),
  history: (
    <>
      <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={STROKE} />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth={STROKE} />
      <path d="M3 20c1-3.5 3.8-5.5 6-5.5s5 2 6 5.5" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
      <circle cx="17" cy="8" r="2.4" stroke="currentColor" strokeWidth={STROKE} />
      <path d="M15.5 14.7c2 .3 3.7 1.8 4.5 5" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
    </>
  ),
  images: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth={STROKE} />
      <circle cx="9" cy="9.5" r="1.6" stroke="currentColor" strokeWidth={STROKE} />
      <path d="M5 16.5l4.5-4.5 3 3 2-2L20 17" stroke="currentColor" strokeWidth={STROKE} strokeLinejoin="round" />
    </>
  ),
  qr: (
    <>
      <rect x="3.5" y="3.5" width="6" height="6" rx="1" fill="currentColor" />
      <rect x="14.5" y="3.5" width="6" height="6" rx="1" fill="currentColor" />
      <rect x="3.5" y="14.5" width="6" height="6" rx="1" fill="currentColor" />
      <rect x="15" y="15" width="2" height="2" fill="currentColor" />
      <rect x="19" y="15" width="2" height="2" fill="currentColor" />
      <rect x="15" y="19" width="2" height="2" fill="currentColor" />
      <rect x="19" y="19" width="2" height="2" fill="currentColor" />
    </>
  ),
  bulk: (
    <>
      {/* The two cards behind are drawn only where they show, so the icon works on any background. */}
      <path d="M8.5 5.5v-.8c0-1.2 1-2.2 2.2-2.2h8.6c1.2 0 2.2 1 2.2 2.2v8.6c0 1.2-1 2.2-2.2 2.2h-.8" stroke="currentColor" strokeWidth={STROKE} opacity="0.5" />
      <path d="M5.5 8.5v-.8c0-1.2 1-2.2 2.2-2.2h8.6c1.2 0 2.2 1 2.2 2.2v8.6c0 1.2-1 2.2-2.2 2.2h-.8" stroke="currentColor" strokeWidth={STROKE} opacity="0.75" />
      <rect x="2.5" y="8.5" width="13" height="13" rx="2.2" stroke="currentColor" strokeWidth={STROKE} />
      <rect x="5" y="11" width="3" height="3" fill="currentColor" />
      <rect x="10" y="11" width="3" height="3" fill="currentColor" />
      <rect x="5" y="16" width="3" height="3" fill="currentColor" />
      <rect x="10.5" y="16.5" width="2" height="2" fill="currentColor" />
    </>
  ),
  light: (
    <>
      <rect x="3" y="3" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth={STROKE} />
      <rect x="15" y="3" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth={STROKE} />
      <rect x="3" y="15" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth={STROKE} />
      <rect x="5.2" y="5.2" width="1.6" height="1.6" fill="currentColor" />
      <rect x="17.2" y="5.2" width="1.6" height="1.6" fill="currentColor" />
      <rect x="5.2" y="17.2" width="1.6" height="1.6" fill="currentColor" />
      <path d="M17.6 11.5 14 17h3l-1.2 4.5L20 15.6h-3.1l1.3-4.1h-.6Z" fill="currentColor" />
    </>
  ),
  shield: (
    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" stroke="currentColor" strokeWidth={STROKE} strokeLinejoin="round" />
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth={STROKE} />
      <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={STROKE} />
      <path
        d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.3.9a7 7 0 0 0-2.1-1.2L14 3h-4l-.5 2.5a7 7 0 0 0-2.1 1.2l-2.3-.9-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.3-.9a7 7 0 0 0 2.1 1.2L10 21h4l.5-2.5a7 7 0 0 0 2.1-1.2l2.3.9 2-3.4-2-1.6c.07-.4.1-.8.1-1.2Z"
        stroke="currentColor"
        strokeWidth={STROKE - 0.35}
        strokeLinejoin="round"
      />
    </>
  ),
};

const NavIcon = ({ name, size }) => <Svg size={size}>{paths[name]}</Svg>;

export default NavIcon;
