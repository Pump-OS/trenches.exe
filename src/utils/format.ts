// ============================================================
// Formatting utilities — all functions are NaN/Infinity-safe
// ============================================================

function safeNum(n: number, fallback: string = '$0.00'): string | null {
  if (!isFinite(n) || isNaN(n)) return fallback;
  return null;
}

export function formatPrice(price: number): string {
  const bad = safeNum(price, '$0.00');
  if (bad) return bad;
  if (price >= 1000) return `$${(price / 1000).toFixed(2)}K`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  if (price >= 0.001) return `$${price.toFixed(5)}`;
  return `$${price.toFixed(6)}`;
}

export function formatSOL(amount: number): string {
  const bad = safeNum(amount, '0 SOL');
  if (bad) return bad;
  if (amount >= 1000) return `${(amount / 1000).toFixed(2)}K SOL`;
  if (amount >= 1) return `${amount.toFixed(2)} SOL`;
  return `${amount.toFixed(4)} SOL`;
}

// Plain number (no "SOL" suffix) for use with ◎ prefix
export function formatSOLRaw(amount: number): string {
  const bad = safeNum(amount, '0.00');
  if (bad) return bad;
  if (amount >= 1000) return `${(amount / 1000).toFixed(2)}K`;
  if (amount >= 1) return `${amount.toFixed(2)}`;
  return `${amount.toFixed(4)}`;
}

// Both "formatPnL" and "formatPnl" work (common import mistake)
export function formatPnL(value: number): string {
  const bad = safeNum(value, '0.00');
  if (bad) return bad;
  const sign = value >= 0 ? '+' : '';
  if (Math.abs(value) >= 1000) return `${sign}${(value / 1000).toFixed(2)}K`;
  return `${sign}${value.toFixed(2)}`;
}
export const formatPnl = formatPnL;

export function formatPercent(value: number): string {
  const bad = safeNum(value, '0.0%');
  if (bad) return bad;
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function formatMarketCap(mc: number): string {
  const bad = safeNum(mc, '$0');
  if (bad) return bad;
  if (mc >= 1_000_000_000) return `$${(mc / 1_000_000_000).toFixed(1)}B`;
  if (mc >= 1_000_000) return `$${(mc / 1_000_000).toFixed(1)}M`;
  if (mc >= 1_000) return `$${(mc / 1_000).toFixed(1)}K`;
  return `$${mc.toFixed(0)}`;
}

export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatNumber(n: number): string {
  const bad = safeNum(n, '0');
  if (bad) return bad;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}
