import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/axios';
import { generateBatch } from './qrStickerSlice';

export const PLAN_NAMES = { PAYG: 'Pay As You Go', SUBSCRIPTION: 'Subscription', FIXED_VARIABLE: 'Fixed + Variable', LIGHT: 'Light QR' };
// The balances "Generate QR stickers" can use; LIGHT is only for light QR stickers.
export const STICKER_SOURCES = ['PAYG', 'SUBSCRIPTION', 'FIXED_VARIABLE'];
export const stickerTabs = (tabs) => tabs.filter((t) => STICKER_SOURCES.includes(t.planType));

// Whether billing is on and the price list are the same for everyone and rarely change, so they're
// remembered between visits: the Plans tab and price cards show at once on a reload while the
// user's own sticker balances load. (Balances are never cached — they always come from the server.)
const CACHE_KEY = 'oh_billing_v5'; // bumped when the price list's shape changes
const readCache = () => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
  } catch {
    return {};
  }
};
const cached = readCache();

// The signed-in user's sticker balances: one tab per plan they've bought stickers from (see
// stickerService.tabsJson on the server). `enabled` is false until the server has Razorpay
// configured — stickers are free and no balance UI is shown until then.
const initialState = {
  status: 'idle', // idle | loading | ready | failed
  enabled: Boolean(cached.enabled),
  catalog: cached.catalog || null, // the price list (config/plans.js on the server)
  razorpayKeyId: null,
  tabs: [], // [{ planType, name, stickers, packs: [{ id, stickersLeft, expiresAt, … }] }]
};

export const fetchWallet = createAsyncThunk('wallet/fetch', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/wallet');
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Could not load your stickers.');
  }
});

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    // After a purchase or reset: the server's new tabs.
    setTabs(state, action) {
      state.tabs = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWallet.pending, (state) => {
        if (state.status !== 'ready') state.status = 'loading';
      })
      .addCase(fetchWallet.fulfilled, (state, action) => {
        const { enabled, razorpayKeyId, tabs, catalog } = action.payload;
        Object.assign(state, { enabled, razorpayKeyId, tabs: tabs || [], catalog: catalog ?? null });
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ enabled, catalog: state.catalog }));
        } catch {
          // Storage full or blocked: the page still works, it just can't show the tab early.
        }
        state.status = 'ready';
      })
      .addCase(fetchWallet.rejected, (state) => {
        if (state.status !== 'ready') state.status = 'failed';
      })
      // The server reports the balances after every batch (or refusal), so no refetch is needed.
      .addCase(generateBatch.fulfilled, (state, action) => {
        if (action.payload.stickers) state.tabs = action.payload.stickers.tabs;
      })
      .addCase(generateBatch.rejected, (state, action) => {
        if (action.payload?.code === 'INSUFFICIENT_STICKERS') state.tabs = action.payload.tabs;
      });
  },
});

export const { setTabs } = walletSlice.actions;

export const tabFor = (tabs, planType) => tabs.find((t) => t.planType === planType) || null;

export default walletSlice.reducer;
