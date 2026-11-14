// Retailer QR codes open <app>/rq/<token>, consumer QR codes <app>/cq/<token>. Returns that path
// for a scanned QR's text, or null when it isn't one of them.
const QR_PATH = /\/(rq|cq)\/([2-9A-HJKMNP-Z]{10})\/?$/i;

export const pathFromQr = (raw) => {
  const text = String(raw || '').trim();
  try {
    const m = new URL(text).pathname.match(QR_PATH);
    return m ? `/${m[1].toLowerCase()}/${m[2].toUpperCase()}` : null;
  } catch {
    const m = text.match(/^(rq|cq)\/([2-9A-HJKMNP-Z]{10})$/i);
    return m ? `/${m[1].toLowerCase()}/${m[2].toUpperCase()}` : null;
  }
};
