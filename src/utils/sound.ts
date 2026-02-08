// ============================================================
// Sound effects via Web Audio API — no external files needed
// ============================================================

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

// Ka-ching! cash register sound
export function playKaChing() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // --- Main coin hit (bright metallic ping) ---
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(2200, now);
    osc1.frequency.exponentialRampToValueAtTime(1800, now + 0.08);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1).connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // --- Second harmonic (shimmer) ---
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(3300, now + 0.03);
    osc2.frequency.exponentialRampToValueAtTime(2800, now + 0.12);
    gain2.gain.setValueAtTime(0.15, now + 0.03);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + 0.03);
    osc2.stop(now + 0.3);

    // --- Cash register "ding" (bell tone) ---
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(4200, now + 0.05);
    osc3.frequency.exponentialRampToValueAtTime(3800, now + 0.15);
    gain3.gain.setValueAtTime(0.12, now + 0.05);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc3.connect(gain3).connect(ctx.destination);
    osc3.start(now + 0.05);
    osc3.stop(now + 0.4);

    // --- Coin rattle (noise burst) ---
    const bufferSize = ctx.sampleRate * 0.06;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.15;
    }
    const noise = ctx.createBufferSource();
    const noiseGain = ctx.createGain();
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 6000;
    noiseFilter.Q.value = 2;
    noise.buffer = buffer;
    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);
    noise.start(now);
  } catch {
    // AudioContext not supported or blocked
  }
}
