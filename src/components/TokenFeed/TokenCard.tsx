// ============================================================
// Token Card — single token in the feed list
// ============================================================

import { memo, useMemo } from 'react';
import type { Token } from '../../engine/tokenFactory';
import { formatPrice, formatMarketCap } from '../../utils/format';

interface TokenCardProps {
  token: Token;
  onClick: () => void;
}

const Sparkline = ({ prices }: { prices: number[] }) => {
  if (prices.length < 2) return null;

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const recent = prices.slice(-20);
  const isUp = recent[recent.length - 1] >= recent[0];

  return (
    <div className="sparkline">
      {recent.map((p, i) => {
        const height = Math.max(1, ((p - min) / range) * 20);
        return (
          <div
            key={i}
            className="sparkline-bar"
            style={{
              height: `${height}px`,
              background: isUp ? 'var(--green)' : 'var(--red)',
              opacity: 0.4 + (i / recent.length) * 0.6,
            }}
          />
        );
      })}
    </div>
  );
};

export const TokenCard = memo(({ token, onClick }: TokenCardProps) => {
  const priceChange = useMemo(() => {
    if (token.priceHistory.length < 2) return 0;
    const first = token.priceHistory[0];
    const last = token.priceHistory[token.priceHistory.length - 1];
    return ((last - first) / first) * 100;
  }, [token.priceHistory]);

  return (
    <div className="token-card" onClick={onClick}>
      <div className="avatar">{token.avatar}</div>

      <div className="token-info">
        <div className="token-name">{token.name}</div>
        <div className="token-ticker">${token.ticker}</div>
      </div>

      <Sparkline prices={token.priceHistory} />

      <div className="token-price">
        <div className="price-value">{formatPrice(token.priceState.price)}</div>
        <div className={`price-change ${priceChange >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>
          {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(1)}%
        </div>
        <div className="mcap">MC: {formatMarketCap(token.marketCap)}</div>
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.token.id === next.token.id &&
    prev.token.status === next.token.status &&
    prev.token.priceState.price === next.token.priceState.price &&
    prev.token.priceHistory.length === next.token.priceHistory.length
  );
});

TokenCard.displayName = 'TokenCard';
