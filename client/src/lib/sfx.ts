/**
 * SFX System - Lightweight sound effect management
 * 
 * Uses Audio pool for multiple simultaneous playback without heavy dependencies.
 * Respects mute state and handles missing files gracefully.
 */

type SfxName = 'attack' | 'hit' | 'crit' | 'cheer' | 'win' | 'lose' | 'ui';

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

        for (let i = 0; i < POOL_SIZE; i++) {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.src = `/sfx/${name}.mp3`;

            // Handle missing files silently
            audio.onerror = () => {
                console.warn(`[SFX] Missing file: /sfx/${name}.mp3`);
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
        console.warn(`[SFX] Pool not initialized for: ${name}`);
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

    audio.play().catch(err => {
        // Ignore autoplay policy errors
        if (err.name !== 'NotAllowedError') {
            console.warn(`[SFX] Playback failed for ${name}:`, err);
        }
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
