import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { db, functions } from "@/lib/firebase";
import { collection, getDoc, getDocs, query, orderBy, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { ArrowLeft, Loader2, Sword, Wifi, Users, X } from "lucide-react";
import RobotSVG from "@/components/RobotSVG";
import { ElementalBurst, SkillCutIn } from "@/components/BattleEffects";
import { Link } from "wouter";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { RobotData, VariantData, BattleResult, MatchBattleResponse } from "@/types/shared";
import ShareButton from "@/components/ShareButton";
import AdBanner from "@/components/AdBanner";
import { useSound } from "@/contexts/SoundContext";
import {
  StatIconATK,
  StatIconDEF,
  RoleIconSpeed,
  RoleIconTricky
} from "@/components/StatIcons";
import {
  getMuted as getBattleSfxMuted,
  play as playBattleSfx,
  preload as preloadBattleSfx,
  setMuted as setBattleSfxMuted,
  unlock as unlockBattleSfx,
  playGenerated,
} from "@/lib/sound";
import { getItemLabel } from "@/lib/items";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Zap, Shield, Heart } from "lucide-react";
import { useRobotFx } from "@/hooks/useRobotFx";
import { Interactive } from "@/components/ui/interactive";
import { SystemSkeleton } from "@/components/ui/SystemSkeleton";
import { CountUp } from "@/components/ui/CountUp";
import { simulateBattle as simulateTrainingBattle, getTrainingBattleId, normalizeTrainingInput, toBattleRobotData } from "@/lib/battleEngine";
import { doc } from "firebase/firestore"; // Added doc
import { BattleItemType } from "@/types/shared"; // Added BattleItemType
import { levelFromXp } from "@/lib/level";
import BattleReplay from "@/components/BattleReplay";
import { useBattleLogic } from "@/hooks/useBattleLogic";
import SEO from "@/components/SEO";



