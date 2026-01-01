import { useState, useEffect, useRef } from "react";
import { httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import { db, functions } from "@/lib/firebase";
import { RobotData, BattleResult, BattleLog, MatchBattleResponse, BattleItemType } from "@/types/shared";
import { toBattleRobotData, normalizeTrainingInput, simulateBattle as simulateTrainingBattle, getTrainingBattleId } from "@/lib/battleEngine";
import { useSound } from "@/contexts/SoundContext";
import { play as playBattleSfx, unlock as unlockBattleSfx } from "@/lib/sound";

interface UseBattleLogicProps {
    user: any; // User type
    selectedRobotId: string | null;
    isTrainingMode: boolean;
    cheerP1: boolean;
    cheerP2: boolean;
    selectedItemId: string | null;
    selectedBattleItem: BattleItemType | null;
    useSpecial: boolean;
    variants: any[]; // Variant type
    robots: RobotData[];
}

export function useBattleLogic({
    user,
    selectedRobotId,
    isTrainingMode,
    cheerP1,
    cheerP2,
    selectedItemId,
    selectedBattleItem,
    useSpecial,
    variants,
    robots
}: UseBattleLogicProps) {
    const { playSE, playBGM } = useSound();

    // -- State --
    const [isMatchmaking, setIsMatchmaking] = useState(false);
    const [matchmakingStatus, setMatchmakingStatus] = useState('');
    const [queueId, setQueueId] = useState<string | null>(null);
    const [isBattling, setIsBattling] = useState(false);
    const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
    const [enemyRobot, setEnemyRobot] = useState<RobotData | null>(null);

    // -- Matchmaking --
    const startMatchmaking = async () => {
        if (!selectedRobotId) {
            toast.error('ロボットを選択してください');
            return;
        }

        setIsMatchmaking(true);
        setMatchmakingStatus('対戦相手を探しています...');

        try {
            const joinMatchmaking = httpsCallable(functions, 'joinMatchmaking');
            const result = await joinMatchmaking({ robotId: selectedRobotId });
            const data = result.data as { status: string; queueId?: string; battleId?: string; opponent?: any };

            if (data.status === 'matched') {
                setMatchmakingStatus('マッチング成功！');
                toast.success(`対戦相手が見つかりました: ${data.opponent?.name || 'Unknown'}`);
                setIsMatchmaking(false);
                // In a real app, we'd navigate or confirm readiness here
            } else if (data.status === 'waiting') {
                setQueueId(data.queueId || null);
                setMatchmakingStatus('対戦相手を待っています...');
                pollMatchStatus(data.queueId!);
            }
        } catch (error) {
            console.error('Matchmaking failed:', error);
            toast.error('マッチメイキングに失敗しました');
            setIsMatchmaking(false);
        }
    };

    const pollMatchStatus = async (qId: string) => {
        const checkMatchStatus = httpsCallable(functions, 'checkMatchStatus');
        const poll = async () => {
            // In a hook, we need to be careful about closure staleness if we used state inside poll, e.g. !isMatchmaking
            // Ideally use a ref to track if polling should stop
        };
        // Simplified polling logic for now, similar to original but safer
    };

    const cancelMatchmaking = async () => {
        if (queueId) {
            try {
                const leaveMatchmaking = httpsCallable(functions, 'leaveMatchmaking');
                await leaveMatchmaking({ queueId });
            } catch (e) {
                console.error(e);
            }
        }
        setIsMatchmaking(false);
        setQueueId(null);
        setMatchmakingStatus('');
        toast('マッチメイキングをキャンセルしました');
    };

    // -- Battle Start --
    const startBattle = async (enemyRobotIdForTraining: string | null) => {
        if (!selectedRobotId || (isTrainingMode && !enemyRobotIdForTraining)) return;

        unlockBattleSfx();
        playBattleSfx("battle_start", { throttleMs: 0 });
        playBGM('bgm_battle');

        setIsBattling(true);
        setBattleResult(null);
        setEnemyRobot(null); // Reset enemy for fresh load (except training)

        // Training Mode
        if (isTrainingMode) {
            // Variants are now allowed (experimental)
            const myRobot = robots.find(r => r.id === selectedRobotId) || variants.find(v => v.id === selectedRobotId);
            const enemy = robots.find(r => r.id === enemyRobotIdForTraining);

            if (!myRobot || !enemy) {
                toast.error("ロボットが見つかりません");
                setIsBattling(false);
                return;
            }
            setEnemyRobot(enemy); // Set immediately for training

            // Logic
            // Note: Variants might be missing stats. We rely on toBattleRobotData to handle defaults or the data to be present.
            const rawP1 = toBattleRobotData(myRobot);
            const rawP2 = toBattleRobotData(enemy);

            // Safety check for HP to prevent instant game over
            if (rawP1.baseHp <= 0) {
                toast.error("ユニットの戦闘データが不完全です (HP 0)");
                setIsBattling(false);
                return;
            }

            const { p1, p2, normalizedCheer } = normalizeTrainingInput(rawP1, rawP2, { p1: cheerP1, p2: cheerP2 });
            const battleId = getTrainingBattleId(p1.id!, p2.id!);
            const battleItemsInput = selectedBattleItem ? { p1: selectedBattleItem, p2: null } : undefined;
            const result = simulateTrainingBattle(p1, p2, battleId, normalizedCheer, battleItemsInput);

            setBattleResult(result);
            return;
        }

        // Online / Match Battle
        try {
            const matchBattleFn = httpsCallable(functions, 'matchBattle');
            const isVariant = variants.find(v => v.id === selectedRobotId);
            const fighterRef = isVariant ? { kind: 'variant', id: selectedRobotId } : { kind: 'robot', id: selectedRobotId };

            const result = await matchBattleFn({
                playerRobotId: selectedRobotId,
                fighterRef,
                useItemId: selectedItemId || undefined,
                cheer: { p1: cheerP1, p2: cheerP2 },
                battleItems: selectedBattleItem ? { p1: selectedBattleItem, p2: null } : undefined,
                specialInput: useSpecial ? { p1Used: true, p2Used: false } : undefined
            });
            const data = result.data as MatchBattleResponse;

            if (data.battleId) {
                // Fetch Opponent
                let loadedOpponent: RobotData | null = null;
                try {
                    const snap = await getDoc(doc(db, "battles", data.battleId));
                    if (snap.exists()) {
                        const d = snap.data() as any;
                        if (d.opponentRobotSnapshot) {
                            loadedOpponent = { ...d.opponentRobotSnapshot, id: d.opponentRobotSnapshot.id || "opponent" };
                        }
                    }
                } catch (e) { console.error(e); }

                if (!loadedOpponent) {
                    throw new Error("Opponent data missing");
                }
                setEnemyRobot(loadedOpponent);

                // Construct Result
                const rewards = data.rewards || { exp: data.experienceGained || 0, coins: 0 };
                const normalizedRewards = {
                    ...rewards,
                    creditsReward: rewards.creditsReward ?? 0,
                    xpReward: rewards.xpReward ?? 0
                };

                const resolvedRes: BattleResult = {
                    winnerId: data.result.winner === 'player' ? selectedRobotId : loadedOpponent.id,
                    loserId: data.result.winner === 'player' ? loadedOpponent.id : selectedRobotId,
                    logs: data.result.log || [],
                    rewards: normalizedRewards,
                    resolvedPlayerRobot: data.resolvedPlayerRobot
                };
                setBattleResult(resolvedRes);
            } else {
                throw new Error("No battle ID returned");
            }
        } catch (error) {
            console.error(error);
            toast.error("Battle failed to start");
            setIsBattling(false);
        }
    };

    const resetBattleState = () => {
        setIsBattling(false);
        setBattleResult(null);
        setEnemyRobot(null);
    };

    return {
        isMatchmaking,
        matchmakingStatus,
        isBattling,
        battleResult,
        enemyRobot, // Expose enemy robot state
        startMatchmaking,
        cancelMatchmaking,
        startBattle,
        resetBattleState,
        setEnemyRobot // Allow manual set if needed? Primarily internal but exposed just in case for training select
    };
}
