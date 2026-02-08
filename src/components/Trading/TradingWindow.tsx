// ============================================================
// Trading Window — chart + buy/sell panel for selected token
// ============================================================

import { useState, useMemo, useCallback } from 'react';
import { useMarketStore, getTokenFromState, getCandlesFromState } from '../../store/marketStore';
import { usePortfolioStore, SOL_PRICE_USD } from '../../store/portfolioStore';
import { useQuestStore } from '../../store/questStore';
import { CandleChart } from './CandleChart';
import { PnlCard } from './PnlCard';
import type { PnlResult } from './PnlCard';
import type { TradeMarker } from './CandleChart';
import type { Timeframe } from '../../engine/candleAggregator';
import { formatPrice, formatMarketCap, formatSOL, formatPercent } from '../../utils/format';
import { playKaChing } from '../../utils/sound';

const TIMEFRAMES: Timeframe[] = ['1s', '5s', '1m', '5m'];
const AMOUNT_PRESETS = [0.1, 0.5, 1, 5, 10];

export const TradingWindow = () => {
  const selectedTokenId = useMarketStore(s => s.selectedTokenId);
  const selectedTimeframe = useMarketStore(s => s.selectedTimeframe);
  const setTimeframe = useMarketStore(s => s.setTimeframe);
  const marketState = useMarketStore(s => s.marketState);
  const executeTrade = useMarketStore(s => s.executeTrade);

  const balance = usePortfolioStore(s => s.balance);
  const buyToken = usePortfolioStore(s => s.buyToken);
  const sellToken = usePortfolioStore(s => s.sellToken);
  const positions = usePortfolioStore(s => s.positions);
  const tradeHistory = usePortfolioStore(s => s.tradeHistory);

  const trackTrade = useQuestStore(s => s.trackTrade);
  const trackSOLEarned = useQuestStore(s => s.trackSOLEarned);

  const [buyAmount, setBuyAmount] = useState('1');
  const [sellPercent, setSellPercent] = useState(100);
  const [pnlResult, setPnlResult] = useState<PnlResult | null>(null);

  const token = useMemo(
    () => selectedTokenId ? getTokenFromState(marketState, selectedTokenId) : undefined,
    [marketState, selectedTokenId]
  );

  const candles = useMemo(
    () => selectedTokenId ? getCandlesFromState(marketState, selectedTokenId, selectedTimeframe) : [],
    [marketState, selectedTokenId, selectedTimeframe]
  );

  const position = useMemo(
    () => selectedTokenId ? positions.get(selectedTokenId) : undefined,
    [positions, selectedTokenId]
  );

  // Compute live PnL from actual current market price
  const livePnl = useMemo(() => {
    if (!position || !token) return { value: 0, pnlSOL: 0, pnlPercent: 0 };
    const currentValue = position.amount * token.priceState.price / SOL_PRICE_USD;
    const pnlSOL = currentValue - position.totalInvested;
    const pnlPercent = position.totalInvested > 0
      ? (pnlSOL / position.totalInvested) * 100
      : 0;
    return { value: currentValue, pnlSOL, pnlPercent };
  }, [position, token]);

  // Trade markers for this token
  const tradeMarkers: TradeMarker[] = useMemo(() => {
    if (!selectedTokenId) return [];
    return tradeHistory
      .filter(t => t.tokenId === selectedTokenId)
      .map(t => ({
        time: Math.floor(t.timestamp / 1000),
        type: t.type,
        price: t.price,
        label: `${t.amountSOL.toFixed(2)} SOL`,
      }));
  }, [tradeHistory, selectedTokenId]);

  const handleBuy = useCallback(() => {
    if (!token) return;
    const amount = parseFloat(buyAmount);
    if (isNaN(amount) || amount <= 0 || amount > balance) return;

    const success = buyToken(token.id, token.name, token.ticker, token.avatar, amount, token.priceState.price);
    if (success) {
      executeTrade(token.id, amount, true);
      trackTrade('buy');
      playKaChing();
    }
  }, [token, buyAmount, balance, buyToken, executeTrade, trackTrade]);

  const handleSell = useCallback(() => {
    if (!token || !position) return;
    const tokensToSell = position.amount * (sellPercent / 100);
    if (tokensToSell <= 0) return;

    // Snapshot PnL BEFORE selling
    const currentValue = position.amount * token.priceState.price / SOL_PRICE_USD;
    const pnlSOL = currentValue - position.totalInvested;
    const pnlPercent = position.totalInvested > 0
      ? ((currentValue / position.totalInvested) - 1) * 100
      : 0;
    const sellFraction = sellPercent / 100;
    const investedForSold = position.totalInvested * sellFraction;

    const solReceived = sellToken(token.id, tokensToSell, token.priceState.price);
    if (solReceived > 0) {
      executeTrade(token.id, solReceived, false);
      trackTrade('sell', pnlPercent);
      trackSOLEarned(solReceived);
      playKaChing();

      // Show PnL result card
      setPnlResult({
        tokenName: token.name,
        tokenTicker: token.ticker,
        tokenAvatar: token.avatar,
        pnlSOL: pnlSOL * sellFraction,
        pnlPercent,
        soldSOL: solReceived,
        investedSOL: investedForSold,
      });
    }
  }, [token, position, sellPercent, sellToken, executeTrade, trackTrade, trackSOLEarned]);

  if (!token) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', color: 'var(--text-muted)', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ fontSize: 48, opacity: 0.3 }}>📈</div>
        <div style={{ fontSize: 14 }}>Select a token from the Market to start trading</div>
      </div>
    );
  }

  const priceChange = token.priceHistory.length >= 2
    ? ((token.priceState.price - token.priceHistory[0]) / token.priceHistory[0]) * 100
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0 16px 12px' }}>
      {/* Token header */}
      <div className="trading-header">
        <div style={{ fontSize: 28 }}>{token.avatar}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', fontSize: 15 }}>
            {token.name}
            {token.status === 'migrated' && <span style={{ color: 'var(--blue)', marginLeft: 8, fontSize: 11 }}>✅ MIGRATED</span>}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
            ${token.ticker} · MC: {formatMarketCap(token.marketCap)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 'bold', fontSize: 18 }}>
            {formatPrice(token.priceState.price)}
          </div>
          <div className={priceChange >= 0 ? 'pnl-positive' : 'pnl-negative'} style={{ fontSize: 13 }}>
            {formatPercent(priceChange)}
          </div>
        </div>
      </div>

      {/* Timeframe selector */}
      <div className="timeframe-bar">
        {TIMEFRAMES.map(tf => (
          <button
            key={tf}
            className={`tf-btn ${selectedTimeframe === tf ? 'active' : ''}`}
            onClick={() => setTimeframe(tf)}
          >
            {tf}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className={`status-${token.status}`}>●</span>
          {token.status.toUpperCase()}
        </div>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: 200 }}>
        <CandleChart
          candles={candles}
          timeframe={selectedTimeframe}
          migrationPrice={token.status !== 'migrated' ? 1.0 : undefined}
          avgEntryPrice={position?.avgBuyPrice}
          tradeMarkers={tradeMarkers}
        />
      </div>

      {/* Position info — live PnL */}
      {position && (
        <div style={{
          padding: '6px 12px', background: 'var(--bg-panel)', border: '1px solid var(--border)',
          borderRadius: 4, display: 'flex', justifyContent: 'space-between', fontSize: 12,
          margin: '6px 0',
        }}>
          <span>
            Position: {formatSOL(livePnl.value)}
            <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 10 }}>
              AVG: ${position.avgBuyPrice.toFixed(4)}
            </span>
          </span>
          <span className={livePnl.pnlSOL >= 0 ? 'pnl-positive' : 'pnl-negative'}>
            PnL: {livePnl.pnlSOL >= 0 ? '+' : ''}{livePnl.pnlSOL.toFixed(4)} SOL ({formatPercent(livePnl.pnlPercent)})
          </span>
        </div>
      )}

      {/* Buy/Sell panel */}
      <div className="order-panel">
        <div className="order-side">
          <label>Buy Amount (SOL)</label>
          <input
            type="number" value={buyAmount}
            onChange={e => setBuyAmount(e.target.value)}
            min="0" step="0.1" placeholder="Amount in SOL"
          />
          <div className="amount-presets">
            {AMOUNT_PRESETS.map(a => (
              <button key={a} onClick={() => setBuyAmount(String(a))}>{a}</button>
            ))}
          </div>
          <button
            className="btn-buy"
            onClick={handleBuy}
            disabled={!buyAmount || parseFloat(buyAmount) <= 0 || parseFloat(buyAmount) > balance}
            style={{ width: '100%', marginTop: 4 }}
          >
            BUY {token.ticker}
          </button>
        </div>

        <div className="order-side">
          <label>Sell Amount ({sellPercent}%)</label>
          <input
            type="range" min="1" max="100" value={sellPercent}
            onChange={e => setSellPercent(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--red)' }}
          />
          <div className="amount-presets">
            {[25, 50, 75, 100].map(p => (
              <button key={p} onClick={() => setSellPercent(p)}>{p}%</button>
            ))}
          </div>
          <button
            className="btn-sell"
            onClick={handleSell}
            disabled={!position || position.amount <= 0}
            style={{ width: '100%', marginTop: 4 }}
          >
            SELL {sellPercent}%
          </button>
        </div>
      </div>

      {/* PnL result card overlay */}
      {pnlResult && (
        <PnlCard result={pnlResult} onClose={() => setPnlResult(null)} />
      )}
    </div>
  );
};
