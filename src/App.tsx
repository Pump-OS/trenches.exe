// ============================================================
// App.tsx — Full-screen terminal interface
// Top nav: Market | Chart | Portfolio | Profile | Quests
// Default view: Market (3-column feed)
// ============================================================

import { useEffect, useState, useCallback, useRef } from 'react';
import './styles/win98-overrides.css';

import { TokenFeedExpanded } from './components/TokenFeed/TokenFeedExpanded';
import { TradingWindow } from './components/Trading/TradingWindow';
import { PortfolioWindow } from './components/Portfolio/PortfolioWindow';
import { ProfileWindow } from './components/Profile/ProfileWindow';
import { QuestWindow } from './components/Quests/QuestWindow';
import { ToastContainer } from './components/Notifications/ToastContainer';
import { useMarketStore } from './store/marketStore';
import { usePortfolioStore } from './store/portfolioStore';
import { useQuestStore } from './store/questStore';
import { useNotificationStore } from './store/notificationStore';
import { formatSOLRaw } from './utils/format';
import { SolanaIcon } from './components/SolanaIcon';

type Page = 'market' | 'chart' | 'portfolio' | 'profile' | 'quests';

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: 'market',    icon: '📡', label: 'Market' },
  { id: 'chart',     icon: '📈', label: 'Chart' },
  { id: 'portfolio', icon: '💼', label: 'Portfolio' },
  { id: 'profile',   icon: '👤', label: 'Profile' },
  { id: 'quests',    icon: '⚔️', label: 'Quests' },
];

function App() {
  const [page, setPage] = useState<Page>('market');

  const initialize      = useMarketStore(s => s.initialize);
  const tick            = useMarketStore(s => s.tick);
  const selectedTokenId = useMarketStore(s => s.selectedTokenId);
  const selectionSeq    = useMarketStore(s => s.selectionSeq);
  const loadPortfolio   = usePortfolioStore(s => s.loadFromStorage);
  const balance         = usePortfolioStore(s => s.balance);
  const initQuests      = useQuestStore(s => s.initializeQuests);
  const loadQuests      = useQuestStore(s => s.loadFromStorage);
  const checkQuests     = useQuestStore(s => s.checkQuests);
  const trackPositionCount = useQuestStore(s => s.trackPositionCount);
  const trackHoldingDown50 = useQuestStore(s => s.trackHoldingDown50);
  const trackProfit      = useQuestStore(s => s.trackProfit);
  const trackTokensAtLoss = useQuestStore(s => s.trackTokensAtLoss);
  const addNotification = useNotificationStore(s => s.addNotification);

  const questTickRef = useRef(0);

  // Initialize simulation
  useEffect(() => {
    initialize();
    loadPortfolio();
    initQuests();
    loadQuests();

    const intervalId = window.setInterval(() => {
      try {
        const events = tick();
        const positions = usePortfolioStore.getState().positions;
        const updatePrices = usePortfolioStore.getState().updatePositionPrices;

        for (const ev of events) {
          if (ev.type === 'new_token') {
            addNotification({
              type: 'new_token',
              title: 'NEW TOKEN DETECTED',
              message: `${ev.tokenName} ($${ev.tokenTicker}) just launched!`,
              icon: '🆕',
              tokenId: ev.tokenId,
            });
          } else if (ev.type === 'migration') {
            addNotification({
              type: 'migration',
              title: 'MIGRATION!',
              message: `${ev.tokenName} ($${ev.tokenTicker}) hit $1.00!`,
              icon: '🚀',
              tokenId: ev.tokenId,
            });
          }
        }

        // Update position prices every tick so PnL is always live
        if (positions.size > 0) {
          const marketState = useMarketStore.getState().marketState;
          const prices = new Map<string, number>();
          for (const pos of positions.values()) {
            const token = marketState.tokens.get(pos.tokenId);
            if (token) prices.set(pos.tokenId, token.priceState.price);
          }
          if (prices.size > 0) updatePrices(prices);
        }

        // Quest tracking every 5 ticks
        questTickRef.current++;
        if (questTickRef.current % 5 === 0 && positions.size > 0) {
          trackPositionCount(positions.size);
          const marketState = useMarketStore.getState().marketState;
          let lossCount = 0;
          for (const pos of positions.values()) {
            const token = marketState.tokens.get(pos.tokenId);
            if (token) {
              const pnlPercent = ((token.priceState.price / pos.avgBuyPrice) - 1) * 100;
              if (pnlPercent <= -50) trackHoldingDown50();
              if (pnlPercent < 0) lossCount++;
              const multiple = token.priceState.price / pos.avgBuyPrice;
              if (multiple > 1) trackProfit(multiple);
            }
          }
          if (lossCount > 0) trackTokensAtLoss(lossCount);
        }
        checkQuests();
      } catch (err) {
        console.error('[trenches] tick error:', err);
      }
    }, 500);

    return () => window.clearInterval(intervalId);
  }, []); // eslint-disable-line

  // Auto-switch to chart when token selected (selectionSeq ensures re-select works)
  useEffect(() => {
    if (selectedTokenId) {
      setPage('chart');
    }
  }, [selectedTokenId, selectionSeq]);

  const navigateTo = useCallback((p: Page) => setPage(p), []);

  return (
    <div className="terminal">
      {/* Top navigation bar */}
      <header className="terminal-nav">
        <div className="nav-brand">
          <span className="nav-logo">▸</span>
          <span className="nav-title">trenches.exe</span>
        </div>

        <nav className="nav-links">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`nav-btn ${page === item.id ? 'active' : ''}`}
              onClick={() => navigateTo(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="nav-balance">
          <span className="balance-icon"><SolanaIcon size={16} /></span>
          <span className="balance-value">{formatSOLRaw(balance)}</span>
        </div>
      </header>

      {/* Main content */}
      <main className="terminal-content">
        {page === 'market'    && <TokenFeedExpanded />}
        {page === 'chart'     && <TradingWindow />}
        {page === 'portfolio' && <PortfolioWindow />}
        {page === 'profile'   && <ProfileWindow />}
        {page === 'quests'    && <QuestWindow />}
      </main>

      <ToastContainer />
    </div>
  );
}

export default App;
