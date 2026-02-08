// ============================================================
// Portfolio Store — balance, positions, PnL tracking
// ============================================================

import { create } from 'zustand';

export const SOL_PRICE_USD = 88;

export interface Position {
  tokenId: string;
  tokenName: string;
  tokenTicker: string;
  tokenAvatar: string;
  amount: number;         // number of tokens held
  avgBuyPrice: number;    // avg USD price per token
  totalInvested: number;  // total SOL spent on this position
  currentPrice: number;   // current USD price per token
  currentValue: number;   // current value in SOL = amount * currentPrice / SOL_PRICE_USD
  pnl: number;            // unrealized PnL in SOL = currentValue - totalInvested
  pnlPercent: number;     // unrealized PnL % = (currentValue / totalInvested - 1) * 100
}

interface PortfolioStore {
  balance: number;
  positions: Map<string, Position>;
  lastClaimTime: number;
  realizedPnl: number;     // total realized PnL from closed trades (SOL)
  unrealizedPnl: number;   // total unrealized PnL from open positions (SOL)
  tradeHistory: TradeRecord[];

  claimSOL: () => boolean;
  buyToken: (tokenId: string, tokenName: string, tokenTicker: string, tokenAvatar: string, amountSOL: number, price: number) => boolean;
  sellToken: (tokenId: string, amountTokens: number, price: number) => number;
  updatePositionPrices: (prices: Map<string, number>) => void;

  saveToStorage: () => void;
  loadFromStorage: () => void;
}

export interface TradeRecord {
  tokenId: string;
  tokenTicker: string;
  type: 'buy' | 'sell';
  amountSOL: number;
  amountTokens: number;
  price: number;
  timestamp: number;
  pnlSOL?: number;  // realized PnL for sell trades
}

const CLAIM_AMOUNT = 10;
const CLAIM_COOLDOWN = 3600000;
const STORAGE_KEY = 'trenches_portfolio';

