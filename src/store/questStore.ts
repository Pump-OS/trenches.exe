// ============================================================
// Quest Store — side quests / achievements system
// ============================================================

import { create } from 'zustand';

export interface Quest {
  id: string;
  title: string;
  description: string;
  icon: string;
  reward: number;
  completed: boolean;
  progress: number;
  target: number;
  current: number;
  category: 'trading' | 'holding' | 'degen';
}

interface QuestStore {
  quests: Quest[];
  completedCount: number;

  stats: {
    totalTrades: number;
    totalBuys: number;
    totalSells: number;
    consecutiveLosses: number;
    consecutiveWins: number;
    maxProfitMultiple: number;
    tokensHeldSimultaneously: number;
    tokensAtLoss: number;
    totalSOLEarned: number;
    heldWhileDown50: boolean;
    speedTrades: number[];
  };

  initializeQuests: () => void;
  trackTrade: (type: 'buy' | 'sell', pnlPercent?: number) => void;
  trackPositionCount: (count: number) => void;
  trackProfit: (multiple: number) => void;
  trackSOLEarned: (amount: number) => void;
  trackHoldingDown50: () => void;
  trackTokensAtLoss: (count: number) => void;
  checkQuests: () => Quest[];
  getQuests: () => Quest[];

  saveToStorage: () => void;
  loadFromStorage: () => void;
}

const QUEST_STORAGE_KEY = 'trenches_quests';

const INITIAL_QUESTS: Omit<Quest, 'completed' | 'progress' | 'current'>[] = [
  { id: 'first_blood', title: 'First Blood', description: 'Make your first trade', icon: '🩸', reward: 0, target: 1, category: 'trading' },
  { id: 'diamond_hands', title: 'Diamond Hands', description: 'Hold a position while it\'s down 50%+', icon: '💎', reward: 2, target: 1, category: 'holding' },
  { id: 'paper_hands', title: 'Paper Hands', description: 'Sell at a loss 3 times in a row', icon: '🧻', reward: 0, target: 3, category: 'degen' },
  { id: 'to_the_moon', title: 'To The Moon', description: 'Make 10x profit on a single position', icon: '🚀', reward: 5, target: 10, category: 'trading' },
  { id: 'bag_holder', title: 'Bag Holder', description: 'Hold 3 tokens at a loss simultaneously', icon: '💰', reward: 2, target: 3, category: 'holding' },
  { id: 'degen_lord', title: 'Degen Lord', description: 'Hold 10+ tokens simultaneously', icon: '👑', reward: 5, target: 10, category: 'degen' },
  { id: 'speed_runner', title: 'Speed Runner', description: 'Make 20 trades in 5 minutes', icon: '⚡', reward: 3, target: 20, category: 'trading' },
  { id: 'whale_alert', title: 'Whale Alert', description: 'Accumulate 500 SOL total earned', icon: '🐳', reward: 10, target: 500, category: 'holding' },
  { id: 'portfolio_diversifier', title: 'Portfolio Diversifier', description: 'Hold 5 different tokens at once', icon: '📊', reward: 2, target: 5, category: 'holding' },
  { id: 'lucky_trader', title: 'Lucky Trader', description: 'Make a profitable trade 5 times in a row', icon: '🍀', reward: 3, target: 5, category: 'trading' },
];

export const useQuestStore = create<QuestStore>((set, get) => ({
  quests: [],
  completedCount: 0,
  stats: {
    totalTrades: 0, totalBuys: 0, totalSells: 0,
    consecutiveLosses: 0, consecutiveWins: 0,
    maxProfitMultiple: 0, tokensHeldSimultaneously: 0,
    tokensAtLoss: 0, totalSOLEarned: 0,
    heldWhileDown50: false, speedTrades: [],
  },

  initializeQuests: () => {
    if (get().quests.length > 0) return;
    set({ quests: INITIAL_QUESTS.map(q => ({ ...q, completed: false, progress: 0, current: 0 })) });
  },

  trackTrade: (type, pnlPercent) => {
    const { stats } = get();
    const now = Date.now();
    const newStats = { ...stats };
    newStats.totalTrades++;
    if (type === 'buy') newStats.totalBuys++;
    if (type === 'sell') {
      newStats.totalSells++;
      if (pnlPercent !== undefined && pnlPercent < 0) { newStats.consecutiveLosses++; newStats.consecutiveWins = 0; }
      else if (pnlPercent !== undefined && pnlPercent > 0) { newStats.consecutiveWins++; newStats.consecutiveLosses = 0; }
    }
    newStats.speedTrades = [...stats.speedTrades.filter(t => now - t < 300000), now];
    set({ stats: newStats });
  },

  trackPositionCount: (count) => {
    set(s => ({ stats: { ...s.stats, tokensHeldSimultaneously: Math.max(s.stats.tokensHeldSimultaneously, count) } }));
  },

  trackProfit: (multiple) => {
    set(s => ({ stats: { ...s.stats, maxProfitMultiple: Math.max(s.stats.maxProfitMultiple, multiple) } }));
  },

  trackSOLEarned: (amount) => {
    set(s => ({ stats: { ...s.stats, totalSOLEarned: s.stats.totalSOLEarned + amount } }));
  },

  trackHoldingDown50: () => {
    set(s => ({ stats: { ...s.stats, heldWhileDown50: true } }));
  },

  trackTokensAtLoss: (count) => {
    set(s => ({ stats: { ...s.stats, tokensAtLoss: Math.max(s.stats.tokensAtLoss, count) } }));
  },

  checkQuests: () => {
    const { quests, stats } = get();
    const newlyCompleted: Quest[] = [];

    const updatedQuests = quests.map(quest => {
      if (quest.completed) return quest;
      let current = quest.current;

      switch (quest.id) {
        case 'first_blood': current = Math.min(stats.totalTrades, 1); break;
        case 'diamond_hands': current = stats.heldWhileDown50 ? 1 : 0; break;
        case 'paper_hands': current = stats.consecutiveLosses; break;
        case 'to_the_moon': current = stats.maxProfitMultiple; break;
        case 'bag_holder': current = stats.tokensAtLoss; break;
        case 'degen_lord': current = stats.tokensHeldSimultaneously; break;
        case 'speed_runner': current = stats.speedTrades.length; break;
        case 'whale_alert': current = stats.totalSOLEarned; break;
        case 'portfolio_diversifier': current = stats.tokensHeldSimultaneously; break;
        case 'lucky_trader': current = stats.consecutiveWins; break;
      }

      const progress = Math.min(current / quest.target, 1);
      const completed = progress >= 1;
      if (completed && !quest.completed) {
        newlyCompleted.push({ ...quest, completed: true, progress: 1, current });
      }
      return { ...quest, current, progress, completed };
    });

    set({ quests: updatedQuests, completedCount: updatedQuests.filter(q => q.completed).length });
    if (newlyCompleted.length > 0) get().saveToStorage();
    return newlyCompleted;
  },

  getQuests: () => get().quests,

  saveToStorage: () => {
    try {
      const { quests, stats, completedCount } = get();
      localStorage.setItem(QUEST_STORAGE_KEY, JSON.stringify({ quests, stats, completedCount }));
    } catch { /* */ }
  },

  loadFromStorage: () => {
    try {
      const data = localStorage.getItem(QUEST_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.quests?.length > 0) {
          set({ quests: parsed.quests, stats: { ...get().stats, ...parsed.stats }, completedCount: parsed.completedCount || 0 });
        }
      }
    } catch { /* */ }
  },
}));
