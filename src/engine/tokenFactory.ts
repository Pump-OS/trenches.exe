// ============================================================
// Token Factory — creates and manages token lifecycle
// New ($0.01-$0.10) → Soon ($0.10-$1.00) → Migrated ($1.00+)
// ============================================================

import { createPriceState } from './priceEngine';
import type { PriceState } from './priceEngine';
import { generateTokenIdentity } from './nameGenerator';
import { createCandleStore } from './candleAggregator';
import type { CandleStore } from './candleAggregator';

export type TokenStatus = 'new' | 'soon' | 'migrated';

export interface Token {
  id: string;
  name: string;
  ticker: string;
  avatar: string;
  status: TokenStatus;
  priceState: PriceState;
  candleStore: CandleStore;
  createdAt: number;
  migratedAt: number | null;
  liquidity: number;
  marketCap: number;
  priceHistory: number[];
  totalSupply: number;
}

let tokenIdCounter = 0;

function generateId(): string {
  tokenIdCounter++;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${result}${tokenIdCounter}`;
}

const STATUS_THRESHOLDS = {
  new: { min: 0.01, max: 0.1 },
  soon: { min: 0.1, max: 1.0 },
  migrated: { min: 1.0, max: Infinity },
};

export function createToken(): Token {
  const identity = generateTokenIdentity();
  const initialPrice = 0.01;
  const totalSupply = 1_000_000;

  return {
    id: generateId(),
    name: identity.name,
    ticker: identity.ticker,
    avatar: identity.avatar,
    status: 'new',
    priceState: createPriceState(initialPrice),
    candleStore: createCandleStore(),
    createdAt: Date.now(),
    migratedAt: null,
    liquidity: 50 + Math.random() * 200,
    marketCap: initialPrice * totalSupply,
    priceHistory: [initialPrice],
    totalSupply,
  };
}

export function updateTokenStatus(token: Token): TokenStatus {
  const price = token.priceState.price;

  if (price >= STATUS_THRESHOLDS.migrated.min && token.status !== 'migrated') {
    token.status = 'migrated';
    token.migratedAt = Date.now();
    return 'migrated';
  }

  if (price >= STATUS_THRESHOLDS.soon.min && token.status === 'new') {
    token.status = 'soon';
    return 'soon';
  }

  if (price < STATUS_THRESHOLDS.soon.min && token.status === 'soon') {
    token.status = 'new';
    return 'new';
  }

  return token.status;
}

export function shouldSpawnToken(currentTokenCount: number): boolean {
  const TARGET_TOKENS = 40;
  if (currentTokenCount >= 50) return false;
  if (currentTokenCount < 30) return Math.random() < 0.1;
  const spawnRate = Math.max(0.005, 0.05 * (1 - currentTokenCount / TARGET_TOKENS));
  return Math.random() < spawnRate;
}
