import { describe, it, expect } from 'vitest';
import { generateDexSlots, getUnlockedSlots, calculateDexProgress, DexSlot, getDexSlotId } from './dexRegistry';
import { RobotData } from '@/types/shared';

const MOCK_ROBOT_A: RobotData = {
    id: 'A',
    role: 'ATTACKER',
    rarity: 1,
    variantKey: 0, // Should map to key 'A'
    parts: { weapon: 1 } // Fallback logic
} as any;

const MOCK_ROBOT_B: RobotData = {
    id: 'B',
    role: 'TANK',
    rarity: 5,
    variantKey: 3, // 3 * 25 = 75, mapped to 'A' or 'B'? Logic: floor(variantKey/25)%4. 3/25 = 0. So index 0 -> 'A'. Wait.
    // If I want 'D', I need index 3. 3*25 = 75. 75/25 = 3. 
    parts: { weapon: 1 }
} as any;

describe('dexRegistry', () => {
    it('generates 100 slots total', () => {
        const slots = generateDexSlots();
        expect(slots.length).toBe(100); // 5 roles * 5 rarities * 4 variants
    });

    it('identifies unlocked slots correctly', () => {
        // MOCK_ROBOT_A -> ATTACKER-1-A
        // We need to verify getDexSlotId works first
        const idA = getDexSlotId(MOCK_ROBOT_A);
        expect(idA).toBe('ATTACKER-1-A');

        const unlocked = getUnlockedSlots([MOCK_ROBOT_A]);
        expect(unlocked.has('ATTACKER-1-A')).toBe(true);
        expect(unlocked.size).toBe(1);
    });

    it('calculates progress correctly', () => {
        // 1 robot unlocked out of 100
        const progress = calculateDexProgress([MOCK_ROBOT_A]);
        expect(progress.total).toBe(100);
        expect(progress.unlocked).toBe(1);
        expect(progress.percent).toBe(1);
        expect(progress.byRole.ATTACKER.unlocked).toBe(1);
        expect(progress.byRole.TANK.unlocked).toBe(0);
    });
});
