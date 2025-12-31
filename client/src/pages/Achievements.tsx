import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy } from 'lucide-react';
import { Interactive } from '@/components/ui/interactive';

interface Achievement {
    achievementId: number;
    name?: string;
    description?: string;
    isCompleted: boolean;
    completedAt?: any;
}

// Simple master data for MVP
const ACHIEVEMENT_MASTER: Record<number, { name: string; description: string }> = {
    1: { name: 'First Blood', description: 'Win your first battle' },
    2: { name: 'Veteran', description: 'Win 100 battles' },
    4: { name: 'On Fire', description: 'Win 3 battles in a row' },
    45: { name: 'Legend', description: 'Reach 1500 Ranking Points' },
};

export default function Achievements() {
    const { user } = useAuth();
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAchievements() {
            if (!user) return;
            try {
                const querySnapshot = await getDocs(
                    collection(db, 'users', user.uid, 'achievements')
                );
                const data = querySnapshot.docs.map(doc => ({
                    ...doc.data(),
                    achievementId: Number(doc.id)
                })) as Achievement[];
                setAchievements(data);
            } catch (error) {
                console.error("Error fetching achievements:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchAchievements();
    }, [user]);

    return (
        <div className="container mx-auto p-4 max-w-4xl pb-24">
            <div className="flex items-center gap-2 mb-6">
                <Trophy className="w-8 h-8 text-yellow-500" />
                <h1 className="text-3xl font-bold">Achievements</h1>
            </div>

            <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="grid gap-4">
                    {Object.entries(ACHIEVEMENT_MASTER).map(([idStr, info]) => {
                        const id = Number(idStr);
                        const userAchievement = achievements.find(a => a.achievementId === id);
                        const isUnlocked = userAchievement?.isCompleted;

                        return (
                            <Interactive key={id} className={`h-auto overflow-hidden rounded-xl border ${isUnlocked ? 'border-yellow-500 bg-yellow-500/10' : 'opacity-60 grayscale'}`} disabled={!isUnlocked}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            {isUnlocked ? <Trophy className="w-5 h-5 text-yellow-500" /> : <Trophy className="w-5 h-5 text-gray-500" />}
                                            {info.name}
                                        </CardTitle>
                                        {isUnlocked && <span className="text-xs text-yellow-500 font-bold">UNLOCKED</span>}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-gray-400">{info.description}</p>
                                </CardContent>
                            </Interactive>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}