export default function Battle() {
  const { t } = useLanguage();
  const { playBGM, playSE } = useSound();
  const prefersReducedMotion = useReducedMotion();
  const { fx, trigger } = useRobotFx();
  const { user } = useAuth();
  /* 
   * State Definitions
   */
  const [robots, setRobots] = useState<RobotData[]>([]);
  const [variants, setVariants] = useState<VariantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLevel, setUserLevel] = useState(1);
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null);

  // Training Mode Selection State
  const [enemyRobotId, setEnemyRobotId] = useState<string | null>(null);
  const [enemyRobots, setEnemyRobots] = useState<RobotData[]>([]);
  const [isTrainingMode, setIsTrainingMode] = useState(false);
  const [battleMode, setBattleMode] = useState<'battle' | 'training' | 'online'>('battle');

  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [currentLogIndex, setCurrentLogIndex] = useState(-1);
  const [damagePopups, setDamagePopups] = useState<{ id: string; value: number; isCritical: boolean; cheerApplied?: boolean; x: number; y: number }[]>([]);
  const [isBattleSfxMuted, setIsBattleSfxMuted] = useState(() => getBattleSfxMuted());

  // Pacing settings
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2>(1);
  const [isSkipped, setIsSkipped] = useState(false);

  // Overload (battle intervention) state
  const [hasUsedOverload, setHasUsedOverload] = useState(false);
  const [isOverloadActive, setIsOverloadActive] = useState(false);
  const [overloadFlash, setOverloadFlash] = useState(false);

  // Cheer (応援) state - Pre-battle reservation
  const [cheerP1, setCheerP1] = useState(false);
  const [cheerP2, setCheerP2] = useState(false);

  // Pre-Battle Item state
  const [selectedBattleItem, setSelectedBattleItem] = useState<BattleItemType | null>(null);

  // Visual effects state
  const [activeEffect, setActiveEffect] = useState<{ element: string; x: number; y: number } | null>(null);
  const [activeCutIn, setActiveCutIn] = useState<{ skillName: string; robotId: string } | null>(null);

  // Special Move (必殺技) state
  const [useSpecial, setUseSpecial] = useState(false);
  const [specialTriggered, setSpecialTriggered] = useState(false);

  // -- Refactored Battle Logic Hook --
  const {
    isMatchmaking,
    matchmakingStatus,
    isBattling,
    battleResult,
    enemyRobot: resolvedEnemyRobot,
    startMatchmaking,
    cancelMatchmaking,
    startBattle: hookStartBattle,
    resetBattleState,
    setEnemyRobot: setHookEnemyRobot
  } = useBattleLogic({
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
  });

  const handleStartBattle = () => {
    hookStartBattle(enemyRobotId);
  };

  const myRobot = robots.find(r => r.id === selectedRobotId)
    || (variants.find(v => v.id === selectedRobotId) ? { ...variants.find(v => v.id === selectedRobotId), name: `Variant ${selectedRobotId?.slice(0, 4)}`, baseHp: 0 } as any : null)
    || battleResult?.resolvedPlayerRobot;

  // Use hook's resolved enemy if battling, otherwise use selection from training list or default logic
  const enemyRobot = isBattling ? resolvedEnemyRobot : (enemyRobots.find(r => r.id === enemyRobotId) || robots.find(r => r.id === enemyRobotId));

  // Optional preselection from /dex: /battle?selected=<robotOrVariantId>
  useEffect(() => {
    const selected = new URLSearchParams(window.location.search).get("selected");
    if (selected) setSelectedRobotId(selected);
  }, []);

  useEffect(() => {
    preloadBattleSfx();
  }, []);

  useEffect(() => {
    setBattleSfxMuted(isBattleSfxMuted);
  }, [isBattleSfxMuted]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const [robotsSnap, variantsSnap, userDoc] = await Promise.all([
          getDocs(query(collection(db, "users", user.uid, "robots"), orderBy("createdAt", "desc"))),
          getDocs(query(collection(db, "users", user.uid, "variants"), orderBy("createdAt", "desc"))),
          getDoc(doc(db, "users", user.uid))
        ]);

        const robotList = robotsSnap.docs.map(snap => ({ id: snap.id, ...snap.data() } as RobotData));
        const variantList = variantsSnap.docs.map(snap => ({ id: snap.id, ...snap.data() } as VariantData));
        const userData = userDoc.data();

        setRobots(robotList);
        setVariants(variantList);
        if (userData) {
          setUserLevel(userData.level || 1);
          setInventory(userData.inventory ?? {});
        }
      } catch (error) {
        console.error("Failed to fetch battle data:", error);
        toast.error("データの読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);



  // レベルとEXPの計算ヘルパー
  const getLevelInfo = (robot: RobotData) => {
    const level = robot.level || 1;
    const exp = robot.xp ?? robot.exp ?? 0;
    const nextLevelExp = level * 100;
    const progress = Math.min(100, (exp / nextLevelExp) * 100);
    return { level, exp, nextLevelExp, progress };
  };

  const getRewardSummary = (rewards: BattleResult["rewards"]) => {
    const creditsReward = rewards.creditsReward ?? rewards.credits ?? rewards.coins ?? 0;
    const xpReward = rewards.xpReward ?? rewards.exp ?? 0;
    const scanTokensGained = typeof rewards.scanTokensGained === "number" ? rewards.scanTokensGained : 0;
    const dailyCreditsCapApplied = Boolean(rewards.dailyCreditsCapApplied ?? rewards.dailyCapApplied);
    const xpBefore = typeof rewards.xpBefore === "number" ? rewards.xpBefore : null;
    const xpAfter = typeof rewards.xpAfter === "number" ? rewards.xpAfter : null;
    const levelBefore = typeof rewards.levelBefore === "number"
      ? rewards.levelBefore
      : xpBefore !== null
        ? levelFromXp(xpBefore)
        : null;
    const levelAfter = typeof rewards.levelAfter === "number"
      ? rewards.levelAfter
      : xpAfter !== null
        ? levelFromXp(xpAfter)
        : levelBefore;
    const hasLevelUp = typeof levelBefore === "number" && typeof levelAfter === "number" && levelAfter > levelBefore;
    return { creditsReward, xpReward, scanTokensGained, dailyCreditsCapApplied, levelBefore, levelAfter, hasLevelUp };
  };

  const battleItemStock = {
    BOOST: inventory.BOOST ?? 0,
    SHIELD: inventory.SHIELD ?? 0,
    JAMMER: inventory.JAMMER ?? inventory.DISRUPT ?? inventory.CANCEL_CRIT ?? 0,
  };

  const itemSlotsUnlocked = userLevel >= 5;
  const canUseBattleItem = (item: "BOOST" | "SHIELD" | "JAMMER") => battleItemStock[item] > 0;

  useEffect(() => {
    if (!itemSlotsUnlocked && selectedBattleItem !== null) {
      setSelectedBattleItem(null);
    }
  }, [itemSlotsUnlocked, selectedBattleItem]);

  const canStartBattle = !!selectedRobotId && (isTrainingMode ? !!enemyRobotId : battleMode === 'battle'); // REF: A1
  const rewardSummary = battleResult ? getRewardSummary(battleResult.rewards) : null;
  const isCreditsCapped =
    !!rewardSummary?.dailyCreditsCapApplied &&
    (rewardSummary?.creditsReward ?? 0) === 0;
  const showCreditsCapWithXp =
    isCreditsCapped && (rewardSummary?.xpReward ?? 0) > 0;
  const isRewardCapped =
    isCreditsCapped && (rewardSummary?.xpReward ?? 0) === 0;


  if (loading) return (
    <div className="flex justify-center p-8 min-h-screen items-center bg-bg">
      <SystemSkeleton
        className="w-full max-w-lg aspect-video rounded-3xl"
        text="CONNECTING TO ARENA SERVER..."
        subtext="SYNCHRONIZING COMBAT PROTOCOLS"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg text-text p-4 flex flex-col pb-24 overflow-hidden relative">
      <SEO
        title={t("seo_battle_title")}
        description={t("seo_battle_desc")}
      />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-bg/90 pointer-events-none" />
      <header className="flex items-center mb-8 max-w-4xl mx-auto w-full">
        <Link href="/">
          <Button variant="ghost" className="mr-4">
            <ArrowLeft className="h-5 w-5 mr-2" />
            {t('back')}
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-primary">{t('battle_arena')}</h1>
        <div className="ml-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsBattleSfxMuted((prev) => !prev)}
            aria-label={isBattleSfxMuted ? "バトル効果音をオン" : "バトル効果音をオフ"}
          >
            <span className="text-lg">{isBattleSfxMuted ? "🔇" : "🔊"}</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full space-y-8">
        {/* ロボット選択エリア */}
        {!battleResult && !isBattling && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-bold">{t('select_robot')}</h2>
                <div className="text-xs text-muted-foreground mb-2">
                  {t('your_id')}: <span className="font-mono bg-secondary px-1 rounded select-all">{user?.uid}</span>
                </div>
                <Tabs defaultValue="robots" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="robots">オリジナル ({robots.length})</TabsTrigger>
                    <TabsTrigger value="variants">フュージョン ({variants.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="robots" className="mt-2">
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                      {robots.map(robot => {
                        const { level } = getLevelInfo(robot);
                        return (
                          <Interactive
                            key={robot.id}
                            onClick={() => setSelectedRobotId(robot.id)}
                            className={`p-2 border rounded cursor-pointer ${selectedRobotId === robot.id ? 'border-primary bg-primary/10' : ''}`}
                            haptic="light"
                          >
                            <div className="text-sm font-bold truncate">{robot.name}</div>
                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                              <span>Lv.{level}</span>
                              <span>HP: {robot.baseHp}</span>
                            </div>
                          </Interactive>
                        );
                      })}
                      {robots.length === 0 && <div className="col-span-2 text-center text-xs text-muted-foreground p-4">ロボットがいません。スキャンして生成してください。</div>}
                    </div>
                  </TabsContent>

                  <TabsContent value="variants" className="mt-2">
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                      {variants.map(v => (
                        <Interactive
                          key={v.id}
                          onClick={() => setSelectedRobotId(v.id!)}
                          className={`p-2 border rounded cursor-pointer ${selectedRobotId === v.id ? 'border-primary bg-primary/10' : ''}`}
                          haptic="light"
                        >
                          <div className="text-sm font-bold truncate">{v.name || `バリアント ${v.id?.slice(0, 4)}`}</div>
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>合成</span>
                            <span>HP: ??</span>
                          </div>
                        </Interactive>
                      ))}
                      {variants.length === 0 && <div className="col-span-2 text-center text-xs text-muted-foreground p-4">バリアントがありません。工場で作成してください！</div>}
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="mt-6 pt-4 border-t">
                  <label className="text-sm font-bold mb-2 block">バトルアイテム</label>
                  <select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="w-full border rounded p-2 text-sm bg-background"
                    disabled={isTrainingMode || isBattling}
                  >
                    <option value="">なし</option>
                    {Object.entries(inventory)
                      .filter(([id, qty]) => qty > 0 && ['repair_kit', 'attack_boost', 'defense_boost', 'critical_lens'].includes(id))
                      .map(([id, qty]) => (
                        <option key={id} value={id}>
                          {getItemLabel(id)} (x{qty})
                        </option>
                      ))}
                  </select>
                  {isTrainingMode && <p className="text-xs text-muted-foreground mt-1">トレーニングではアイテムを使用できません</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <Tabs value={battleMode} onValueChange={(v) => {
                  setBattleMode(v as 'battle' | 'training' | 'online');
                  setIsTrainingMode(v === 'training');
                  setEnemyRobotId(null);
                }}>
                  <TabsList className="w-full bg-surface2">
                    <TabsTrigger value="battle" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-black">🆚 対戦</TabsTrigger>
                    <TabsTrigger value="online" className="flex-1 text-cyan-400 data-[state=active]:bg-cyan-500 data-[state=active]:text-black"><Wifi className="w-3 h-3 mr-1" />オンライン</TabsTrigger>
                    <TabsTrigger value="training" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-black">🏋️ 練習</TabsTrigger>
                  </TabsList>
                </Tabs>

                {battleMode === 'battle' && (
                  <>
                    <h2 className="text-xl font-bold">{t('select_opponent')}</h2>
                    <p className="text-xs text-muted-foreground">対戦相手は自動で選ばれます</p>
                  </>
                )}

                {isTrainingMode && (
                  <>
                    <h2 className="text-xl font-bold">対戦相手（自分のロボット）</h2>
                    <p className="text-xs text-muted-foreground">自分のロボット同士で練習試合ができます（経験値は獲得できません）</p>
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                      {robots.filter(r => r.id !== selectedRobotId).length > 0 ? (
                        robots.filter(r => r.id !== selectedRobotId).map(robot => {
                          const { level } = getLevelInfo(robot);
                          return (
                            <div
                              key={robot.id}
                              onClick={() => setEnemyRobotId(robot.id)}
                              className={`p-2 border rounded cursor-pointer hover:bg-secondary/10 ${enemyRobotId === robot.id ? 'border-amber-500 bg-amber-500/10' : ''}`}
                            >
                              <div className="text-sm font-bold truncate">{robot.name}</div>
                              <div className="flex justify-between items-center text-xs text-muted-foreground">
                                <span>Lv.{level}</span>
                                <span>HP: {robot.baseHp}</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="col-span-2 text-center text-muted-foreground py-4">
                          2体以上のロボットが必要です
                        </div>
                      )}
                    </div>
                  </>
                )}

                {battleMode === 'online' && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      オンライン対戦
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      世界中のプレイヤーとリアルタイムでマッチング！近いレーティングの相手と対戦します。
                    </p>

                    {!isMatchmaking ? (
                      <Button
                        onClick={startMatchmaking}
                        disabled={!selectedRobotId}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                        size="lg"
                      >
                        <Wifi className="w-4 h-4 mr-2" />
                        対戦相手を探す
                      </Button>
                    ) : (
                      <div className="text-center space-y-4">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                          <span className="text-lg">{matchmakingStatus}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          30秒以内に相手が見つからない場合はタイムアウトします
                        </div>
                        <Button
                          onClick={cancelMatchmaking}
                          variant="outline"
                          className="w-full"
                        >
                          <X className="w-4 h-4 mr-2" />
                          キャンセル
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="md:col-span-2 flex flex-col items-center gap-4">
              {/* Pre-Battle Items & Cheer */}
              {!isTrainingMode && (
                <div className="w-full space-y-4">
                  {/* Battle Item Selection */}
                  <div className="glass-panel p-4 rounded-lg space-y-3">
                    <div className="flex justify-between items-center text-sm border-b border-white/10 pb-2">
                      <span className="font-bold flex items-center gap-2">
                        <StatIconATK className="w-4 h-4 text-primary" /> バトルアイテム（所持から1個予約）
                      </span>
                      <Link href="/shop">
                        <span className="text-xs text-muted-foreground hover:text-primary underline underline-offset-4">
                          ショップで補充
                        </span>
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                      <Button
                        variant={selectedBattleItem === null ? "secondary" : "ghost"}
                        onClick={() => {
                          if (selectedBattleItem !== null) toast.message("アイテム選択を解除しました", { duration: 1000 });
                          setSelectedBattleItem(null);
                        }}
                        className={`h-20 flex flex-col gap-1 ${selectedBattleItem === null ? 'bg-primary/20 border-primary' : 'border-dashed'}`}
                      >
                        <span className="text-sm font-bold">なし</span>
                        <span className="text-[10px] text-muted-foreground">0 cr</span>
                      </Button>

                      <Button
                        variant={selectedBattleItem === 'BOOST' ? "default" : "outline"}
                        onClick={() => {
                          if (!itemSlotsUnlocked) {
                            toast.message('アイテム枠はLv5で解放されます', { duration: 1500 });
                            return;
                          }
                          if (!canUseBattleItem('BOOST') && selectedBattleItem !== 'BOOST') {
                            toast.error('アイテムが不足しています');
                            return;
                          }
                          setSelectedBattleItem('BOOST');
                          toast.success("⚡ 観客席からブーストドリンクが投げ込まれた！（予約）");
                          playSE('se_equip');
                        }}
                        className={`h-20 flex flex-col gap-1 relative overflow-hidden ${selectedBattleItem === 'BOOST' ? 'bg-amber-500/20 border-amber-500 text-amber-500 hover:bg-amber-500/30' : 'hover:border-amber-500/50'}`}
                        disabled={!itemSlotsUnlocked || (!canUseBattleItem('BOOST') && selectedBattleItem !== 'BOOST')}
                      >
                        <RoleIconSpeed className="w-5 h-5" />
                        <span className="text-xs font-bold">ブースト</span>
                        <span className="text-[10px] opacity-80">初撃ダメージ x1.15</span>
                        <span className="text-[10px] opacity-60">所持: {battleItemStock.BOOST}</span>
                      </Button>

                      <Button
                        variant={selectedBattleItem === 'SHIELD' ? "default" : "outline"}
                        onClick={() => {
                          if (!itemSlotsUnlocked) {
                            toast.message('アイテム枠はLv5で解放されます', { duration: 1500 });
                            return;
                          }
                          if (!canUseBattleItem('SHIELD') && selectedBattleItem !== 'SHIELD') {
                            toast.error('アイテムが不足しています');
                            return;
                          }
                          setSelectedBattleItem('SHIELD');
                          toast.success("🛡️ 観客席からシールド発生装置が投げ込まれた！（予約）");
                          playSE('se_equip');
                        }}
                        className={`h-20 flex flex-col gap-1 relative overflow-hidden ${selectedBattleItem === 'SHIELD' ? 'bg-blue-500/20 border-blue-500 text-blue-500 hover:bg-blue-500/30' : 'hover:border-blue-500/50'}`}
                        disabled={!itemSlotsUnlocked || (!canUseBattleItem('SHIELD') && selectedBattleItem !== 'SHIELD')}
                      >
                        <StatIconDEF className="w-5 h-5" />
                        <span className="text-xs font-bold">シールド</span>
                        <span className="text-[10px] opacity-80">初撃軽減 x0.85</span>
                        <span className="text-[10px] opacity-60">所持: {battleItemStock.SHIELD}</span>
                      </Button>

                      <Button
                        variant={selectedBattleItem === 'JAMMER' ? "default" : "outline"}
                        onClick={() => {
                          if (!itemSlotsUnlocked) {
                            toast.message('アイテム枠はLv5で解放されます', { duration: 1500 });
                            return;
                          }
                          if (!canUseBattleItem('JAMMER') && selectedBattleItem !== 'JAMMER') {
                            toast.error('アイテムが不足しています');
                            return;
                          }
                          setSelectedBattleItem('JAMMER');
                          toast.success("🤞 観客席から妨害アイテムが投げ込まれた！（予約）");
                          playSE('se_equip');
                        }}
                        className={`h-20 flex flex-col gap-1 relative overflow-hidden ${selectedBattleItem === 'JAMMER' ? 'bg-purple-500/20 border-purple-500 text-purple-500 hover:bg-purple-500/30' : 'hover:border-purple-500/50'}`}
                        disabled={!itemSlotsUnlocked || (!canUseBattleItem('JAMMER') && selectedBattleItem !== 'JAMMER')}
                      >
                        <RoleIconTricky className="w-5 h-5" />
                        <span className="text-xs font-bold">ジャマー</span>
                        <span className="text-[10px] opacity-80">次のクリティカル無効</span>
                        <span className="text-[10px] opacity-60">所持: {battleItemStock.JAMMER}</span>
                      </Button>
                    </div>
                    {!itemSlotsUnlocked && (
                      <p className="text-xs text-muted-foreground">
                        アイテム枠はLv5で解放されます
                      </p>
                    )}
                  </div>

                  {/* Cheer Reservation */}
                  <div className="flex flex-wrap gap-4 items-center glass-panel px-6 py-4 rounded-lg justify-center md:justify-start">
                    <span className="text-sm font-bold flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" /> 応援予約 (無料):
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-2 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={cheerP1}
                        onChange={(e) => {
                          const newVal = e.target.checked;
                          setCheerP1(newVal);
                          if (newVal) {
                            toast.message('観客が青側に肩入れした！', { duration: 2000 });
                            playSE('se_levelup');
                          } else {
                            toast.message('声援が引っ込んだ…', { duration: 1500 });
                          }
                        }}
                        className="w-4 h-4 accent-cyan-500"
                      />
                      <span className="text-cyan-400 font-bold text-sm">青を焚きつける(P1)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-2 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={cheerP2}
                        onChange={(e) => {
                          const newVal = e.target.checked;
                          setCheerP2(newVal);
                          if (newVal) {
                            toast.message('観客が赤側を焚きつけた！', { duration: 2000 });
                            playSE('se_levelup');
                          } else {
                            toast.message('声援が引っ込んだ…', { duration: 1500 });
                          }
                        }}
                        className="w-4 h-4 accent-red-500"
                      />
                      <span className="text-red-400 font-bold text-sm">赤を焚きつける(P2)</span>
                    </label>
                  </div>

                  {/* Special Move Reservation */}
                  <div className="flex flex-wrap gap-4 items-center glass-panel px-6 py-4 rounded-lg justify-center md:justify-start border border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-transparent">
                    <span className="text-sm font-bold flex items-center gap-2">
                      <StatIconATK className="w-4 h-4 text-orange-400" /> 必殺技 (1戦1回):
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-orange-500/10 p-2 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={useSpecial}
                        onChange={(e) => {
                          const newVal = e.target.checked;
                          setUseSpecial(newVal);
                          if (newVal) {
                            toast.message('⚡ 必殺技を発動準備！', { duration: 2000 });
                            playSE('se_equip');
                          } else {
                            toast.message('必殺技をキャンセル', { duration: 1500 });
                          }
                        }}
                        className="w-5 h-5 accent-orange-500"
                      />
                      <span className="text-orange-400 font-bold text-sm">必殺技を使う</span>
                    </label>
                    <span className="text-xs text-muted-foreground">※ロールに応じた必殺技が自動発動</span>
                  </div>
                </div>
              )}

              <Button
                size="lg"
                disabled={!canStartBattle}
                onClick={handleStartBattle}
                className="w-full md:w-auto px-12"
              >
                <Sword className="mr-2 h-5 w-5" />
                {t('start_battle')}
              </Button>
              <AdBanner />
            </div>
          </div>
        )}

        {/* バトル画面 */}
        {(battleResult || isBattling) && myRobot && enemyRobot && (
          <BattleReplay
            p1={myRobot}
            p2={enemyRobot}
            result={battleResult!}
            onComplete={() => {
              resetBattleState();
              playBGM('bgm_menu');
            }}
          />
        )}
        {/* Effects Layer */}
        {activeEffect && (
          <ElementalBurst element={activeEffect.element} x={activeEffect.x} y={activeEffect.y} />
        )}

        <AnimatePresence>
          {activeCutIn && (
            <SkillCutIn
              skillName={activeCutIn.skillName}
              robot={activeCutIn.robotId === myRobot.id ? myRobot : enemyRobot}
              onComplete={() => { }} // Controlled by parent timeout, empty callback fine
            />
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}
