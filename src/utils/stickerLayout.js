// How stickers are laid out on a PDF page. All sizes in PDF points (1 pt = 1/72 in ≈ 0.353 mm).
// Mirrors backend/src/utils/stickerLayout.js, so the form shows the layout the PDF will use.

export const PAGE_SIZES = { A4: [595.28, 841.89], A3: [841.89, 1190.55] };
export const PAGE_SIZE_NAMES = Object.keys(PAGE_SIZES);

// Vertical 50:50 is a business card (89 × 51 mm) with the image and QR side by side.
// Horizontal 50:50 is a tall card (45 × 65 mm) with the image above the QR.
// Bulk is the identical-QR label (53 × 64 mm): brand and batch, the QR with the logo, a number bar.
const STICKER_SIZES = {
  'vertical-50-50': { w: 3.5 * 72, h: 2 * 72 },
  'horizontal-50-50': { w: 128, h: 184 },
  bulk: { w: 150, h: 180 },
};

const PAGE_MARGIN = 22; // ≈ 8 mm, inside most printers' unprintable edge
export const GAP = 10; // between stickers, for cutting
const HEADER_H = 24;
export const DEFAULT_PER_PAGE = 10;
// The most labels a page can take, on any paper. Stickers print at full size when they fit and
// shrink evenly beyond that; at 40 on A4 the QR is still about 11 mm across.
const MAX_PER_PAGE = 40;
const MAX_BULK_PER_PAGE = 42;

const stickerSize = (splitType) => STICKER_SIZES[splitType] || STICKER_SIZES['vertical-50-50'];

// `perPage` labels on one page: tries every column count, upright and sideways, and keeps the
// grid that prints them biggest (never above full size). On a tie: the page upright (sideways
// only when it fits them bigger), then fewer empty slots, then more columns (2 × 2, not 1 × 4).
export const gridFor = (pageSize, splitType, perPage) => {
  const [pw, ph] = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;
  const { w, h } = stickerSize(splitType);
  const better = (a, b) => {
    if (Math.abs(a.scale - b.scale) > 1e-6) return a.scale > b.scale;
    if (a.upright !== b.upright) return a.upright;
    const emptyA = a.cols * a.rows - perPage;
    const emptyB = b.cols * b.rows - perPage;
    if (emptyA !== emptyB) return emptyA < emptyB;
    return a.cols > b.cols;
  };
  let best = null;
  for (const [width, height] of [
    [pw, ph],
    [ph, pw],
  ]) {
    const availW = width - PAGE_MARGIN * 2;
    const availH = height - PAGE_MARGIN * 2 - HEADER_H;
    for (let cols = 1; cols <= perPage; cols += 1) {
      const rows = Math.ceil(perPage / cols);
      const scale = Math.min(1, (availW - (cols - 1) * GAP) / (cols * w), (availH - (rows - 1) * GAP) / (rows * h));
      const grid = { width, height, cols, rows, scale, upright: width === pw };
      if (scale > 0 && (!best || better(grid, best))) best = grid;
    }
  }
  const sw = w * best.scale;
  const sh = h * best.scale;
  const gridWidth = best.cols * sw + (best.cols - 1) * GAP;
  return { ...best, perPage, w, h, sw, sh, left: (best.width - gridWidth) / 2, top: PAGE_MARGIN + HEADER_H };
};

// The most labels a page can take: the same on every paper; bulk (identical-QR) labels go to 42.
export const maxPerPage = (pageSize, splitType) => (splitType === 'bulk' ? MAX_BULK_PER_PAGE : MAX_PER_PAGE);

// Batches made before the per-page setting: as many full-size stickers as fit (the old layout).
export const legacyPerPage = (pageSize, splitType) => {
  const [pw, ph] = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;
  const { w, h } = stickerSize(splitType);
  const fit = (width, height) =>
    Math.floor((width - PAGE_MARGIN * 2 + GAP) / (w + GAP)) * Math.floor((height - PAGE_MARGIN * 2 - HEADER_H + GAP) / (h + GAP));
  return Math.max(1, fit(pw, ph), fit(ph, pw));
};

// A sticker's printed size in millimetres at a given scale (1 pt = 25.4 / 72 mm).
export const stickerMm = (splitType, scale = 1) => {
  const { w, h } = stickerSize(splitType);
  const mm = (pt) => Math.round((pt * scale * 25.4) / 72);
  return { w: mm(w), h: mm(h) };
};

// The most labels a page holds at full size (beyond it, they shrink to fit).
export const fullSizePerPage = (pageSize, splitType) => {
  let n = 1;
  while (n < maxPerPage(pageSize, splitType) && gridFor(pageSize, splitType, n + 1).scale >= 0.999) n += 1;
  return n;
};
