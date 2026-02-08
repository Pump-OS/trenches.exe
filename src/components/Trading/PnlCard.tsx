// ============================================================
// PnL Result Card — shows after closing a trade
// Animated overlay with profit/loss summary
// ============================================================

import { useEffect, useState } from 'react';

export interface PnlResult {
  tokenName: string;
  tokenTicker: string;
  tokenAvatar: string;
  pnlSOL: number;
  pnlPercent: number;
  soldSOL: number;
  investedSOL: number;
}

interface PnlCardProps {
  result: PnlResult;
  onClose: () => void;
}

function getTitle(pnlPercent: number): { text: string; emoji: string } {
  if (pnlPercent >= 500)  return { text: 'LEGENDARY TRADE',      emoji: '👑' };
  if (pnlPercent >= 100)  return { text: 'INSANE PROFIT',        emoji: '🔥' };
  if (pnlPercent >= 50)   return { text: 'GREAT TRADE',          emoji: '🚀' };
  if (pnlPercent >= 10)   return { text: 'NICE PROFIT',          emoji: '💰' };
  if (pnlPercent >= 0)    return { text: 'TRADE CLOSED',         emoji: '📊' };
  if (pnlPercent >= -20)  return { text: 'SMALL LOSS',           emoji: '😐' };
  if (pnlPercent >= -50)  return { text: 'OUCH...',              emoji: '😬' };
  return                          { text: 'REKT',                 emoji: '💀' };
}

export const PnlCard = ({ result, onClose }: PnlCardProps) => {
  const [visible, setVisible] = useState(false);
  const isProfit = result.pnlSOL >= 0;
  const { text: title, emoji } = getTitle(result.pnlPercent);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="pnl-overlay" onClick={onClose}>
      <div
        className={`pnl-card ${visible ? 'pnl-card-visible' : ''} ${isProfit ? 'pnl-card-profit' : 'pnl-card-loss'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Top emoji row */}
        <div className="pnl-card-emoji">{emoji}</div>

        {/* Title */}
        <div className="pnl-card-title">{title}</div>

        {/* Token */}
        <div className="pnl-card-token">
          <span style={{ fontSize: 20 }}>{result.tokenAvatar}</span>
          <span>{result.tokenName}</span>
          <span style={{ color: 'var(--text-muted)' }}>${result.tokenTicker}</span>
        </div>

        {/* Big PnL number */}
        <div className={`pnl-card-amount ${isProfit ? 'pnl-positive' : 'pnl-negative'}`}>
          {isProfit ? '+' : ''}{result.pnlSOL.toFixed(4)} SOL
        </div>

        {/* PnL percent */}
        <div className={`pnl-card-percent ${isProfit ? 'pnl-positive' : 'pnl-negative'}`}>
          {isProfit ? '+' : ''}{result.pnlPercent.toFixed(1)}%
        </div>

        {/* Details row */}
        <div className="pnl-card-details">
          <div className="pnl-card-detail">
            <span className="pnl-card-detail-label">Invested</span>
            <span>{result.investedSOL.toFixed(4)} SOL</span>
          </div>
          <div className="pnl-card-detail">
            <span className="pnl-card-detail-label">Received</span>
            <span>{result.soldSOL.toFixed(4)} SOL</span>
          </div>
        </div>

        {/* Close hint */}
        <div className="pnl-card-close">click to close</div>
      </div>
    </div>
  );
};
