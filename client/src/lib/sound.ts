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

type GeneratedSoundType = "ui_click" | "ui_skip";

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
      // Whoosh sound: filtered noise
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
  }
};
