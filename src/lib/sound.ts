// Tiny Web Audio synth: every effect is generated on the fly, no audio files.

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem("btc2iphone:sound", on ? "1" : "0");
  } catch {}
}

export function loadSoundPreference(): boolean {
  try {
    enabled = localStorage.getItem("btc2iphone:sound") !== "0";
  } catch {}
  return enabled;
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "sine",
  at = 0,
  vol = 0.12,
  slideTo?: number
) {
  if (!enabled) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + at;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

let lastTick = 0;

export const sfx = {
  pop: () => tone(520, 0.09, "sine", 0, 0.16, 980),
  coin: () => {
    tone(988, 0.08, "square", 0, 0.06);
    tone(1319, 0.35, "square", 0.08, 0.06);
  },
  jackpot: () => {
    sfx.coin();
    tone(1568, 0.3, "square", 0.3, 0.05);
    tone(2093, 0.4, "square", 0.42, 0.04);
  },
  wahwah: () => {
    tone(392, 0.28, "sawtooth", 0, 0.05, 370);
    tone(370, 0.28, "sawtooth", 0.3, 0.05, 349);
    tone(349, 0.7, "sawtooth", 0.6, 0.05, 262);
  },
  whoosh: () => {
    tone(180, 0.25, "sine", 0, 0.12, 900);
    tone(1200, 0.12, "triangle", 0.2, 0.06, 1600);
  },
  zap: () => tone(1800, 0.4, "sawtooth", 0, 0.06, 90),
  blip: (i: number) => tone(300 + i * 60, 0.12, "triangle", 0, 0.12, 420 + i * 70),
  /** Throttled tick for sliders; pitch follows `level` (0..1). */
  tick: (level: number) => {
    const now = performance.now();
    if (now - lastTick < 45) return;
    lastTick = now;
    tone(220 + level * 700, 0.05, "triangle", 0, 0.07);
  },
  priceUp: () => tone(880, 0.07, "sine", 0, 0.04, 1175),
  priceDown: () => tone(660, 0.07, "sine", 0, 0.04, 494),
};
