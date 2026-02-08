// ============================================================
// Token Feed Expanded — 3 columns: New | Soon | Migrated
// ============================================================

import { useMemo } from 'react';
import { useMarketStore, getTokensFromState } from '../../store/marketStore';
import { TokenCard } from './TokenCard';

const COLUMNS: { status: 'new' | 'soon' | 'migrated'; label: string; color: string }[] = [
  { status: 'new',      label: 'NEW',      color: 'var(--green)' },
  { status: 'soon',     label: 'SOON',     color: 'var(--yellow)' },
  { status: 'migrated', label: 'MIGRATED', color: 'var(--blue)' },
];

export const TokenFeedExpanded = () => {
  const marketState = useMarketStore(s => s.marketState);
  const selectToken = useMarketStore(s => s.selectToken);

  const tokens = useMemo(() => getTokensFromState(marketState), [marketState]);

  const columns = useMemo(() => {
    const sorted = (status: string) =>
      tokens
        .filter(t => t.status === status)
        .sort((a, b) => b.priceState.price - a.priceState.price);

    return {
      new: sorted('new'),
      soon: sorted('soon'),
      migrated: sorted('migrated'),
    };
  }, [tokens]);

  return (
    <div className="feed-expanded">
      {COLUMNS.map(col => (
        <div key={col.status} className="feed-column">
          <div className="feed-column-header">
            <span className="feed-column-title" style={{ color: col.color }}>
              {col.label}
            </span>
            <span className="feed-column-count">
              {columns[col.status].length}
            </span>
          </div>

          <div className="scroll-content" style={{ flex: 1 }}>
            {columns[col.status].length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
                No tokens
              </div>
            ) : (
              columns[col.status].map(token => (
                <TokenCard
                  key={token.id}
                  token={token}
                  onClick={() => selectToken(token.id)}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
