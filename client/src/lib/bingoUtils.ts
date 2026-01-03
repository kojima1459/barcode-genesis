/**
 * Client-side Bingo Utilities
 */

import { BingoCell, checkBingoCondition, getJSTDateKey } from '../../../shared/bingoConditions';
import { getDb } from './firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';

export interface DailyBingoState {
    dateKey: string;
    cardConditions: BingoCell[];
    scannedBarcodes: string[];
    completedCount: number;
    rewardClaimed: boolean;
    createdAt: any;
}

/**
 * Get or create today's bingo state
 */
export async function getTodayBingoState(userId: string): Promise<DailyBingoState | null> {
    const dateKey = getJSTDateKey();
    const bingoRef = doc(getDb(), 'users', userId, 'dailyBingo', dateKey);

    const snapshot = await getDoc(bingoRef);
    if (snapshot.exists()) {
        return snapshot.data() as DailyBingoState;
    }

    return null;
}

/**
 * Check barcode against bingo conditions and update if matched
 * Returns number of newly completed cells
 */
export async function checkAndUpdateBingo(
    userId: string,
    barcode: string,
    cardConditions: BingoCell[]
): Promise<{ updated: boolean; newCompletions: number; totalCompleted: number }> {
    let newCompletions = 0;
    const updatedConditions = cardConditions.map(cell => {
        if (!cell.completed && checkBingoCondition(cell.id, barcode)) {
            newCompletions++;
            return { ...cell, completed: true, barcode };
        }
        return cell;
    });

    if (newCompletions === 0) {
        return { updated: false, newCompletions: 0, totalCompleted: cardConditions.filter(c => c.completed).length };
    }

    const dateKey = getJSTDateKey();
    const bingoRef = doc(getDb(), 'users', userId, 'dailyBingo', dateKey);
    const totalCompleted = updatedConditions.filter(c => c.completed).length;

    await updateDoc(bingoRef, {
        cardConditions: updatedConditions,
        scannedBarcodes: arrayUnion(barcode),
        completedCount: totalCompleted
    });

    return { updated: true, newCompletions, totalCompleted };
}

/**
 * Get reward tier for completion count
 */
export function getRewardTier(completedCount: number): { tier: number; xp: number; credits: number } | null {
    if (completedCount >= 9) return { tier: 3, xp: 200, credits: 50 };
    if (completedCount >= 5) return { tier: 2, xp: 100, credits: 0 };
    if (completedCount >= 3) return { tier: 1, xp: 50, credits: 0 };
    return null;
}
