export type SoundName =
  | "ui_click"
  | "battle_start"
  | "hit_light"
  | "hit_heavy"
  | "cheer"
  | "win"
  | "lose";

type PlayOptions = {
  volume?: number;
  rate?: number;
  throttleMs?: number;
};

const SOUND_PATHS: Record<SoundName, string> = {
  ui_click: "/sfx/ui_click.mp3",
  battle_start: "/sfx/battle_start.mp3",
  hit_light: "/sfx/hit_light.mp3",
  hit_heavy: "/sfx/hit_heavy.mp3",
  cheer: "/sfx/cheer.mp3",
  win: "/sfx/win.mp3",
  lose: "/sfx/lose.mp3",
};

const STORAGE_KEY = "battleSfxMuted";
const DEFAULT_THROTTLE_MS = 100;
const MAX_POOL_SIZE = 4;

const audioPools = new Map<SoundName, HTMLAudioElement[]>();
const lastPlayedAt = new Map<SoundName, number>();

let unlocked = false;
let muted = false;

const canUseAudio = () => typeof Audio !== "undefined";

const loadMuted = () => {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "1";
};

muted = loadMuted();

const silentWav =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

const createAudio = (name: SoundName) => {
  const src = SOUND_PATHS[name];
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.volume = muted ? 0 : 1;
  audio.load?.();
  return audio;
};

export const preload = () => {
  if (!canUseAudio()) return;
  (Object.keys(SOUND_PATHS) as SoundName[]).forEach((name) => {
    if (audioPools.has(name)) return;
    const pool = [createAudio(name), createAudio(name)];
    audioPools.set(name, pool);
  });
};

export const unlock = () => {
  if (!canUseAudio() || unlocked) return;
  unlocked = true;

  try {
    const audio = new Audio(silentWav);
    audio.volume = 0;
    audio.play().catch(() => { });
  } catch {
    // Ignore unlock failures.
  }

  if (typeof AudioContext !== "undefined") {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      osc.stop(0.01);
      ctx.resume().catch(() => { });
    } catch {
      // Ignore unlock failures.
    }
  }
};

export const play = (name: SoundName, options: PlayOptions = {}) => {
  if (!canUseAudio() || muted || !unlocked) return;

  const now = Date.now();
  const throttleMs = options.throttleMs ?? DEFAULT_THROTTLE_MS;
  const last = lastPlayedAt.get(name) ?? 0;
  if (now - last < throttleMs) return;
  lastPlayedAt.set(name, now);

  const pool = audioPools.get(name) ?? [];
  if (pool.length === 0) {
    pool.push(createAudio(name));
    audioPools.set(name, pool);
  }

  let audio = pool.find((entry) => entry.paused || entry.ended);
  if (!audio) {
    if (pool.length < MAX_POOL_SIZE) {
      audio = createAudio(name);
      pool.push(audio);
    } else {
      audio = pool[0];
    }
  }

  audio.currentTime = 0;
  audio.volume = muted ? 0 : options.volume ?? 1;
  if (typeof options.rate === "number") {
    audio.playbackRate = options.rate;
  }
  audio.play().catch(() => { });
};

export const setMuted = (next: boolean) => {
  muted = next;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  }
  audioPools.forEach((pool) => {
    pool.forEach((audio) => {
      audio.volume = muted ? 0 : 1;
    });
  });
};

export const getMuted = () => muted;

// ========================================
// WebAudio Sound Generation (no external files)
// ========================================

let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext && typeof AudioContext !== "undefined") {
    audioContext = new AudioContext();
  }
  return audioContext;
};

type GeneratedSoundType = "ui_click" | "ui_skip" | "hit_light" | "hit_heavy" | "win" | "lose" | "miss";

export const playGenerated = (type: GeneratedSoundType) => {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume context if suspended (mobile)
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => { });
  }

  const now = ctx.currentTime;

  switch (type) {
    case "ui_click": {
      // Short click sound: oscillator + noise burst
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
      break;
    }
    case "ui_skip": {
      // Whoosh sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
      break;
    }
    case "hit_light": {
      // White noise burst (Deterministic/Seeded for battle consistency)
      const bufferSize = ctx.sampleRate * 0.1; // 0.1s
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      // Use a simple deterministic sequence instead of Math.random()
      let seed = 12345;
      for (let i = 0; i < bufferSize; i++) {
        seed = (seed * 1664525 + 1013904223) | 0;
        data[i] = ((seed >>> 0) / 4294967296) * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const gain = ctx.createGain();

      // Filter for crunchiness
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1000;

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      break;
    }
    case "hit_heavy": {
      // Heavy impact: Low square wave + noise
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
      break;
    }
    case "win": {
      // Victory Fanfare (C Major Arpeggio)
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const times = [0, 0.1, 0.2, 0.4];
      const durations = [0.1, 0.1, 0.2, 0.6];

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + times[i]);

        gain.gain.setValueAtTime(0.2, now + times[i]);
        gain.gain.linearRampToValueAtTime(0.001, now + times[i] + durations[i]);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + times[i]);
        osc.stop(now + times[i] + durations[i] + 0.05);
      });
      break;
    }
    case "lose": {
      // Defeat: Descending Sawtooth
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(50, now + 1.0);

      // Tremolo effect
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 10;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 500;
      lfo.connect(lfoGain);
      // Not connecting LFO for simplicity/safety

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 1.0);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.0);
      break;
    }
    case "miss": {
      // Miss/Whoosh: Quick frequency sweep for swipe effect
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.12);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
      break;
    }
  }
};
