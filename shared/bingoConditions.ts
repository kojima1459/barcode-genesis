/**
 * Daily Barcode Bingo System - Shared Conditions
 * Lightweight conditions based purely on JAN string patterns
 */

export type BingoConditionId =
    | 'prefix_49' | 'prefix_45' | 'prefix_88' | 'prefix_4'
    | 'last_even' | 'last_odd' | 'last_0' | 'last_5'
    | 'contains_0' | 'contains_7' | 'contains_777'
    | 'length_13' | 'length_8'
    | 'japan_range';

export interface BingoCondition {
    id: BingoConditionId;
    labelKey: string;  // Translation key
    check: (barcode: string) => boolean;
}

export interface BingoCell {
    id: BingoConditionId;
    labelKey: string;
    completed: boolean;
    barcode: string | null;
}

export const ALL_BINGO_CONDITIONS: BingoCondition[] = [
    // Prefix conditions
    {
        id: 'prefix_49',
        labelKey: 'bingo_cond_prefix_49',
        check: (b) => b.startsWith('49')
    },
    {
        id: 'prefix_45',
        labelKey: 'bingo_cond_prefix_45',
        check: (b) => b.startsWith('45')
    },
    {
        id: 'prefix_88',
        labelKey: 'bingo_cond_prefix_88',
        check: (b) => b.startsWith('88')
    },
    {
        id: 'prefix_4',
        labelKey: 'bingo_cond_prefix_4',
        check: (b) => b.startsWith('4')
    },

    // Suffix conditions
    {
        id: 'last_even',
        labelKey: 'bingo_cond_last_even',
        check: (b) => {
            const last = parseInt(b[b.length - 1], 10);
            return !isNaN(last) && last % 2 === 0;
        }
    },
    {
        id: 'last_odd',
        labelKey: 'bingo_cond_last_odd',
        check: (b) => {
            const last = parseInt(b[b.length - 1], 10);
            return !isNaN(last) && last % 2 === 1;
        }
    },
    {
        id: 'last_0',
        labelKey: 'bingo_cond_last_0',
        check: (b) => b.endsWith('0')
    },
    {
        id: 'last_5',
        labelKey: 'bingo_cond_last_5',
        check: (b) => b.endsWith('5')
    },

    // Pattern conditions
    {
        id: 'contains_0',
        labelKey: 'bingo_cond_contains_0',
        check: (b) => b.includes('0')
    },
    {
        id: 'contains_7',
        labelKey: 'bingo_cond_contains_7',
        check: (b) => b.includes('7')
    },
    {
        id: 'contains_777',
        labelKey: 'bingo_cond_contains_777',
        check: (b) => b.includes('777')
    },

    // Length conditions
    {
        id: 'length_13',
        labelKey: 'bingo_cond_length_13',
        check: (b) => b.length === 13
    },
    {
        id: 'length_8',
        labelKey: 'bingo_cond_length_8',
        check: (b) => b.length === 8
    },

    // Range conditions
    {
        id: 'japan_range',
        labelKey: 'bingo_cond_japan_range',
        check: (b) => {
            // JAN Japan range: 45-49
            return b.startsWith('45') || b.startsWith('46') ||
                b.startsWith('47') || b.startsWith('48') || b.startsWith('49');
        }
    }
];

/**
 * Check if a barcode satisfies a condition
 */
export function checkBingoCondition(conditionId: BingoConditionId, barcode: string): boolean {
    const condition = ALL_BINGO_CONDITIONS.find(c => c.id === conditionId);
    if (!condition) return false;
    return condition.check(barcode);
}

/**
 * Get JST date key (YYYY-MM-DD)
 */
export function getJSTDateKey(): string {
    const now = new Date();
    // JST is UTC+9
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstDate = new Date(now.getTime() + jstOffset);

    const year = jstDate.getUTCFullYear();
    const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(jstDate.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

/**
 * Simple hash function for date key
 */
function hashDateKey(dateKey: string): string {
    let hash = 0;
    for (let i = 0; i < dateKey.length; i++) {
        const char = dateKey.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `bingo-${Math.abs(hash)}`;
}

/**
 * Seeded shuffle (from existing SeededRandom pattern)
 */
function shuffleWithSeed<T>(array: T[], seed: number): T[] {
    const result = [...array];
    let currentSeed = seed;

    for (let i = result.length - 1; i > 0; i--) {
        // Simple LCG for deterministic shuffle
        currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
        const j = currentSeed % (i + 1);
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}

/**
 * Generate deterministic daily bingo card (3x3 = 9 conditions)
 */
export function generateDailyBingoCard(dateKey: string): BingoCell[] {
    const hash = hashDateKey(dateKey);
    const seed = parseInt(hash.replace('bingo-', ''), 10);

    // Shuffle all conditions and pick first 9
    const shuffled = shuffleWithSeed(ALL_BINGO_CONDITIONS, seed);
    const selected = shuffled.slice(0, 9);

    // Convert to BingoCell format
    return selected.map(cond => ({
        id: cond.id,
        labelKey: cond.labelKey,
        completed: false,
        barcode: null
    }));
}
