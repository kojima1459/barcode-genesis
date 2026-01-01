import { RobotData } from "@/types/shared";

/**
 * Select the active robot to display on Home screen
 * 
 * Priority logic:
 * 1. User manual selection (activeUnitId) - if set and exists
 * 2. Highest level
 * 3. Newest updatedAt (tiebreaker #1)
 * 4. Oldest createdAt (tiebreaker #2)
 * 5. ID alphabetically (fallback)
 * 
 * @param robots - Array of user's robots
 * @param activeUnitId - User's manually selected active unit ID
 * @returns The robot to display, or null if no robots
 */
export function selectActiveRobot(
    robots: RobotData[],
    activeUnitId?: string | null
): RobotData | null {
    if (robots.length === 0) return null;

    // Priority 1: User manual selection
    if (activeUnitId) {
        const selected = robots.find(r => r.id === activeUnitId);
        if (selected) return selected;
    }

    // Priority 2-5: Deterministic sorting
    const sorted = [...robots].sort((a, b) => {
        // Level DESC (highest first)
        const levelDiff = (b.level || 1) - (a.level || 1);
        if (levelDiff !== 0) return levelDiff;

        // updatedAt DESC (newest first)
        const aUpdated = a.updatedAt?.toMillis?.() || a.updatedAt || 0;
        const bUpdated = b.updatedAt?.toMillis?.() || b.updatedAt || 0;
        if (bUpdated !== aUpdated) return bUpdated - aUpdated;

        // createdAt ASC (oldest first)
        const aCreated = a.createdAt?.toMillis?.() || a.createdAt || 0;
        const bCreated = b.createdAt?.toMillis?.() || b.createdAt || 0;
        if (aCreated !== bCreated) return aCreated - bCreated;

        // Fallback: id alphabetically
        return (a.id || '').localeCompare(b.id || '');
    });

    return sorted[0];
}
