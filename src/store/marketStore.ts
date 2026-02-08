// ============================================================
// Market Store — central state for all tokens and market simulation
// ============================================================

import { create } from 'zustand';
import type { Token } from '../engine/tokenFactory';
import { createMarketState, initializeMarket, tickMarket, applyTradeToMarket } from '../engine/marketSimulator';
import type { MarketEvent, MarketState } from '../engine/marketSimulator';
import { getAllCandles } from '../engine/candleAggregator';
import type { Candle, Timeframe } from '../engine/candleAggregator';

interface MarketStore {
  // State
  marketState: MarketState;
  selectedTokenId: string | null;
  selectedTimeframe: Timeframe;
  /** Increments on every selectToken call so re-selecting same token still triggers navigation */
  selectionSeq: number;

  // Actions
  initialize: () => void;
  tick: () => MarketEvent[];
  selectToken: (tokenId: string | null) => void;
  setTimeframe: (tf: Timeframe) => void;
  executeTrade: (tokenId: string, amountSOL: number, isBuy: boolean) => void;
}

export const useMarketStore = create<MarketStore>((set, get) => ({
  marketState: createMarketState(),
  selectedTokenId: null,
  selectedTimeframe: '5s',
  selectionSeq: 0,

  initialize: () => {
    const state = createMarketState();
    const initialized = initializeMarket(state, 35);
    set({ marketState: initialized });
  },

  tick: () => {
    const { marketState } = get();
    const { state: newState, newEvents } = tickMarket(marketState);
    set({ marketState: newState });
    return newEvents;
  },

  selectToken: (tokenId: string | null) => {
    set(s => ({ selectedTokenId: tokenId, selectionSeq: s.selectionSeq + 1 }));
  },

  setTimeframe: (tf: Timeframe) => {
    set({ selectedTimeframe: tf });
  },

  executeTrade: (tokenId: string, amountSOL: number, isBuy: boolean) => {
    const { marketState } = get();
    const newState = applyTradeToMarket(marketState, tokenId, amountSOL, isBuy);
    set({ marketState: newState });
  },
}));

// --- Helper selectors (use OUTSIDE of zustand selector, in component body) ---
export function getTokensFromState(state: MarketState): Token[] {
  return Array.from(state.tokens.values());
}

export function getTokenFromState(state: MarketState, id: string): Token | undefined {
  return state.tokens.get(id);
}

export function getCandlesFromState(state: MarketState, tokenId: string, tf: Timeframe): Candle[] {
  const token = state.tokens.get(tokenId);
  if (!token) return [];
  return getAllCandles(token.candleStore, tf);
}
