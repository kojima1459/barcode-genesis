/**
 * Boss Battle Page
 * Dedicated page for Daily Boss battles
 */

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { getDb, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { collection, getDocs } from "firebase/firestore";
import { ArrowLeft, Skull, Loader2, Shield, Zap, Trophy, XCircle, RotateCw, ScanBarcode } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSound } from "@/contexts/SoundContext";
import RobotSVG from "@/components/RobotSVG";
import { DailyBossData, BossType, WeeklyBossData, WeeklyBossResponse } from "@/types/boss";
import { RobotData, VariantData } from "@/types/shared";
import { SystemSkeleton } from "@/components/ui/SystemSkeleton";
import Interactive from "@/components/ui/interactive";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BattleReplay from "@/components/BattleReplay";
import SEO from "@/components/SEO";
import { cn } from "@/lib/utils";

const BOSS_TYPE_COLORS: Record<BossType, string> = {
    TANK: "text-gray-400 border-gray-500/30",
    SPEED: "text-blue-400 border-blue-500/30",
    SHIELD: "text-emerald-400 border-emerald-500/30",
    REFLECT: "text-purple-400 border-purple-500/30",
    BERSERK: "text-red-400 border-red-500/30",
};

interface BossBattleResult {
    battleId: string;
    result: 'win' | 'loss';
    winnerId: string;
    logs: any[];
    rewards: {
        xp: number;
        credits: number;
        scanTokens: number;
    };
    bossShieldBroken?: boolean;
    turnCount?: number;
}

