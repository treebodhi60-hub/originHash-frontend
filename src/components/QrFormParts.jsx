import { useState } from 'react';
import api from '../api/axios';
import { Spinner } from './Loader.jsx';

// Shared by the bulk and light QR sticker pages: line icons, the labelled input with a leading
// icon, and a PDF download button.

// ---------- icons (stroke, 20 px) ----------
export const Svg = ({ children, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
export const BuildingIcon = () => (
  <Svg>
    <path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M14 9h5a1 1 0 0 1 1 1v11M3 21h18M8 8h2M8 12h2M8 16h2M17 13h0M17 17h0" />
  </Svg>
);
export const BoxIcon = () => (
  <Svg>
    <path d="M4 7.5 12 3.5l8 4v9l-8 4-8-4v-9Z" />
    <path d="m4 7.5 8 4 8-4M12 11.5v9" />
  </Svg>
);
export const TagIcon = () => (
  <Svg>
    <path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-6.1 6.1a1.5 1.5 0 0 1-2.1 0L3.5 12.2Z" />
    <circle cx="8" cy="8" r="1.3" />
  </Svg>
);
export const ScaleIcon = () => (
  <Svg>
    <path d="M6 8h12l1.5 12h-15L6 8Z" />
    <path d="M9 8a3 3 0 0 1 6 0" />
  </Svg>
);
export const ShieldIcon = () => (
  <Svg>
    <path d="M12 3 5 6v5c0 4.4 3 8.3 7 9.5 4-1.2 7-5.1 7-9.5V6l-7-3Z" />
  </Svg>
);
export const CalendarIcon = () => (
  <Svg>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M8 3v4M16 3v4M3.5 10h17" />
  </Svg>
);
export const InfoIcon = () => (
  <Svg>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h0" />
  </Svg>
);
export const ResetIcon = () => (
  <Svg>
    <path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" />
  </Svg>
);
export const QrGlyph = () => (
  <Svg>
    <rect x="4" y="4" width="6" height="6" rx="1" />
    <rect x="14" y="4" width="6" height="6" rx="1" />
    <rect x="4" y="14" width="6" height="6" rx="1" />
    <path d="M14 14h2v2M20 14v.01M14 20h2M18 18h2v2" />
  </Svg>
);
export const DownloadIcon = () => (
  <Svg size={16}>
    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </Svg>
);
export const ExternalIcon = () => (
  <Svg size={16}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Svg>
);
export const EyeIcon = () => (
  <Svg size={16}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);
export const CheckIcon = () => (
  <Svg size={30}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);

export const Field = ({ label, required, optional, icon, children, htmlFor }) => (
  <div className="oh-bulk-field">
    <label htmlFor={htmlFor}>
      {label}
      {required && (
        <span className="req" aria-hidden="true">
          {' '}
          *
        </span>
      )}
      {optional && <span className="opt"> (optional)</span>}
    </label>
    <div className="oh-bulk-input">
      <span className="oh-bulk-input-icon">{icon}</span>
      {children}
    </div>
  </div>
);

const downloadPdf = async (pdfUrl, fileName) => {
  try {
    const { data } = await api.get(pdfUrl, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: fileName });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    throw new Error('Could not download the PDF. Please try again.');
  }
};

// Downloads a PDF from the API (with the user's sign-in), showing progress and any error.
export const PdfDownloadButton = ({ url, fileName, className = 'oh-bulk-btn primary', children, title }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <span className="oh-bulk-download">
      <button
        type="button"
        className={className}
        disabled={busy}
        title={title}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            await downloadPdf(url, fileName);
          } catch (err) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <Spinner /> : <DownloadIcon />}
        {busy ? 'Preparing PDF…' : children || 'Download PDF'}
      </button>
      {error && <span className="oh-bulk-download-error">{error}</span>}
    </span>
  );
};
