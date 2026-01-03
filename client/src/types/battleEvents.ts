/**
 * BattleEvent Type Definitions
 * 
 * Normalized event types for battle replay system.
 * UI/SE/Tempo/Effects are all driven by these events.
 */

/**
 * All possible battle event types
 */
export type BattleEventType =
    | 'TURN'           // Turn start marker
    | 'ACTION'         // Attack/skill action
    | 'DAMAGE'         // Damage dealt
    | 'STANCE'         // Stance outcome (じゃんけん)
    | 'OVERDRIVE'      // Overdrive gauge trigger
    | 'SPECIAL'        // Special move activation
    | 'STATUS'         // Status effects (stun, guard, etc)
    | 'ITEM'           // Item usage
    | 'CHEER'          // Cheer applied
    | 'SHIELD'         // Boss shield damage/break
    | 'FINISHER'       // Finisher move
    | 'SUDDEN_DEATH'   // Sudden death tick
    | 'RESULT';        // Battle result

/**
 * SFX names available for events
 */
export type BattleSfxName =
    | 'attack'
    | 'hit'
    | 'critical'
    | 'guard'
    | 'stun'
    | 'ult'
    | 'break'
    | 'finisher'
    | 'cheer'
    | 'win'
    | 'lose';

/**
 * Severity classification for tempo/visual emphasis
 */
export type EventSeverity = 'NORMAL' | 'HIGHLIGHT' | 'CLIMAX';

/**
 * Side indicator (P1 = player, P2 = opponent)
 */
export type BattleSide = 'P1' | 'P2';

/**
 * Shake intensity levels
 */
export type ShakeIntensity = 'NONE' | 'SMALL' | 'BIG';

/**
 * Zoom type
 */
export type ZoomType = 'NONE' | 'IN';

/**
 * Base interface for all battle events
 */
export interface BattleEventBase {
    /** Stable ID: `${turn}-${index}-${type}` */
    id: string;

    /** Turn number */
    turn: number;

    /** Event sequence in timeline */
    at: number;

    /** Event type */
    type: BattleEventType;

    /** Attacker/effect side */
    side?: BattleSide;

    /** Severity for tempo/visual emphasis */
    severity: EventSeverity;

    /** UI display data */
    ui?: {
        /** HUD headline */
        headline?: string;
        /** Subtitle */
        subline?: string;
        /** Log message */
        message?: string;
    };

    /** SFX configuration */
    sfx?: {
        name?: BattleSfxName;
        volume?: number;
        cooldownMs?: number;
    };

    /** Motion/visual effects */
    motion?: {
        shake?: ShakeIntensity;
        zoom?: ZoomType;
        flash?: boolean;
    };

    /** Timing control */
    timing?: {
        /** Delay after this event (ms, before speed multiplier) */
        delayMs?: number;
    };

    /** Additional metadata (raw log data, etc) */
    meta?: Record<string, unknown>;
}

/**
 * Timing delays by severity (ms)
 */
export const SEVERITY_DELAYS: Record<EventSeverity, number> = {
    NORMAL: 250,
    HIGHLIGHT: 330,
    CLIMAX: 480,
};
