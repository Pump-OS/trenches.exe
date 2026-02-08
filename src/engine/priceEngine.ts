// ============================================================
// Price Engine — 3-layer realistic memecoin price generation
// Layer 1: Geometric Brownian Motion (natural market movement)
// Layer 2: Memecoin lifecycle phases (pump/dump/crab patterns)
// Layer 3: User trade impact (buying pushes price up, selling down)
// ============================================================

export const Phase = {
  ACCUMULATION: 'ACCUMULATION',
  PUMP: 'PUMP',
  MEGA_PUMP: 'MEGA_PUMP',
  PEAK: 'PEAK',
  DUMP: 'DUMP',
  CRAB: 'CRAB',
  RECOVERY: 'RECOVERY',
} as const;

export type Phase = (typeof Phase)[keyof typeof Phase];

export interface PhaseConfig {
  drift: number;
  volatility: number;
  minDuration: number;
  maxDuration: number;
  transitions: Record<Phase, number>;
}

const PHASE_CONFIGS: Record<Phase, PhaseConfig> = {
  [Phase.ACCUMULATION]: {
    drift: 0.0005, volatility: 0.008, minDuration: 30, maxDuration: 120,
    transitions: { [Phase.ACCUMULATION]: 0.1, [Phase.PUMP]: 0.55, [Phase.MEGA_PUMP]: 0.05, [Phase.PEAK]: 0, [Phase.DUMP]: 0.1, [Phase.CRAB]: 0.15, [Phase.RECOVERY]: 0.05 },
  },
  [Phase.PUMP]: {
    drift: 0.008, volatility: 0.025, minDuration: 15, maxDuration: 80,
    transitions: { [Phase.ACCUMULATION]: 0.05, [Phase.PUMP]: 0.1, [Phase.MEGA_PUMP]: 0.2, [Phase.PEAK]: 0.4, [Phase.DUMP]: 0.15, [Phase.CRAB]: 0.05, [Phase.RECOVERY]: 0.05 },
  },
  [Phase.MEGA_PUMP]: {
    drift: 0.025, volatility: 0.05, minDuration: 5, maxDuration: 30,
    transitions: { [Phase.ACCUMULATION]: 0, [Phase.PUMP]: 0.1, [Phase.MEGA_PUMP]: 0.05, [Phase.PEAK]: 0.5, [Phase.DUMP]: 0.25, [Phase.CRAB]: 0.05, [Phase.RECOVERY]: 0.05 },
  },
  [Phase.PEAK]: {
    drift: 0.0, volatility: 0.04, minDuration: 5, maxDuration: 20,
    transitions: { [Phase.ACCUMULATION]: 0, [Phase.PUMP]: 0.1, [Phase.MEGA_PUMP]: 0.02, [Phase.PEAK]: 0.03, [Phase.DUMP]: 0.6, [Phase.CRAB]: 0.15, [Phase.RECOVERY]: 0.1 },
  },
  [Phase.DUMP]: {
    drift: -0.012, volatility: 0.035, minDuration: 10, maxDuration: 60,
    transitions: { [Phase.ACCUMULATION]: 0.15, [Phase.PUMP]: 0.15, [Phase.MEGA_PUMP]: 0.02, [Phase.PEAK]: 0, [Phase.DUMP]: 0.08, [Phase.CRAB]: 0.35, [Phase.RECOVERY]: 0.25 },
  },
  [Phase.CRAB]: {
    drift: 0.0, volatility: 0.006, minDuration: 30, maxDuration: 150,
    transitions: { [Phase.ACCUMULATION]: 0.2, [Phase.PUMP]: 0.4, [Phase.MEGA_PUMP]: 0.05, [Phase.PEAK]: 0, [Phase.DUMP]: 0.1, [Phase.CRAB]: 0.1, [Phase.RECOVERY]: 0.15 },
  },
  [Phase.RECOVERY]: {
    drift: 0.004, volatility: 0.015, minDuration: 15, maxDuration: 60,
    transitions: { [Phase.ACCUMULATION]: 0.2, [Phase.PUMP]: 0.45, [Phase.MEGA_PUMP]: 0.05, [Phase.PEAK]: 0, [Phase.DUMP]: 0.1, [Phase.CRAB]: 0.15, [Phase.RECOVERY]: 0.05 },
  },
};