export const usePortfolioStore = create<PortfolioStore>((set, get) => ({
  balance: 0,
  positions: new Map(),
  lastClaimTime: 0,
  realizedPnl: 0,
  unrealizedPnl: 0,
  tradeHistory: [],

  claimSOL: () => {
    const { lastClaimTime, balance } = get();
    if (Date.now() - lastClaimTime < CLAIM_COOLDOWN) return false;
    set({ balance: balance + CLAIM_AMOUNT, lastClaimTime: Date.now() });
    get().saveToStorage();
    return true;
  },

  // BUY: spend SOL → receive tokens
  // tokenAmount = (amountSOL * SOL_PRICE_USD) / price
  // e.g. 1 SOL * $88 / $0.01 = 8800 tokens
  buyToken: (tokenId, tokenName, tokenTicker, tokenAvatar, amountSOL, price) => {
    const { balance, positions, tradeHistory } = get();
    if (amountSOL <= 0 || amountSOL > balance) return false;

    const tokenAmount = (amountSOL * SOL_PRICE_USD) / price;
    const existing = positions.get(tokenId);
    const newPositions = new Map(positions);

    if (existing) {
      const totalTokens = existing.amount + tokenAmount;
      const totalInvested = existing.totalInvested + amountSOL;
      // Weighted average buy price in USD
      const avgBuyPrice = (totalInvested * SOL_PRICE_USD) / totalTokens;
      const currentValue = totalTokens * price / SOL_PRICE_USD;
      const pnl = currentValue - totalInvested;

      newPositions.set(tokenId, {
        ...existing,
        amount: totalTokens,
        avgBuyPrice,
        totalInvested,
        currentPrice: price,
        currentValue,
        pnl,
        pnlPercent: totalInvested > 0 ? (pnl / totalInvested) * 100 : 0,
      });
    } else {
      // Fresh position: currentValue = amountSOL (just bought at current price)
      newPositions.set(tokenId, {
        tokenId, tokenName, tokenTicker, tokenAvatar,
        amount: tokenAmount,
        avgBuyPrice: price,
        totalInvested: amountSOL,
        currentPrice: price,
        currentValue: amountSOL,  // at buy moment, value = invested
        pnl: 0,
        pnlPercent: 0,
      });
    }

    set({
      balance: balance - amountSOL,
      positions: newPositions,
      tradeHistory: [...tradeHistory.slice(-99), {
        tokenId, tokenTicker, type: 'buy',
        amountSOL, amountTokens: tokenAmount, price,
        timestamp: Date.now(),
      }],
    });
    get().saveToStorage();
    return true;
  },

  // SELL: return tokens → receive SOL
  // solReceived = amountTokens * price / SOL_PRICE_USD
  sellToken: (tokenId, amountTokens, price) => {
    const { balance, positions, tradeHistory, realizedPnl } = get();
    const position = positions.get(tokenId);
    if (!position || amountTokens <= 0 || amountTokens > position.amount) return 0;

    const solReceived = amountTokens * price / SOL_PRICE_USD;
    const sellFraction = amountTokens / position.amount;
    const investedForSold = position.totalInvested * sellFraction;
    const tradePnl = solReceived - investedForSold; // realized PnL for this trade

    const newPositions = new Map(positions);
    const remaining = position.amount - amountTokens;

    if (remaining < 0.001) {
      newPositions.delete(tokenId);
    } else {
      const remainingInvested = position.totalInvested * (1 - sellFraction);
      const remainingValue = remaining * price / SOL_PRICE_USD;
      const remainingPnl = remainingValue - remainingInvested;

      newPositions.set(tokenId, {
        ...position,
        amount: remaining,
        totalInvested: remainingInvested,
        currentPrice: price,
        currentValue: remainingValue,
        pnl: remainingPnl,
        pnlPercent: remainingInvested > 0 ? (remainingPnl / remainingInvested) * 100 : 0,
      });
    }

    set({
      balance: balance + solReceived,
      positions: newPositions,
      realizedPnl: realizedPnl + tradePnl,
      tradeHistory: [...tradeHistory.slice(-99), {
        tokenId, tokenTicker: position.tokenTicker, type: 'sell',
        amountSOL: solReceived, amountTokens, price,
        timestamp: Date.now(),
        pnlSOL: tradePnl,
      }],
    });
    get().saveToStorage();
    return solReceived;
  },

  // Called from App tick — updates all position prices from market data
  updatePositionPrices: (prices: Map<string, number>) => {
    const { positions } = get();
    if (positions.size === 0) return;

    let hasChanges = false;
    for (const [tokenId, newPrice] of prices) {
      const pos = positions.get(tokenId);
      if (pos && Math.abs(pos.currentPrice - newPrice) > 0.000001) {
        hasChanges = true;
        break;
      }
    }
    if (!hasChanges) return;

    const newPositions = new Map(positions);
    let unrealizedPnl = 0;

    for (const [tokenId, position] of newPositions) {
      const currentPrice = prices.get(tokenId);
      if (currentPrice !== undefined) {
        const currentValue = position.amount * currentPrice / SOL_PRICE_USD;
        const pnl = currentValue - position.totalInvested;
        const pnlPercent = position.totalInvested > 0
          ? (pnl / position.totalInvested) * 100
          : 0;

        newPositions.set(tokenId, {
          ...position,
          currentPrice,
          currentValue,
          pnl,
          pnlPercent,
        });
        unrealizedPnl += pnl;
      }
    }

    set({ positions: newPositions, unrealizedPnl });
  },

  saveToStorage: () => {
    const { balance, lastClaimTime, tradeHistory, realizedPnl } = get();
    const positions = Array.from(get().positions.entries());
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        balance, lastClaimTime, positions, tradeHistory, realizedPnl,
      }));
    } catch { /* */ }
  },

  loadFromStorage: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        set({
          balance: typeof parsed.balance === 'number' ? parsed.balance : 0,
          lastClaimTime: typeof parsed.lastClaimTime === 'number' ? parsed.lastClaimTime : 0,
          tradeHistory: Array.isArray(parsed.tradeHistory) ? parsed.tradeHistory : [],
          positions: Array.isArray(parsed.positions) ? new Map(parsed.positions) : new Map(),
          realizedPnl: typeof parsed.realizedPnl === 'number' ? parsed.realizedPnl : 0,
        });
      }
    } catch {
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* */ }
    }
  },
}));
