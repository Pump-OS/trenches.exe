// ============================================================
// Candle Aggregator
// Aggregates raw price ticks into OHLCV candles for multiple timeframes
// ============================================================

export interface Candle {
  time: number;     // timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = '1s' | '5s' | '1m' | '5m';

export const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  '1s': 1,
  '5s': 5,
  '1m': 60,
  '5m': 300,
};

export interface CandleStore {
  candles: Record<Timeframe, Candle[]>;
  currentCandle: Record<Timeframe, Candle | null>;
}

const MAX_CANDLES = 500; // keep last 500 candles per timeframe

export function createCandleStore(): CandleStore {
  return {
    candles: {
      '1s': [],
      '5s': [],
      '1m': [],
      '5m': [],
    },
    currentCandle: {
      '1s': null,
      '5s': null,
      '1m': null,
      '5m': null,
    },
  };
}

export function addTick(
  store: CandleStore,
  price: number,
  high: number,
  low: number,
  open: number,
  volume: number,
  timestamp: number
): CandleStore {
  const newStore = { ...store };
  const timeframes: Timeframe[] = ['1s', '5s', '1m', '5m'];
  
  for (const tf of timeframes) {
    const seconds = TIMEFRAME_SECONDS[tf];
    const candleTime = Math.floor(timestamp / seconds) * seconds;
    const current = store.currentCandle[tf];
    
    if (!current || current.time !== candleTime) {
      // Close previous candle and start new one
      if (current) {
        newStore.candles = {
          ...newStore.candles,
          [tf]: [...store.candles[tf].slice(-MAX_CANDLES + 1), current],
        };
      }
      newStore.currentCandle = {
        ...newStore.currentCandle,
        [tf]: {
          time: candleTime,
          open: open,
          high: Math.max(high, open, price),
          low: Math.min(low, open, price),
          close: price,
          volume: volume,
        },
      };
    } else {
      // Update current candle
      newStore.currentCandle = {
        ...newStore.currentCandle,
        [tf]: {
          ...current,
          high: Math.max(current.high, high, price),
          low: Math.min(current.low, low, price),
          close: price,
          volume: current.volume + volume,
        },
      };
    }
  }
  
  return newStore;
}

export function getAllCandles(store: CandleStore, tf: Timeframe): Candle[] {
  const completed = store.candles[tf];
  const current = store.currentCandle[tf];
  if (current) {
    return [...completed, current];
  }
  return completed;
}