export default function BossBattle({ modeOverride }: { modeOverride?: "weekly" | "daily" }) {
    const { t } = useLanguage();
    const { playSE } = useSound();
    const { user } = useAuth();
    const [location, setLocation] = useLocation();

    // States
    const [loading, setLoading] = useState(true);
    const [bossData, setBossData] = useState<DailyBossData | null>(null);
    const [canChallenge, setCanChallenge] = useState(false);
    const [hasScannedToday, setHasScannedToday] = useState(false);
    const [robots, setRobots] = useState<RobotData[]>([]);
    const [variants, setVariants] = useState<VariantData[]>([]);
    const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null);
    const [useCheer, setUseCheer] = useState(false);
    const [useSpecial, setUseSpecial] = useState(false);
    const [isBattling, setIsBattling] = useState(false);
    const [battleResult, setBattleResult] = useState<BossBattleResult | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    const search = location.includes("?") ? location.split("?")[1] : "";
    const query = new URLSearchParams(search);
    const mode = modeOverride || query.get("mode");

    const loadData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setLoadError(null);
        try {
            if (mode === "weekly") {
                const getWeeklyBoss = httpsCallable(functions, "getWeeklyBoss");
                const weeklyResult = await getWeeklyBoss();
                const weeklyResponse = weeklyResult.data as WeeklyBossResponse;
                const weeklyBoss = weeklyResponse?.boss as WeeklyBossData | undefined;
                if (!weeklyBoss) {
                    throw new Error("Weekly boss not available");
                }
                const mappedBoss: DailyBossData = {
                    bossId: weeklyBoss.bossId,
                    dateKey: weeklyResponse.weekKey || weeklyBoss.weekKey || "",
                    type: "TANK",
                    name: weeklyBoss.name,
                    epithet: "WEEKLY BOSS",
                    baseName: weeklyBoss.name,
                    stats: weeklyBoss.stats,
                    role: "BOSS",
                    parts: {},
                    colors: {},
                };
                setBossData(mappedBoss);
                setCanChallenge(true);
                setHasScannedToday(true);
            } else {
                // Load boss data
                const getDailyBoss = httpsCallable(functions, "getDailyBoss");
                const bossResult = await getDailyBoss();
                const bossResponse = bossResult.data as { boss: DailyBossData; canChallenge: boolean; hasScannedToday: boolean };
                setBossData(bossResponse.boss);
                setCanChallenge(bossResponse.canChallenge);
                setHasScannedToday(bossResponse.hasScannedToday);
            }

            // Load robots
            const robotsSnap = await getDocs(collection(getDb(), "users", user.uid, "robots"));
            const robotList = robotsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RobotData));
            setRobots(robotList);

            // Load variants
            const variantsSnap = await getDocs(collection(getDb(), "users", user.uid, "variants"));
            const variantList = variantsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VariantData));
            setVariants(variantList);
        } catch (error: any) {
            console.error("Failed to load boss battle data:", error);
            const code = error?.code || '';
            if (code === 'unauthenticated') {
                setLoadError(t('login_required'));
            } else if (mode === "weekly") {
                setLoadError("今週のボス情報を取得できませんでした");
            } else {
                setLoadError(t('data_load_error'));
            }
        } finally {
            setLoading(false);
        }
    }, [user, mode]);

    // Auto-select first robot when robots are loaded
    useEffect(() => {
        if (robots.length > 0 && !selectedRobotId) {
            setSelectedRobotId(robots[0].id!);
        }
    }, [robots, selectedRobotId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleStartBattle = async () => {
        if (!selectedRobotId || !bossData || !canChallenge) return;

        setIsBattling(true);
        playSE('se_battle_start');

        try {
            const executeBossBattle = httpsCallable(functions, "executeBossBattle");
            const isVariant = variants.some(v => v.id === selectedRobotId);

            const result = await executeBossBattle({
                robotId: isVariant ? undefined : selectedRobotId,
                variantId: isVariant ? selectedRobotId : undefined,
                useCheer,
                useSpecial,
            });

            const battleData = result.data as BossBattleResult;
            setBattleResult(battleData);

            // Play result sound
            if (battleData.result === 'win') {
                playSE('se_win');
                toast.success(t('boss_victory'));
            } else {
                playSE('se_lose');
                toast.error(t('boss_defeat'));
            }
        } catch (error: any) {
            console.error("Boss battle error:", error);
            if (error.code === 'functions/failed-precondition' && error.message === 'already-challenged-today') {
                setCanChallenge(false);
                toast.error(t('boss_completed'));
            } else if (error.code === 'functions/failed-precondition' && error.message === 'scan-required-today') {
                setHasScannedToday(false);
                setCanChallenge(false);
                toast.error('今日のボスに挑むには、先に1回スキャンしよう');
            } else {
                toast.error("バトルに失敗しました");
            }
        } finally {
            setIsBattling(false);
        }
    };

    const selectedRobot = robots.find(r => r.id === selectedRobotId)
        || (variants.find(v => v.id === selectedRobotId) ? { ...variants.find(v => v.id === selectedRobotId), name: `Variant ${selectedRobotId?.slice(0, 4)}`, baseHp: 0 } as any : null);

    if (loading) {
        return (
            <div className="flex justify-center p-8 min-h-screen items-center bg-background">
                <SystemSkeleton
                    className="w-full max-w-lg aspect-video rounded-3xl"
                    text="CONNECTING TO BOSS SERVER..."
                    subtext="ANALYZING THREAT LEVEL"
                />
            </div>
        );
    }

    if (loadError || !bossData) {
        return (
            <div className="min-h-screen bg-background text-foreground p-4 flex flex-col items-center justify-center gap-4">
                <XCircle className="w-16 h-16 text-red-500" />
                <p className="text-lg font-medium text-center">ボスデータの読み込みに失敗しました</p>
                {loadError && (
                    <p className="text-sm text-muted-foreground">{loadError}</p>
                )}
                <div className="flex gap-3 mt-2">
                    <Button onClick={loadData} variant="default" className="gap-2">
                        <RotateCw className="w-4 h-4" />
                        リトライ
                    </Button>
                    <Link href="/">
                        <Button variant="outline">ホームに戻る</Button>
                    </Link>
                </div>
            </div>
        );
    }

    // Battle Result Screen
    if (battleResult) {
        const isWin = battleResult.result === 'win';

        return (
            <div className="min-h-screen bg-background text-foreground p-4 flex flex-col pb-24">
                <SEO title={isWin ? t('boss_victory') : t('boss_defeat')} />

                <header className="flex items-center mb-6 max-w-4xl mx-auto w-full">
                    <Button variant="ghost" onClick={() => setLocation('/')}>
                        <ArrowLeft className="h-5 w-5 mr-2" />
                        {t('go_home')}
                    </Button>
                </header>

                <main className="flex-1 max-w-4xl mx-auto w-full space-y-6">
                    {/* Result Banner */}
                    <div className={cn(
                        "text-center py-8 rounded-xl border",
                        isWin ? "bg-linear-to-br from-yellow-500/20 to-orange-500/10 border-yellow-500/30" : "bg-linear-to-br from-red-500/20 to-gray-500/10 border-red-500/30"
                    )}>
                        <Badge variant={isWin ? "default" : "secondary"} className="mb-4 text-lg px-4 py-2">
                            <Skull className="w-5 h-5 mr-2" />
                            {isWin ? t('boss_victory') : t('boss_defeat')}
                        </Badge>
                        <h2 className="text-2xl font-orbitron font-semibold text-white">
                            vs {bossData.name}
                        </h2>
                        {battleResult.bossShieldBroken && (
                            <p className="text-emerald-400 mt-2 text-sm">
                                🛡️ {t('boss_shield_break')}
                            </p>
                        )}
                    </div>

                    {/* Rewards */}
                    <Card className="border-white/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-yellow-500" />
                                獲得報酬
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-2xl font-bold text-neon-cyan">{battleResult.rewards.xp}</div>
                                <div className="text-xs text-muted-foreground">XP</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-yellow-400">{battleResult.rewards.credits}</div>
                                <div className="text-xs text-muted-foreground">Credits</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-neon-pink">{battleResult.rewards.scanTokens}</div>
                                <div className="text-xs text-muted-foreground">Tokens</div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Battle Replay */}
                    {selectedRobot && bossData && (
                        <Card className="border-white/10">
                            <CardHeader>
                                <CardTitle>バトルリプレイ</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <BattleReplay
                                    p1={selectedRobot as RobotData}
                                    p2={{
                                        id: bossData.bossId || 'boss',
                                        name: bossData.name,
                                        epithet: bossData.epithet || 'BOSS',
                                        baseHp: bossData.stats?.hp || 1000,
                                        baseAttack: bossData.stats?.attack || 100,
                                        baseDefense: bossData.stats?.defense || 50,
                                        baseSpeed: bossData.stats?.speed || 50,
                                        rarity: 5,
                                        rarityName: 'BOSS',
                                        parts: bossData.parts || {},
                                        colors: bossData.colors || { primary: '#ff0055', secondary: '#330011', accent: '#ff5588', glow: '#ff0055' },
                                    } as RobotData}
                                    result={{
                                        winnerId: battleResult.winnerId,
                                        loserId: battleResult.winnerId === selectedRobot.id ? (bossData.bossId || 'boss') : selectedRobot.id!,
                                        logs: battleResult.logs || [],
                                        rewards: battleResult.rewards || { exp: 0, coins: 0 },
                                    }}
                                    onComplete={() => {
                                        // Battle replay finished
                                    }}
                                />
                            </CardContent>
                        </Card>
                    )}
                </main>
            </div>
        );
    }

    // Pre-battle Selection Screen
    return (
        <div className="min-h-screen bg-background text-foreground p-4 flex flex-col pb-24">
            <SEO title={`BOSS: ${bossData.name}`} />
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 pointer-events-none" />

            <header className="flex items-center mb-6 max-w-4xl mx-auto w-full relative z-10">
                <Link href="/">
                    <Button variant="ghost">
                        <ArrowLeft className="h-5 w-5 mr-2" />
                        {t('back')}
                    </Button>
                </Link>
                <div className="flex-1 text-center">
                    <Badge variant="destructive" className="font-orbitron">
                        <Skull className="w-4 h-4 mr-1" />
                        BOSS BATTLE
                    </Badge>
                </div>
            </header>

            <main className="flex-1 max-w-4xl mx-auto w-full space-y-6 relative z-10">
                {/* Boss Card */}
                <Card className={cn(
                    "border-2",
                    BOSS_TYPE_COLORS[bossData.type],
                    "bg-linear-to-br from-red-500/10 to-orange-500/5"
                )}>
                    <CardContent className="p-6">
                        <div className="flex gap-6">
                            {/* Boss Visual */}
                            <div className="w-32 h-32 relative shrink-0">
                                <div className="absolute inset-0 rounded-xl bg-linear-to-br from-red-500/30 to-orange-500/30 border border-red-500/50 animate-pulse" />
                                <RobotSVG
                                    parts={bossData.parts}
                                    colors={bossData.colors}
                                    size={100}
                                    className="relative z-10 m-auto"
                                />
                            </div>

                            {/* Boss Info */}
                            <div className="flex-1">
                                <h2 className="text-2xl font-orbitron font-semibold text-white mb-2">
                                    {bossData.name}
                                </h2>
                                <Badge className={cn("mb-3", BOSS_TYPE_COLORS[bossData.type])}>
                                    {t(`boss_type_${bossData.type.toLowerCase()}` as any)}
                                </Badge>

                                {/* Stats */}
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">HP:</span>
                                        <span className="text-white font-bold">{bossData.stats.hp}</span>
                                        {bossData.shieldHp && (
                                            <span className="text-emerald-400 text-xs">(+🛡️{bossData.shieldHp})</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">ATK:</span>
                                        <span className="text-white font-bold">{bossData.stats.attack}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">DEF:</span>
                                        <span className="text-white font-bold">{bossData.stats.defense}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">SPD:</span>
                                        <span className="text-white font-bold">{bossData.stats.speed}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Robot Selection */}
                <Card className="border-white/10">
                    <CardHeader>
                        <CardTitle>{t('select_robot')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="robots" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="robots">オリジナル ({robots.length})</TabsTrigger>
                                <TabsTrigger value="variants">フュージョン ({variants.length})</TabsTrigger>
                            </TabsList>

                            <TabsContent value="robots" className="mt-2">
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                                    {robots.map(robot => (
                                        <Interactive
                                            key={robot.id}
                                            onClick={() => setSelectedRobotId(robot.id!)}
                                            className={cn(
                                                "p-2 border rounded cursor-pointer",
                                                selectedRobotId === robot.id ? "border-primary bg-primary/10" : "border-white/10"
                                            )}
                                            haptic="light"
                                        >
                                            <div className="text-sm font-bold truncate">{robot.name}</div>
                                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                                <span>Lv.{robot.level || 1}</span>
                                                <span>HP: {robot.baseHp}</span>
                                            </div>
                                        </Interactive>
                                    ))}
                                </div>
                            </TabsContent>

                            <TabsContent value="variants" className="mt-2">
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                                    {variants.map(v => (
                                        <Interactive
                                            key={v.id}
                                            onClick={() => setSelectedRobotId(v.id!)}
                                            className={cn(
                                                "p-2 border rounded cursor-pointer",
                                                selectedRobotId === v.id ? "border-primary bg-primary/10" : "border-white/10"
                                            )}
                                            haptic="light"
                                        >
                                            <div className="text-sm font-bold truncate">Variant {v.id?.slice(0, 4)}</div>
                                        </Interactive>
                                    ))}
                                    {variants.length === 0 && (
                                        <div className="col-span-2 text-center text-xs text-muted-foreground p-4">
                                            フュージョンがありません
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                {/* Options */}
                <div className="flex gap-4">
                    <Interactive
                        onClick={() => setUseCheer(!useCheer)}
                        className={cn(
                            "flex-1 p-3 rounded-lg border text-center",
                            useCheer ? "border-yellow-500/50 bg-yellow-500/10" : "border-white/10"
                        )}
                    >
                        <span className="text-lg">🎉</span>
                        <div className="text-xs mt-1">声援</div>
                    </Interactive>
                    <Interactive
                        onClick={() => setUseSpecial(!useSpecial)}
                        className={cn(
                            "flex-1 p-3 rounded-lg border text-center",
                            useSpecial ? "border-neon-cyan/50 bg-neon-cyan/10" : "border-white/10"
                        )}
                    >
                        <Zap className="w-5 h-5 mx-auto text-neon-cyan" />
                        <div className="text-xs mt-1">必殺技</div>
                    </Interactive>
                </div>

                {/* Scan Required Notice */}
                {!hasScannedToday && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
                        <p className="text-yellow-400 text-sm font-medium mb-3">
                            今日のボスに挑むには、先に1回スキャンしよう
                        </p>
                        <Link href="/scan">
                            <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
                                <ScanBarcode className="w-4 h-4 mr-2" />
                                スキャンする
                            </Button>
                        </Link>
                    </div>
                )}

                {/* Challenge Button */}
                <Button
                    size="lg"
                    className={cn(
                        "w-full h-14 text-lg font-bold",
                        canChallenge
                            ? "bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                            : "bg-gray-600"
                    )}
                    onClick={handleStartBattle}
                    disabled={!selectedRobotId || !canChallenge || isBattling}
                >
                    {isBattling ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            戦闘中...
                        </>
                    ) : canChallenge ? (
                        <>
                            <Skull className="w-5 h-5 mr-2" />
                            {t('boss_challenge')}
                        </>
                    ) : hasScannedToday ? (
                        t('boss_completed')
                    ) : (
                        '🔒 スキャンして解放'
                    )}
                </Button>
            </main>
        </div>
    );
}