function randomNormal(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function selectNextPhase(transitions: Record<Phase, number>): Phase {
  const rand = Math.random();
  let cumulative = 0;
  for (const [phase, weight] of Object.entries(transitions)) {
    cumulative += weight;
    if (rand <= cumulative) return phase as Phase;
  }
  return Phase.CRAB;
}

export interface PriceState {
  price: number;
  phase: Phase;
  ticksInPhase: number;
  phaseDuration: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  pendingImpact: number;
}

export function createPriceState(initialPrice: number): PriceState {
  const phase = Phase.ACCUMULATION;
  const config = PHASE_CONFIGS[phase];
  return {
    price: initialPrice,
    phase,
    ticksInPhase: 0,
    phaseDuration: config.minDuration + Math.floor(Math.random() * (config.maxDuration - config.minDuration)),
    volume: 0,
    high: initialPrice,
    low: initialPrice,
    open: initialPrice,
    pendingImpact: 0,
  };
}

export function withTradeImpact(state: PriceState, amountSOL: number, isBuy: boolean, liquidity: number): PriceState {
  const impactFactor = 0.02;
  const impact = (amountSOL / Math.max(liquidity, 1)) * impactFactor;
  return {
    ...state,
    pendingImpact: state.pendingImpact + (isBuy ? impact : -impact),
  };
}

export function tickPrice(state: PriceState): PriceState {
  const config = PHASE_CONFIGS[state.phase];

  const dt = 1;
  const drift = config.drift;
  const vol = config.volatility;
  const gbmReturn = (drift - 0.5 * vol * vol) * dt + vol * Math.sqrt(dt) * randomNormal();

  let phaseModifier = 0;
  if (state.phase === Phase.PUMP || state.phase === Phase.MEGA_PUMP) {
    if (Math.random() < 0.05) phaseModifier += 0.02 + Math.random() * 0.03;
  }
  if (state.phase === Phase.DUMP) {
    if (Math.random() < 0.08) phaseModifier -= 0.015 + Math.random() * 0.025;
  }
  const wickNoise = (Math.random() - 0.5) * vol * 0.3;

  const userImpact = state.pendingImpact;
  const remainingImpact = state.pendingImpact * 0.85;

  const totalReturn = gbmReturn + phaseModifier + wickNoise + userImpact;
  const newPrice = Math.max(state.price * Math.exp(totalReturn), 0.0001);

  const open = state.price;
  const close = newPrice;
  const wickUp = Math.abs(randomNormal() * vol * state.price * 0.5);
  const wickDown = Math.abs(randomNormal() * vol * state.price * 0.5);
  const high = Math.max(open, close) + wickUp;
  const low = Math.max(Math.min(open, close) - wickDown, 0.0001);

  const baseVolume = 100 + Math.random() * 500;
  const phaseVolumeMultiplier =
    state.phase === Phase.MEGA_PUMP ? 5 :
    state.phase === Phase.PUMP ? 3 :
    state.phase === Phase.DUMP ? 3.5 :
    state.phase === Phase.PEAK ? 4 : 1;
  const volume = baseVolume * phaseVolumeMultiplier * (1 + Math.random());

  let newPhase = state.phase;
  let newTicksInPhase = state.ticksInPhase + 1;
  let newPhaseDuration = state.phaseDuration;

  if (newTicksInPhase >= state.phaseDuration) {
    newPhase = selectNextPhase(config.transitions);
    newTicksInPhase = 0;
    const newConfig = PHASE_CONFIGS[newPhase];
    newPhaseDuration = newConfig.minDuration + Math.floor(Math.random() * (newConfig.maxDuration - newConfig.minDuration));
  }

  return {
    price: newPrice,
    phase: newPhase,
    ticksInPhase: newTicksInPhase,
    phaseDuration: newPhaseDuration,
    volume,
    high,
    low,
    open,
    pendingImpact: Math.abs(remainingImpact) < 0.0001 ? 0 : remainingImpact,
  };
}
