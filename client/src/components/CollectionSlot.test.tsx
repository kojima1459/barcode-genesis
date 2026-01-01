import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CollectionSlot from './CollectionSlot';
import { RobotData } from '@/types/shared';

// Mock RobotSVG since it uses DOM APIs that might be heavy or need canvas
vi.mock('@/components/RobotSVG', () => ({
    default: () => <div data-testid="robot-svg-mock" />
}));

const MOCK_ROBOT: RobotData = {
    id: 'robot-1',
    userId: 'user-1',
    name: 'Test Robot',
    sourceBarcode: '123',
    rarity: 1,
    rarityName: 'Common',
    baseHp: 100,
    baseAttack: 10,
    baseDefense: 10,
    baseSpeed: 10,
    elementType: 1,
    elementName: 'Fire',
    parts: { head: 1, face: 1, body: 1, armLeft: 1, armRight: 1, legLeft: 1, legRight: 1, backpack: 1, weapon: 1, accessory: 1 },
    colors: { primary: '', secondary: '', accent: '', glow: '' },
    totalBattles: 0,
    totalWins: 0,
    isFavorite: false,
    role: 'ATTACKER',
    rarityTier: 'common'
} as unknown as RobotData; // Casting to avoid partial errors

describe('CollectionSlot', () => {
    it('renders silhouette when locked', () => {
        render(<CollectionSlot role="ATTACKER" rarity={1} unlocked={false} />);

        // Should show "?"
        expect(screen.getByText('?')).toBeDefined();
        // Should render SVG (as silhouette)
        expect(screen.getByTestId('robot-svg-mock')).toBeDefined();
        // Should NOT show robot name
        expect(screen.queryByText('Test Robot')).toBeNull();
    });

    it('renders robot when unlocked', () => {
        render(
            <CollectionSlot
                role="ATTACKER"
                rarity={1}
                unlocked={true}
                robot={MOCK_ROBOT}
            />
        );

        // Should NOT show "?"
        expect(screen.queryByText('?')).toBeNull();
        // Should render SVG
        expect(screen.getByTestId('robot-svg-mock')).toBeDefined();
        // Should show robot name
        expect(screen.getByText('Test Robot')).toBeDefined();
    });
});
