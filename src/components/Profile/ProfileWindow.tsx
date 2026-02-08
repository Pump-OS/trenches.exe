// ============================================================
// Profile Window — SOL balance, claim, stats, history
// ============================================================

import { useMemo } from 'react';
import { usePortfolioStore, SOL_PRICE_USD } from '../../store/portfolioStore';
import { useMarketStore } from '../../store/marketStore';
import { formatSOLRaw, formatPnl } from '../../utils/format';
import { SolanaIcon } from '../SolanaIcon';

const StatBox = ({ label, value, className }: { label: string; value: string; className?: string }) => (
  <div className="stat-box">
    <div className="stat-label">{label}</div>
    <div className={`stat-value ${className || ''}`}>{value}</div>
  </div>
);

export const ProfileWindow = () => {
  const balance = usePortfolioStore(s => s.balance);
  const positions = usePortfolioStore(s => s.positions);
  const lastClaimTime = usePortfolioStore(s => s.lastClaimTime);
  const tradeHistory = usePortfolioStore(s => s.tradeHistory);
  const claimSOL = usePortfolioStore(s => s.claimSOL);
  const realizedPnl = usePortfolioStore(s => s.realizedPnl);
  const unrealizedPnl = usePortfolioStore(s => s.unrealizedPnl);
  const selectToken = useMarketStore(s => s.selectToken);

  const positionList = useMemo(
    () => Array.from(positions.values()),
    [positions]
  );

  const totalValueSOL = useMemo(() => {
    return positionList.reduce((sum, pos) => sum + pos.currentValue, 0);
  }, [positionList]);

  const totalPnl = realizedPnl + unrealizedPnl;

  const now = Date.now();
  const cooldownMs = 3600000;
  const timeSinceClaim = now - lastClaimTime;
  const canClaimNow = timeSinceClaim >= cooldownMs;
  const remainingSec = canClaimNow ? 0 : Math.ceil((cooldownMs - timeSinceClaim) / 1000);
  const remainingMin = Math.floor(remainingSec / 60);
  const remainingS = remainingSec % 60;

  const recentTrades = useMemo(
    () => tradeHistory.slice(-20).reverse(),
    [tradeHistory]
  );

  const netWorthUSD = (balance + totalValueSOL) * SOL_PRICE_USD;

  return (
    <div className="scroll-content" style={{ padding: 16, height: '100%' }}>
      {/* Balance section */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 28, fontWeight: 'bold', color: 'var(--green)',
          textAlign: 'center', margin: '8px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <SolanaIcon size={24} /> {formatSOLRaw(balance)}
        </div>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 11, marginBottom: 10 }}>
          ≈ ${(balance * SOL_PRICE_USD).toFixed(2)} USD
        </div>

        <button
          className="claim-button"
          onClick={canClaimNow ? claimSOL : undefined}
          disabled={!canClaimNow}
          style={{ width: '100%' }}
        >
          {canClaimNow
            ? '💰 CLAIM 10 SOL'
            : `⏱ ${remainingMin}:${remainingS.toString().padStart(2, '0')}`
          }
        </button>
      </div>

      {/* Stats */}
      <fieldset style={{ marginBottom: 16 }}>
        <legend>Stats</legend>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          <StatBox label="Net Worth" value={`$${netWorthUSD.toFixed(2)}`} />
          <StatBox
            label="Total PnL"
            value={`${formatPnl(totalPnl)} SOL`}
            className={totalPnl >= 0 ? 'pnl-positive' : 'pnl-negative'}
          />
          <StatBox label="Total Trades" value={String(tradeHistory.length)} />
          <StatBox
            label="Realized PnL"
            value={`${formatPnl(realizedPnl)} SOL`}
            className={realizedPnl >= 0 ? 'pnl-positive' : 'pnl-negative'}
          />
          <StatBox
            label="Unrealized PnL"
            value={`${formatPnl(unrealizedPnl)} SOL`}
            className={unrealizedPnl >= 0 ? 'pnl-positive' : 'pnl-negative'}
          />
          <StatBox label="Open Positions" value={String(positionList.length)} />
        </div>
      </fieldset>

      {/* Recent trades — clickable to navigate to chart */}
      <fieldset>
        <legend>Recent Trades</legend>
        <div style={{ fontSize: 11 }}>
          {recentTrades.length === 0 ? (
            <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-secondary)' }}>
              No trades yet. Start trading!
            </div>
          ) : (
            recentTrades.map(trade => (
              <div
                key={trade.timestamp}
                onClick={() => selectToken(trade.tokenId)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 8px', borderBottom: '1px solid var(--border)',
                  cursor: 'pointer', transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{
                  color: trade.type === 'buy' ? 'var(--green)' : 'var(--red)',
                  fontWeight: 'bold', minWidth: 80,
                }}>
                  {trade.type === 'buy' ? '▲ BUY' : '▼ SELL'} {trade.tokenTicker}
                </span>
                <span style={{ color: 'var(--text-primary)' }}>
                  {formatSOLRaw(trade.amountSOL)} SOL @ ${trade.price.toFixed(4)}
                </span>
                {trade.type === 'sell' && trade.pnlSOL !== undefined && (
                  <span className={trade.pnlSOL >= 0 ? 'pnl-positive' : 'pnl-negative'} style={{ fontSize: 10, fontWeight: 'bold' }}>
                    {trade.pnlSOL >= 0 ? '+' : ''}{trade.pnlSOL.toFixed(4)}
                  </span>
                )}
                <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                  {new Date(trade.timestamp).toLocaleTimeString()}
                </span>
                <span style={{ color: 'var(--blue)', fontSize: 10, marginLeft: 4 }}>→</span>
              </div>
            ))
          )}
        </div>
      </fieldset>
    </div>
  );
};
