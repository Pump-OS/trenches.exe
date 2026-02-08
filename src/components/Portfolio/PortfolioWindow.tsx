// ============================================================
// Portfolio Window — positions list + live dynamic PnL
// ============================================================

import { useMemo } from 'react';
import { usePortfolioStore, SOL_PRICE_USD } from '../../store/portfolioStore';
import { useMarketStore } from '../../store/marketStore';
import { formatSOL, formatPrice, formatPercent, formatPnL } from '../../utils/format';
import { SolanaIcon } from '../SolanaIcon';

export const PortfolioWindow = () => {
  const positions = usePortfolioStore(s => s.positions);
  const balance = usePortfolioStore(s => s.balance);
  const realizedPnl = usePortfolioStore(s => s.realizedPnl);
  const selectToken = useMarketStore(s => s.selectToken);
  const marketState = useMarketStore(s => s.marketState);

  // Compute live position data from current market prices
  const livePositions = useMemo(() => {
    const result: {
      tokenId: string; tokenName: string; tokenTicker: string; tokenAvatar: string;
      amount: number; avgBuyPrice: number; totalInvested: number;
      currentPrice: number; currentValue: number; pnl: number; pnlPercent: number;
    }[] = [];

    for (const pos of positions.values()) {
      const token = marketState.tokens.get(pos.tokenId);
      const price = token ? token.priceState.price : pos.currentPrice;
      const currentValue = pos.amount * price / SOL_PRICE_USD;
      const pnl = currentValue - pos.totalInvested;
      const pnlPercent = pos.totalInvested > 0 ? (pnl / pos.totalInvested) * 100 : 0;

      result.push({
        tokenId: pos.tokenId,
        tokenName: pos.tokenName,
        tokenTicker: pos.tokenTicker,
        tokenAvatar: pos.tokenAvatar,
        amount: pos.amount,
        avgBuyPrice: pos.avgBuyPrice,
        totalInvested: pos.totalInvested,
        currentPrice: price,
        currentValue,
        pnl,
        pnlPercent,
      });
    }

    return result.sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
  }, [positions, marketState]);

  const totalValue = livePositions.reduce((s, p) => s + p.currentValue, 0);
  const totalInvested = livePositions.reduce((s, p) => s + p.totalInvested, 0);
  const unrealizedPnl = livePositions.reduce((s, p) => s + p.pnl, 0);
  const totalPnl = realizedPnl + unrealizedPnl;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* PnL Summary */}
      <div className="pnl-summary">
        <div>
          <div className="label">Balance</div>
          <div className="value" style={{ color: 'var(--yellow)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <SolanaIcon size={16} /> {balance.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="label">Positions</div>
          <div className="value">{formatSOL(totalValue)}</div>
        </div>
        <div>
          <div className="label">Invested</div>
          <div className="value">{formatSOL(totalInvested)}</div>
        </div>
        <div>
          <div className="label">Unrealized</div>
          <div className={`value ${unrealizedPnl >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>
            {formatPnL(unrealizedPnl)} SOL
          </div>
        </div>
        <div>
          <div className="label">Realized</div>
          <div className={`value ${realizedPnl >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>
            {formatPnL(realizedPnl)} SOL
          </div>
        </div>
        <div>
          <div className="label">Total PnL</div>
          <div className={`value ${totalPnl >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>
            {formatPnL(totalPnl)} SOL
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'flex', padding: '6px 12px', borderBottom: '1px solid var(--border-light)',
        fontSize: 10, color: 'var(--text-muted)', fontWeight: 'bold',
      }}>
        <span style={{ width: 28 }} />
        <span style={{ flex: 2 }}>Token</span>
        <span style={{ flex: 1, textAlign: 'right' }}>Price</span>
        <span style={{ flex: 1, textAlign: 'right' }}>Value</span>
        <span style={{ flex: 1, textAlign: 'right' }}>PnL</span>
      </div>

      {/* Positions list */}
      <div className="scroll-content" style={{ flex: 1 }}>
        {livePositions.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💼</div>
            No positions yet. Buy some tokens!
          </div>
        ) : (
          livePositions.map(pos => (
            <div
              key={pos.tokenId}
              className="position-row"
              onClick={() => selectToken(pos.tokenId)}
            >
              <div style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{pos.tokenAvatar}</div>
              <div className="pos-info" style={{ flex: 2 }}>
                <div className="pos-name">{pos.tokenName}</div>
                <div className="pos-amount">${pos.tokenTicker}</div>
              </div>
              <div style={{ flex: 1, textAlign: 'right', fontSize: 11 }}>
                <div>{formatPrice(pos.currentPrice)}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                  avg {formatPrice(pos.avgBuyPrice)}
                </div>
              </div>
              <div style={{ flex: 1, textAlign: 'right', fontSize: 11 }}>
                <div>{formatSOL(pos.currentValue)}</div>
                <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                  cost {formatSOL(pos.totalInvested)}
                </div>
              </div>
              <div className="pos-pnl" style={{ flex: 1 }}>
                <div className={`pos-value ${pos.pnl >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>
                  {formatPnL(pos.pnl)} SOL
                </div>
                <div className={`pos-percent ${pos.pnlPercent >= 0 ? 'pnl-positive' : 'pnl-negative'}`}>
                  {formatPercent(pos.pnlPercent)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '4px 12px', borderTop: '1px solid var(--border)',
        fontSize: 10, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between',
      }}>
        <span>{livePositions.length} positions</span>
        <span>Net Worth: {formatSOL(balance + totalValue)}</span>
      </div>
    </div>
  );
};
