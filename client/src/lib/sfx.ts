/**
 * SFX System - Lightweight sound effect management (Battle-specific)
 * 
 * Maps battle SFX names to actual available files.
 * Uses the main sound.ts mp3 files instead of stubs.
 */

type SfxName = 'attack' | 'hit' | 'crit' | 'cheer' | 'win' | 'lose' | 'ui';

// Map SFX names to actual available mp3 files
const SFX_FILE_MAP: Record<SfxName, string> = {
    attack: '/sfx/hit_light.mp3',  // Use hit_light for attack
    hit: '/sfx/hit_light.mp3',
    crit: '/sfx/hit_heavy.mp3',    // Use heavy hit for crits
    cheer: '/sfx/battle_start.mp3', // fallback (cheer.mp3 is stub)
    win: '/sfx/ui_click.mp3',      // fallback (win.mp3 is stub)
    lose: '/sfx/ui_click.mp3',     // fallback (lose.mp3 is stub)
    ui: '/sfx/ui_click.mp3',
};

interface AudioPool {
    pool: HTMLAudioElement[];
    index: number;
}

const POOL_SIZE = 3;
const pools: Record<string, AudioPool> = {};
let isMuted = false;

/**
 * Preload all SFX files into memory pools
 * Call this on app initialization (e.g., AppShell mount)
 */
export function preloadSfx(): void {
    const sfxNames: SfxName[] = ['attack', 'hit', 'crit', 'cheer', 'win', 'lose', 'ui'];

    sfxNames.forEach(name => {
        const pool: HTMLAudioElement[] = [];
        const filePath = SFX_FILE_MAP[name];

        for (let i = 0; i < POOL_SIZE; i++) {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.src = filePath;

            // Handle missing files silently
            audio.onerror = () => {
                // Silent - already mapped to real files
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
    } = {}
): void {
    if (isMuted) return;

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
}

/**
 * Get current mute state
 */
export function getMuted(): boolean {
    return isMuted;
}

/**
 * Unlock audio context (call on first user interaction)
 */
export function unlockSfx(): void {
    // Play silent audio to unlock iOS audio context
    const silent = new Audio();
    silent.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAABhADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dX//////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYTs90hvAAAAAAAAAAAAAAAAAAAA';
    silent.play().catch(() => { });
}
