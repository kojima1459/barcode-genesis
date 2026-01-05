/**
 * SFX System - Lightweight sound effect management (Battle-specific)
 * 
 * Maps battle SFX names to actual available files.
 * Includes cooldown mechanism to prevent sound spam.
 */

export type SfxName =
    | 'attack'
    | 'hit'
    | 'crit'
    | 'cheer'
    | 'win'
    | 'lose'
    | 'ui'
    // Extended for BattleReplay
    | 'guard'
    | 'stun'
    | 'ult'      // Overdrive / Special
    | 'break'    // Boss shield break
    | 'finisher';

// Map SFX names to actual available mp3 files
const SFX_FILE_MAP: Record<SfxName, string> = {
    attack: '/sfx/attack.mp3',
    hit: '/sfx/hit.mp3',
    crit: '/sfx/crit.mp3',
    cheer: '/sfx/cheer.mp3',
    win: '/sfx/win.mp3',
    lose: '/sfx/lose.mp3',
    ui: '/sfx/ui_click.mp3',
    // Extended mappings - use existing files for now
    guard: '/sfx/hit_light.mp3',
    stun: '/sfx/hit_heavy.mp3',
    ult: '/sfx/levelup.mp3',       // Impactful sound for special
    break: '/sfx/hit_heavy.mp3',   // Heavy hit for shield break
    finisher: '/sfx/crit.mp3',     // Dramatic for finisher
};

interface AudioPool {
    pool: HTMLAudioElement[];
    index: number;
}

const POOL_SIZE = 3;
const pools: Record<string, AudioPool> = {};
let isMuted = false;
let isUnlocked = false;
let isSkipping = false;  // Skip mode suppression

// Cooldown tracking to prevent sound spam
const lastPlayTime: Record<string, number> = {};
const DEFAULT_COOLDOWN_MS = 100;

// Track played SFX by unique key to prevent duplicate plays
const playedKeys = new Set<string>();

/**
 * Preload all SFX files into memory pools
 * Call this on app initialization (e.g., AppShell mount)
 */
export function preloadSfx(): void {
    const sfxNames: SfxName[] = [
        'attack', 'hit', 'crit', 'cheer', 'win', 'lose', 'ui',
        'guard', 'stun', 'ult', 'break', 'finisher'
    ];

    sfxNames.forEach(name => {
        const pool: HTMLAudioElement[] = [];
        const filePath = SFX_FILE_MAP[name];

        for (let i = 0; i < POOL_SIZE; i++) {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.src = filePath;

            // Handle missing files silently
            audio.onerror = () => {
                console.warn(`[SFX] Failed to load: ${filePath}`);
            };

            pool.push(audio);
        }

        pools[name] = { pool, index: 0 };
    });
}

/**
 * Play a sound effect from the pool
 * @param name - SFX identifier
 * @param options - Playback options
 */
export function playSfx(
    name: SfxName,
    options: {
        volume?: number;
        playbackRate?: number;
        cooldownMs?: number;  // Custom cooldown (default 100ms)
        uniqueKey?: string;   // Optional key to prevent duplicate plays
    } = {}
): void {
    if (isMuted) return;
    if (isSkipping && name !== 'win' && name !== 'lose') return;  // Allow victory/defeat during skip

    // Unique key deduplication
    if (options.uniqueKey) {
        if (playedKeys.has(options.uniqueKey)) return;
        playedKeys.add(options.uniqueKey);
    }

    // Cooldown check to prevent spam
    const now = Date.now();
    const cooldown = options.cooldownMs ?? DEFAULT_COOLDOWN_MS;
    if (lastPlayTime[name] && now - lastPlayTime[name] < cooldown) {
        return; // Still in cooldown
    }
    lastPlayTime[name] = now;

    const poolObj = pools[name];
    if (!poolObj) {
        // Pool might not be initialized yet, ignore silently
        return;
    }

    const { pool, index } = poolObj;
    const audio = pool[index];

    // Update pool index (round-robin)
    poolObj.index = (index + 1) % POOL_SIZE;

    // Configure and play
    audio.volume = options.volume ?? 0.6;
    audio.playbackRate = options.playbackRate ?? 1.0;
    audio.currentTime = 0; // Reset to start

    audio.play().catch(() => {
        // Ignore autoplay policy errors silently
    });
}

/**
 * Set global mute state
 */
export function setMuted(muted: boolean): void {
    isMuted = muted;
    // Persist to localStorage
    try {
        localStorage.setItem('sfx_muted', muted ? '1' : '0');
    } catch { /* ignore storage errors */ }
}

/**
 * Set skip mode (suppress most SFX during fast-forward/skip)
 */
export function setSkipMode(skip: boolean): void {
    isSkipping = skip;
}

/**
 * Get skip mode state
 */
export function getSkipMode(): boolean {
    return isSkipping;
}

// Track current battle ID to prevent clearing history on remounts
let currentBattleId: string | null = null;

/**
 * Clear played keys for a NEW battle
 * Only clears if the battleId is different from the last one
 */
export function clearSfxHistory(battleId?: string): void {
    if (battleId && battleId === currentBattleId) {
        return; // Same battle, don't clear history (prevents loops on remount)
    }

    playedKeys.clear();
    if (battleId) {
        currentBattleId = battleId;
    }
}

/**
 * Get current mute state (with localStorage persistence)
 */
export function getMuted(): boolean {
    if (isMuted) return true;
    try {
        return localStorage.getItem('sfx_muted') === '1';
    } catch {
        return isMuted;
    }
}

/**
 * Check if audio is unlocked
 */
export function isAudioUnlocked(): boolean {
    return isUnlocked;
}

/**
 * Unlock audio context (call on first user interaction)
 */
export function unlockSfx(): void {
    if (isUnlocked) return;

    // Play silent audio to unlock iOS audio context
    const silent = new Audio();
    silent.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAABhADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dX//////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYTs90hvAAAAAAAAAAAAAAAAAAAA';
    silent.play().catch(() => { });

    isUnlocked = true;

    // Also preload on unlock
    preloadSfx();
}

