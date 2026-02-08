// ============================================================
// Market Simulator — orchestrates the market simulation
// ALL functions are IMMUTABLE — they never mutate input state
// ============================================================

import { createPriceState, tickPrice, withTradeImpact, Phase } from './priceEngine';
import type { PriceState } from './priceEngine';
import { addTick, createCandleStore } from './candleAggregator';
import type { CandleStore } from './candleAggregator';
import { createToken, updateTokenStatus, shouldSpawnToken } from './tokenFactory';
import type { Token } from './tokenFactory';

export interface MarketEvent {
  type: 'new_token' | 'migration';
  tokenId: string;
  tokenName: string;
  tokenTicker: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export interface MarketState {
  tokens: Map<string, Token>;
  events: MarketEvent[];
  tickCount: number;
  startTime: number;
}

export function createMarketState(): MarketState {
  return {
    tokens: new Map(),
    events: [],
    tickCount: 0,
    startTime: Date.now(),
  };
}

// Simulate real price engine history from $0.01 to target price
function simulateHistory(
  targetPrice: number,
  maxTicks: number = 600,
): { priceState: PriceState; candleStore: CandleStore; priceHistory: number[] } {
  const now = Math.floor(Date.now() / 1000);
  let state = createPriceState(0.01);
  let store = createCandleStore();
  const priceHistory: number[] = [0.01];

  state = { ...state, phase: Phase.ACCUMULATION, phaseDuration: 5 + Math.floor(Math.random() * 10) };

  for (let i = 0; i < maxTicks; i++) {
    state = tickPrice(state);
    const timestamp = now - (maxTicks - i) * 2;

    store = addTick(store, state.price, state.high, state.low, state.open, state.volume, timestamp);
    priceHistory.push(state.price);

    if (state.price >= targetPrice * 0.8 && Math.random() < 0.15) break;
    if (state.price > targetPrice * 2) break;
  }

  const ratio = targetPrice / state.price;
  if (Math.abs(ratio - 1) > 0.01) {
    state = { ...state, price: state.price * (0.7 + ratio * 0.3) };
    const finalTime = now - 1;
    store = addTick(store, state.price, state.price * 1.005, state.price * 0.995, priceHistory[priceHistory.length - 1], 150, finalTime);
    priceHistory.push(state.price);
  }

  return { priceState: state, candleStore: store, priceHistory: priceHistory.slice(-60) };
}

export function initializeMarket(state: MarketState, count: number = 35): MarketState {
  const newTokens = new Map(state.tokens);
  const newEvents = [...state.events];

  for (let i = 0; i < count; i++) {
    const token = createToken();

    if (i < 8) {
      const targetPrice = 0.1 + Math.random() * 0.7;
      const sim = simulateHistory(targetPrice, 200 + Math.floor(Math.random() * 200));
      token.priceState = sim.priceState;
      token.candleStore = sim.candleStore;
      token.priceHistory = sim.priceHistory;
      token.status = 'soon';
      token.liquidity = 200 + Math.random() * 500;
    } else if (i < 12) {
      const targetPrice = 1.0 + Math.random() * 4.0;
      const sim = simulateHistory(targetPrice, 400 + Math.floor(Math.random() * 300));
      token.priceState = sim.priceState;
      token.candleStore = sim.candleStore;
      token.priceHistory = sim.priceHistory;
      token.status = 'migrated';
      token.migratedAt = Date.now() - Math.random() * 300000;
      token.liquidity = 500 + Math.random() * 2000;
    }

    token.marketCap = token.priceState.price * token.totalSupply;

    newTokens.set(token.id, token);
    newEvents.push({
      type: 'new_token',
      tokenId: token.id,
      tokenName: token.name,
      tokenTicker: token.ticker,
      timestamp: Date.now(),
    });
  }

  return { ...state, tokens: newTokens, events: newEvents };
}

function getChartTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}

export function tickMarket(state: MarketState): { state: MarketState; newEvents: MarketEvent[] } {
  const newTokens = new Map<string, Token>();
  const newEvents: MarketEvent[] = [];
  const now = Date.now();
  const chartTime = getChartTimestamp();

  for (const [id, token] of state.tokens) {
    const newPriceState = tickPrice(token.priceState);
    const prevStatus = token.status;

    const updatedCandleStore = addTick(
      token.candleStore,
      newPriceState.price, newPriceState.high,
      newPriceState.low, newPriceState.open,
      newPriceState.volume, chartTime
    );

    const newHistory = [...token.priceHistory.slice(-59), newPriceState.price];

    const updatedToken: Token = {
      ...token,
      priceState: newPriceState,
      candleStore: updatedCandleStore,
      marketCap: newPriceState.price * token.totalSupply,
      priceHistory: newHistory,
    };

    const newStatus = updateTokenStatus(updatedToken);

    if (newStatus === 'migrated' && prevStatus !== 'migrated') {
      newEvents.push({
        type: 'migration',
        tokenId: id,
        tokenName: token.name,
        tokenTicker: token.ticker,
        timestamp: now,
        data: { price: newPriceState.price },
      });
    }

    newTokens.set(id, updatedToken);
  }

  // Spawn new tokens
  const activeCount = newTokens.size;
  if (shouldSpawnToken(activeCount)) {
    const newToken = createToken();
    newTokens.set(newToken.id, newToken);
    newEvents.push({
      type: 'new_token',
      tokenId: newToken.id,
      tokenName: newToken.name,
      tokenTicker: newToken.ticker,
      timestamp: now,
    });
  }

  return {
    state: {
      tokens: newTokens,
      events: [...state.events.slice(-100), ...newEvents],
      tickCount: state.tickCount + 1,
      startTime: state.startTime,
    },
    newEvents,
  };
}

export function applyTradeToMarket(
  state: MarketState,
  tokenId: string,
  amountSOL: number,
  isBuy: boolean
): MarketState {
  const token = state.tokens.get(tokenId);
  if (!token) return state;

  const newPriceState = withTradeImpact(token.priceState, amountSOL, isBuy, token.liquidity);
  const newLiquidity = isBuy
    ? token.liquidity + amountSOL * 0.5
    : Math.max(10, token.liquidity - amountSOL * 0.3);

  const newToken: Token = { ...token, priceState: newPriceState, liquidity: newLiquidity };
  const newTokens = new Map(state.tokens);
  newTokens.set(tokenId, newToken);

  return { ...state, tokens: newTokens };
}
