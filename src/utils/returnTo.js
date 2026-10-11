// Where to go after signing in: a public page (like a scanned QR's "Add update") sends people to
// log in and then brings them back. Kept for this browser tab only.
const KEY = 'oh_return_to';

export const rememberReturn = (path) => {
  try {
    sessionStorage.setItem(KEY, path);
  } catch {
    // Storage blocked: they'll land on their home page instead.
  }
};

// The remembered path (once), or null. Only paths inside this app are honoured.
export const takeReturn = () => {
  try {
    const path = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return path && path.startsWith('/') && !path.startsWith('//') ? path : null;
  } catch {
    return null;
  }
};
