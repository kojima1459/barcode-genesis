import { useEffect, useRef, useState, Component } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { getDb, functions } from "@/lib/firebase";
import { collection, getDoc, getDocs, query, orderBy, onSnapshot, doc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { ArrowLeft, Loader2, Sword, Wifi, Users, X, Zap, Shield, Heart } from "lucide-react";
import RobotSVG from "@/components/RobotSVG";
import { ElementalBurst, SkillCutIn } from "@/components/BattleEffects";
import { Link } from "wouter";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { RobotData, VariantData, BattleResult, MatchBattleResponse, BattleItemType } from "@/types/shared";
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
import { useRobotFx } from "@/hooks/useRobotFx";
import { AnimatedHPBar } from "@/components/AnimatedHPBar";
import { EmptyState } from "@/components/ui/EmptyState";
import Interactive from "@/components/ui/interactive";
import { SystemSkeleton } from "@/components/ui/SystemSkeleton";
import { CountUp } from "@/components/ui/CountUp";
import { simulateBattle as simulateTrainingBattle, getTrainingBattleId, normalizeTrainingInput, toBattleRobotData } from "@/lib/battleEngine";
import { levelFromXp } from "@/lib/level";
import BattleReplay from "@/components/BattleReplay";
import { useBattleLogic } from "@/hooks/useBattleLogic";
import SEO from "@/components/SEO";
import { PremiumCard } from "@/components/PremiumCard";

class ReplayErrorBoundary extends Component<{ onReset: () => void; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[ReplayErrorBoundary] Caught error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-panel p-6 rounded-2xl border border-red-500/30 text-center space-y-4">
          <div className="text-sm font-bold text-red-400">Replay error.</div>
          <Button onClick={this.props.onReset} className="bg-red-500 hover:bg-red-600 text-white">
            Back to Battle
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}



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
  const audioContextRef = useRef<AudioContext | null>(null);

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
    try {
      if (typeof AudioContext !== 'undefined') {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }
        audioContextRef.current.resume().catch(() => { });
      }
    } catch { /* ignore audio resume errors */ }
    hookStartBattle(enemyRobotId);
  };

  const selectedVariant = variants.find(v => v.id === selectedRobotId);
  const myRobot = robots.find(r => r.id === selectedRobotId)
    || (selectedVariant ? { ...selectedVariant, name: selectedVariant.name || `Variant ${selectedRobotId?.slice(0, 4)}`, rarityName: 'Fusion', baseHp: 100, baseAttack: 50, baseDefense: 50, baseSpeed: 50 } as unknown as RobotData : null)
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
          getDocs(query(collection(getDb(), "users", user.uid, "robots"), orderBy("createdAt", "desc"))),
          getDocs(query(collection(getDb(), "users", user.uid, "variants"), orderBy("createdAt", "desc"))),
          getDoc(doc(getDb(), "users", user.uid))
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
    <div className="flex justify-center p-8 min-h-screen items-center bg-background">
      <SystemSkeleton
        className="w-full max-w-lg aspect-video rounded-3xl"
        text="CONNECTING TO ARENA SERVER..."
        subtext="SYNCHRONIZING COMBAT PROTOCOLS"
      />
    </div>
  );

  return (
    <div className="flex-1 flex flex-col relative pb-32 md:pb-8 bg-background text-foreground overflow-hidden">
      <SEO
        title={t("seo_battle_title")}
        description={t("seo_battle_desc")}
      />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-linear-to-b from-transparent to-bg/90 pointer-events-none" />

      {/* Header with Safe Area support */}
      <header className="flex items-center mb-8 max-w-4xl mx-auto w-full relative z-10 pt-[env(safe-area-inset-top)] mt-4 px-4">
        <Link href="/">
          <Button variant="ghost" className="mr-4 group border border-white/5 hover:border-primary/50 hover:bg-primary/5 transition-all">
            <ArrowLeft className="h-5 w-5 mr-0 group-hover:mr-2 transition-all" />
            <span className="max-w-0 overflow-hidden group-hover:max-w-[100px] transition-all duration-300 transform opacity-0 group-hover:opacity-100 italic">{t('mission_abort')}</span>
          </Button>
        </Link>
        <div className="flex flex-col">
          <h1 className="text-2xl font-black italic text-primary tracking-tighter uppercase">{t('battle_arena')}</h1>
          <div className="h-px w-full bg-linear-to-r from-primary/50 to-transparent" />
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-black/40 border border-white/5 rounded-full text-[10px] font-mono text-muted-foreground">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {t('server_online')}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 border border-white/5 hover:border-primary/50 rounded-lg"
            onClick={() => setIsBattleSfxMuted((prev) => !prev)}
          >
            <span className="text-lg">{isBattleSfxMuted ? "🔇" : "🔊"}</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full space-y-8">
        {/* ロボット選択エリア */}
        {!battleResult && !isBattling && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="glass-panel border-white/5 overflow-hidden group">
              <CardContent className="p-6 space-y-4 relative">
                <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                  <Sword className="w-24 h-24 rotate-12" />
                </div>
                <h2 className="text-xl font-black italic tracking-tighter text-white uppercase flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  {t('select_robot')}
                </h2>
                <div className="text-[10px] text-muted-foreground/60 mb-2 font-mono flex items-center gap-2">
                  {t('pilot_uid')} <span className="text-primary/80 select-all">{user?.uid}</span>
                </div>

                <Tabs defaultValue="robots" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-black/40 border border-white/5 p-1 rounded-lg">
                    <TabsTrigger value="robots" className="text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-black transition-all">{t('tab_original')}</TabsTrigger>
                    <TabsTrigger value="variants" className="text-xs font-bold data-[state=active]:bg-primary data-[state=active]:text-black transition-all">{t('tab_fusion')}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="robots" className="mt-4 space-y-2">
                    <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                      {robots.map(robot => {
                        const { level } = getLevelInfo(robot);
                        const isSelected = selectedRobotId === robot.id;
                        return (
                          <Interactive
                            key={robot.id}
                            onClick={() => setSelectedRobotId(robot.id)}
                            className={`p-3 border rounded-lg transition-all flex items-center gap-3 relative overflow-hidden group/item ${isSelected
                              ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(0,243,255,0.1)]'
                              : 'border-white/5 bg-black/20 hover:border-white/20'
                              }`}
                            haptic="light"
                          >
                            <div className={`w-10 h-10 rounded border flex items-center justify-center bg-black/40 ${isSelected ? 'border-primary/50' : 'border-white/10'}`}>
                              <RobotSVG
                                parts={robot.parts}
                                colors={robot.colors}
                                size={32}
                                simplified
                                animate={false}
                                role={typeof robot.role === 'string' ? robot.role : undefined}
                                rarityEffect={robot.rarityTier === 'legendary' ? 'legendary' : (robot.rarityTier === 'rare' ? 'rare' : undefined)}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold truncate text-white">{robot.name}</div>
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
                                <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> LV.{level}</span>
                                <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> <span className="tabular-nums">HP {robot.baseHp}</span></span>
                              </div>
                            </div>
                            {isSelected && (
                              <motion.div layoutId="select-indicator" className="w-1 h-full bg-primary absolute right-0 top-0" />
                            )}
                          </Interactive>
                        );
                      })}
                      {robots.length === 0 && (
                        <EmptyState
                          title={t('no_data')}
                          description={t('scan_first_desc')}
                        />
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="variants" className="mt-4 space-y-2">
                    <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                      {variants.map(v => {
                        const isSelected = selectedRobotId === v.id;
                        return (
                          <Interactive
                            key={v.id}
                            onClick={() => setSelectedRobotId(v.id!)}
                            className={`p-3 border rounded-lg transition-all flex items-center gap-3 relative overflow-hidden group/item ${isSelected
                              ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(0,243,255,0.1)]'
                              : 'border-white/5 bg-black/20 hover:border-white/20'
                              }`}
                            haptic="light"
                          >
                            <div className={`w-10 h-10 rounded border flex items-center justify-center bg-black/40 ${isSelected ? 'border-primary/50' : 'border-white/10'}`}>
                              <RobotSVG
                                parts={v.parts}
                                colors={v.colors}
                                size={32}
                                simplified
                                animate={false}
                                role={typeof v.role === 'string' ? v.role : undefined}
                                rarityEffect={v.rarityTier === 'legendary' ? 'legendary' : (v.rarityTier === 'rare' ? 'rare' : undefined)}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold truncate text-white">{v.name || `VARIANT_${v.id?.slice(0, 4).toUpperCase()}`}</div>
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
                                <span className="flex items-center gap-1 uppercase">{t('fused_unit')}</span>
                              </div>
                            </div>
                          </Interactive>
                        );
                      })}
                      {variants.length === 0 && (
                        <EmptyState
                          title={t('no_variants')}
                          description={t('fusion_hint_desc')}
                        />
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="mt-4 pt-4 border-t border-white/5">
                  <label className="text-[10px] font-black italic tracking-widest text-primary mb-2 block uppercase">{t('support_module')}</label>
                  <div className="relative">
                    <select
                      value={selectedItemId}
                      onChange={(e) => setSelectedItemId(e.target.value)}
                      className="w-full border border-white/10 rounded-lg p-2.5 text-xs bg-black/40 text-white appearance-none hover:border-primary/50 transition-all cursor-pointer font-mono"
                      disabled={isTrainingMode || isBattling}
                    >
                      <option value="">{t('none_selected')}</option>
                      {Object.entries(inventory)
                        .filter(([id, qty]) => qty > 0 && ['repair_kit', 'attack_boost', 'defense_boost', 'critical_lens'].includes(id))
                        .map(([id, qty]) => (
                          <option key={id} value={id}>
                            {getItemLabel(id).toUpperCase()} (x{qty})
                          </option>
                        ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-white/5 overflow-hidden group">
              <CardContent className="p-6 space-y-4">
                <Tabs value={battleMode} onValueChange={(v) => {
                  setBattleMode(v as 'battle' | 'training' | 'online');
                  setIsTrainingMode(v as 'training' === 'training');
                  setEnemyRobotId(null);
                }}>
                  <TabsList className="w-full bg-black/40 border border-white/5 p-1 rounded-lg">
                    <TabsTrigger value="battle" className="flex-1 text-[10px] font-bold data-[state=active]:bg-primary data-[state=active]:text-black transition-all">{t('tab_versus')}</TabsTrigger>
                    <TabsTrigger value="online" className="flex-1 text-[10px] font-bold text-cyan-400 data-[state=active]:bg-cyan-500 data-[state=active]:text-black transition-all"><Wifi className="w-3 h-3 mr-1" />{t('tab_online')}</TabsTrigger>
                    <TabsTrigger value="training" className="flex-1 text-[10px] font-bold data-[state=active]:bg-primary data-[state=active]:text-black transition-all">{t('tab_training')}</TabsTrigger>
                  </TabsList>
                </Tabs>

                {battleMode === 'battle' && (
                  <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-black italic tracking-tighter text-white uppercase">{t('select_opponent')}</h2>
                      <div className="px-2 py-0.5 rounded bg-primary/20 border border-primary/50 text-[10px] font-mono text-primary animate-pulse">{t('auto_match_ready')}</div>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono leading-relaxed">
                      {t('auto_match_desc')}
                    </p>
                    <div className="aspect-video rounded-xl border border-white/5 bg-black/40 flex items-center justify-center relative overflow-hidden group/scanner">
                      <div className="absolute inset-0 bg-noise opacity-[0.03]" />
                      <div className="absolute inset-x-0 h-px bg-primary/30 top-1/2 animate-scan" />
                      <Sword className="w-12 h-12 text-muted-foreground/20 group-hover:text-primary/20 transition-colors duration-700" />
                      <span className="absolute bottom-3 text-[9px] font-mono text-muted-foreground/40 tracking-widest">{t('encrypted_signals')}</span>
                    </div>
                  </div>
                )}

                {isTrainingMode && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-black italic tracking-tighter text-white uppercase">{t('self_training')}</h2>
                    <p className="text-[10px] text-muted-foreground font-mono">{t('training_desc')}</p>
                    <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                      {robots.filter(r => r.id !== selectedRobotId).length > 0 ? (
                        robots.filter(r => r.id !== selectedRobotId).map(robot => {
                          const { level } = getLevelInfo(robot);
                          const isEnemySelected = enemyRobotId === robot.id;
                          return (
                            <Interactive
                              key={robot.id}
                              onClick={() => setEnemyRobotId(robot.id)}
                              className={`p-3 border rounded-lg transition-all flex items-center gap-3 relative overflow-hidden group/item ${isEnemySelected
                                ? 'border-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                                : 'border-white/5 bg-black/20 hover:border-white/20'
                                }`}
                            >
                              <div className={`w-8 h-8 rounded border flex items-center justify-center bg-black/40 ${isEnemySelected ? 'border-red-500/50' : 'border-white/10'}`}>
                                <RobotSVG
                                  parts={robot.parts}
                                  colors={robot.colors}
                                  size={24}
                                  simplified
                                  animate={false}
                                  role={typeof robot.role === 'string' ? robot.role : undefined}
                                  rarityEffect={robot.rarityTier === 'legendary' ? 'legendary' : (robot.rarityTier === 'rare' ? 'rare' : undefined)}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold truncate text-white">{robot.name}</div>
                                <div className="text-[10px] text-muted-foreground font-mono tabular-nums">LV.{level} | HP {robot.baseHp}</div>
                              </div>
                            </Interactive>
                          );
                        })
                      ) : (
                        <div className="text-center text-xs text-muted-foreground p-8 bg-black/20 rounded-lg border border-dashed border-white/5 font-mono">
                          {t('min_units_required')}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {battleMode === 'online' && (
                  <div className="space-y-6 py-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-black italic tracking-tighter text-white uppercase flex items-center gap-2">
                        <Wifi className="w-5 h-5 text-cyan-400" />
                        {t('online_arena')}
                      </h2>
                      <div className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/50 text-[10px] font-mono text-cyan-400">{t('p2p_link')}</div>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono leading-relaxed">
                      {t('online_desc')}
                    </p>

                    {!isMatchmaking ? (
                      <Button
                        onClick={startMatchmaking}
                        disabled={!selectedRobotId}
                        className="w-full bg-linear-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 border-b-4 border-blue-900 active:border-b-0 active:translate-y-1 transition-all h-14 text-lg font-black italic tracking-wider"
                        size="lg"
                      >
                        {t('initiate_uplink')}
                      </Button>
                    ) : (
                      <div className="text-center space-y-6 pt-4">
                        <div className="relative w-20 h-20 mx-auto">
                          <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20" />
                          <div className="absolute inset-0 rounded-full border-2 border-t-cyan-500 animate-spin" />
                          <Loader2 className="absolute inset-0 m-auto w-8 h-8 text-cyan-500 animate-pulse" />
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm font-bold tracking-widest text-cyan-400 animate-pulse uppercase">{matchmakingStatus}</div>
                          <div className="text-[9px] text-muted-foreground font-mono">{t('searching_nodes')}</div>
                        </div>
                        <Button
                          onClick={cancelMatchmaking}
                          variant="ghost"
                          className="w-full border border-white/5 hover:bg-red-500/10 hover:text-red-400 font-mono text-[10px]"
                        >
                          {t('terminate_connection')}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="md:col-span-2 space-y-6">
              {/* Pre-Battle Items & Cheer */}
              {!isTrainingMode && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Battle Item Selection */}
                  <div className="glass-panel p-5 rounded-2xl space-y-4 border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                      <Zap className="w-16 h-16" />
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <span className="text-sm font-black italic tracking-widest text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" /> {t('item_reservation')}
                      </span>
                      <Link href="/shop">
                        <span className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors cursor-pointer border-b border-white/10">
                          {t('acquire_assets')}
                        </span>
                      </Link>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <Interactive
                        onClick={() => {
                          if (selectedBattleItem !== null) toast.message("Asset reservation cleared", { duration: 1000 });
                          setSelectedBattleItem(null);
                        }}
                        className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border transition-all h-20 ${selectedBattleItem === null ? 'bg-primary/20 border-primary shadow-[0_0_10px_rgba(0,243,255,0.1)]' : 'bg-black/40 border-white/5 opacity-40 hover:opacity-100'
                          }`}
                      >
                        <X className="w-5 h-5 text-muted-foreground" />
                        <span className="text-[9px] font-black italic">{t('item_none')}</span>
                      </Interactive>

                      {(['BOOST', 'SHIELD', 'JAMMER'] as const).map(item => {
                        const isSelected = selectedBattleItem === item;
                        const icon = item === 'BOOST' ? <Zap className="w-5 h-5" /> : item === 'SHIELD' ? <Shield className="w-5 h-5" /> : <Zap className="w-5 h-5" />;
                        const colorClass = item === 'BOOST' ? 'text-amber-400 border-amber-500/50 bg-amber-500/5' : item === 'SHIELD' ? 'text-blue-400 border-blue-500/50 bg-blue-500/5' : 'text-purple-400 border-purple-500/50 bg-purple-500/5';
                        const activeClass = item === 'BOOST' ? 'bg-amber-500/20 border-amber-500' : item === 'SHIELD' ? 'bg-blue-500/20 border-blue-500' : 'bg-purple-500/20 border-purple-500';

                        return (
                          <Interactive
                            key={item}
                            onClick={() => {
                              if (!itemSlotsUnlocked) {
                                toast.message(t('locked_level_5'), { duration: 1500 });
                                return;
                              }
                              if (!canUseBattleItem(item) && !isSelected) {
                                toast.error(t('insufficient_stock'));
                                return;
                              }
                              setSelectedBattleItem(item);
                              playSE('se_equip');
                            }}
                            className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border transition-all h-20 ${isSelected ? activeClass : `${colorClass} opacity-60 hover:opacity-100`
                              } ${!itemSlotsUnlocked ? 'grayscale brightness-50' : ''}`}
                          >
                            {icon}
                            <span className="text-[9px] font-black italic">{item}</span>
                            <span className="text-[8px] font-mono opacity-50">x{battleItemStock[item]}</span>
                          </Interactive>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Cheer Reservation */}
                    <div className="glass-panel p-5 rounded-2xl border-white/5 space-y-3">
                      <div className="text-sm font-black italic tracking-widest text-white flex items-center gap-2 uppercase">
                        <Users className="w-4 h-4 text-primary" /> {t('cheer_protocol')}
                      </div>
                      <div className="flex gap-2">
                        <Interactive
                          className={`flex-1 flex items-center gap-2 p-3 rounded-lg border transition-all ${cheerP1 ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-black/40 border-white/5 opacity-60'
                            }`}
                          onClick={() => {
                            setCheerP1(!cheerP1);
                            if (!cheerP1) playSE('se_levelup');
                          }}
                        >
                          <div className={`w-3 h-3 rounded-full ${cheerP1 ? 'bg-cyan-400 animate-pulse' : 'bg-white/10'}`} />
                          <span className="text-[10px] font-black italic uppercase">{t('p1_support')}</span>
                        </Interactive>
                        <Interactive
                          className={`flex-1 flex items-center gap-2 p-3 rounded-lg border transition-all ${cheerP2 ? 'bg-red-500/20 border-red-500 text-red-100' : 'bg-black/40 border-white/5 opacity-60'
                            }`}
                          onClick={() => {
                            setCheerP2(!cheerP2);
                            if (!cheerP2) playSE('se_levelup');
                          }}
                        >
                          <div className={`w-3 h-3 rounded-full ${cheerP2 ? 'bg-red-500 animate-pulse' : 'bg-white/10'}`} />
                          <span className="text-[10px] font-black italic uppercase">{t('p2_support')}</span>
                        </Interactive>
                      </div>
                    </div>

                    {/* Special Move Reservation */}
                    <div className={`glass-panel p-5 rounded-2xl border-orange-500/20 transition-all ${useSpecial ? 'bg-linear-to-r from-orange-500/20 to-black/40 border-orange-500' : 'bg-black/40 border-white/5'
                      }`}>
                      <Interactive
                        className="flex items-center justify-between group/special"
                        onClick={() => {
                          setUseSpecial(!useSpecial);
                          if (!useSpecial) playSE('se_equip');
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded border transition-colors ${useSpecial ? 'bg-orange-500 text-black border-orange-400' : 'bg-black border-white/10 text-orange-500/40'
                            }`}>
                            <Zap className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className={`text-[11px] font-black italic tracking-widest ${useSpecial ? 'text-white' : 'text-white/40'}`}>{t('overdrive_ready')}</span>
                            <span className="text-[8px] font-mono text-muted-foreground uppercase">{t('overdrive_desc')}</span>
                          </div>
                        </div>
                        <div className={`w-10 h-6 rounded-full relative transition-all ${useSpecial ? 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'bg-white/10'}`}>
                          <motion.div
                            animate={{ x: useSpecial ? 16 : 0 }}
                            className={`absolute inset-y-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm`}
                          />
                        </div>
                      </Interactive>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col items-center gap-6 pt-4">
                <Interactive
                  onClick={() => {
                    if (canStartBattle) handleStartBattle();
                  }}
                  className={`w-full max-w-md h-16 rounded-2xl relative overflow-hidden group transition-all duration-500 flex items-center justify-center font-bold text-lg ${canStartBattle
                    ? 'bg-primary text-black hover:bg-white shadow-[0_0_30px_rgba(0,243,255,0.2)]'
                    : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
                    }`}
                >
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-black/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                  <div className="relative z-10 flex items-center justify-center gap-3 font-black italic text-xl tracking-tighter uppercase">
                    <Sword className={`w-6 h-6 transition-transform duration-500 ${canStartBattle ? 'group-hover:rotate-12 group-hover:scale-110' : ''}`} />
                    {t('start_battle')}
                  </div>
                  {canStartBattle && (
                    <motion.div
                      initial={{ left: '-100%' }}
                      animate={{ left: '200%' }}
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                      className="absolute inset-y-0 w-32 bg-linear-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg] pointer-events-none"
                    />
                  )}
                </Interactive>
                <PremiumCard className="w-full max-w-md" />
                <AdBanner />
              </div>
            </div>
          </div>
        )}

        {/* バトル画面 */}
        {(battleResult || isBattling) && myRobot && enemyRobot && (
          <ReplayErrorBoundary onReset={resetBattleState}>
            <BattleReplay
              p1={myRobot}
              p2={enemyRobot}
              result={battleResult!}
              onComplete={() => {
                resetBattleState();
                playBGM('bgm_menu');
              }}
            />
          </ReplayErrorBoundary>
        )}
        {/* Effects Layer */}
        {activeEffect && (
          <ElementalBurst element={activeEffect.element} x={activeEffect.x} y={activeEffect.y} />
        )}

        <AnimatePresence>
          {activeCutIn && myRobot && (
            <SkillCutIn
              skillName={activeCutIn.skillName}
              robot={activeCutIn.robotId === myRobot.id ? myRobot : (enemyRobot ?? myRobot)}
              onComplete={() => { }} // Controlled by parent timeout, empty callback fine
            />
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}
