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
import { useSound } from "@/contexts/SoundContext";
import {
  getMuted as getBattleSfxMuted,
  play as playBattleSfx,
  preload as preloadBattleSfx,
  setMuted as setBattleSfxMuted,
  unlock as unlockBattleSfx,
} from "@/lib/sound";
import { getItemLabel } from "@/lib/items";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Zap, Shield, Heart } from "lucide-react";
import SEO from "@/components/SEO";
import { useRobotFx } from "@/hooks/useRobotFx";
import { simulateBattle as simulateTrainingBattle, getTrainingBattleId, normalizeTrainingInput, toBattleRobotData } from "@/lib/battleEngine";
import { doc } from "firebase/firestore"; // Added doc
import { BattleItemType } from "@/types/shared"; // Added BattleItemType
import { levelFromXp } from "@/lib/level";



export default function Battle() {
  const { t } = useLanguage();
  const { playBGM, playSE } = useSound();
  const prefersReducedMotion = useReducedMotion();
  const { fx, trigger } = useRobotFx();
  const { user } = useAuth();
  const [robots, setRobots] = useState<RobotData[]>([]);
  const [variants, setVariants] = useState<VariantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLevel, setUserLevel] = useState(1);
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null);
  const [enemyRobotId, setEnemyRobotId] = useState<string | null>(null);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [currentLogIndex, setCurrentLogIndex] = useState(-1);
  const [isBattling, setIsBattling] = useState(false);
  const [damagePopups, setDamagePopups] = useState<{ id: string; value: number; isCritical: boolean; cheerApplied?: boolean; x: number; y: number }[]>([]);
  const [shaking, setShaking] = useState<string | null>(null); // robotId that is shaking (taking damage)
  const [activeSide, setActiveSide] = useState<"player" | "enemy" | null>(null);
  const [hitSide, setHitSide] = useState<"player" | "enemy" | null>(null);
  const [impactType, setImpactType] = useState<"critical" | "cheer" | null>(null);
  const [delayedHp, setDelayedHp] = useState<Record<string, number>>({});
  const [isBattleSfxMuted, setIsBattleSfxMuted] = useState(() => getBattleSfxMuted());

  const [enemyRobots, setEnemyRobots] = useState<RobotData[]>([]);
  const [isTrainingMode, setIsTrainingMode] = useState(false);

  // Online Matchmaking state
  const [battleMode, setBattleMode] = useState<'battle' | 'training' | 'online'>('battle');
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [queueId, setQueueId] = useState<string | null>(null);
  const [matchmakingStatus, setMatchmakingStatus] = useState<string>('');

  // Overload (battle intervention) state
  const [hasUsedOverload, setHasUsedOverload] = useState(false);
  const [isOverloadActive, setIsOverloadActive] = useState(false);
  const [overloadFlash, setOverloadFlash] = useState(false);

  // Cheer (応援) state - Pre-battle reservation (server-side)
  const [cheerP1, setCheerP1] = useState(false);  // Reserve cheer for P1 (player)
  const [cheerP2, setCheerP2] = useState(false);  // Reserve cheer for P2 (opponent)

  // Pre-Battle Item state
  const [selectedBattleItem, setSelectedBattleItem] = useState<BattleItemType | null>(null);

  // Visual effects state
  const [activeEffect, setActiveEffect] = useState<{ element: string; x: number; y: number } | null>(null);
  const [activeCutIn, setActiveCutIn] = useState<{ skillName: string; robotId: string } | null>(null);

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

  const playLogSfx = (log: BattleResult["logs"][number]) => {
    if (log.cheerApplied) {
      playBattleSfx("cheer", { throttleMs: 200 });
    }
    if (log.damage > 0) {
      const preDamageHp = log.defenderHp + log.damage;
      const isHeavy =
        log.isCritical || (preDamageHp > 0 && log.damage / preDamageHp >= 0.25);
      playBattleSfx(isHeavy ? "hit_heavy" : "hit_light");
    }
  };

  const playBattleEndSfx = (result: BattleResult) => {
    const isWin = result.winnerId === selectedRobotId;
    playBattleSfx(isWin ? "win" : "lose", { throttleMs: 0 });
    if (isWin && (result.rewards?.newSkill || result.rewards?.upgradedSkill)) {
      setTimeout(() => playSE("se_levelup"), 1500);
    }
  };

  const getSide = (robotId: string) => (robotId === selectedRobotId ? "player" : "enemy");

  const getLogDelay = (log: BattleResult["logs"][number]) => {
    if (prefersReducedMotion) return 1200;
    return log.isCritical || log.cheerApplied ? 1000 : 1200;
  };

  const triggerLogFx = (log: BattleResult["logs"][number]) => {
    if (prefersReducedMotion) return;
    if (log.action === "attack" || log.action === "skill" || log.action === "counter") {
      setActiveSide(getSide(log.attackerId));
      setTimeout(() => setActiveSide(null), 220);
    }
    if (log.damage > 0) {
      setHitSide(getSide(log.defenderId));
      setTimeout(() => setHitSide(null), 260);
    }
    if (log.isCritical || log.cheerApplied) {
      setImpactType(log.isCritical ? "critical" : "cheer");
      setTimeout(() => setImpactType(null), 320);
    }
  };

  const scheduleDelayedHp = (log: BattleResult["logs"][number]) => {
    const updates = {
      [log.attackerId]: log.attackerHp,
      [log.defenderId]: log.defenderHp,
    };
    if (prefersReducedMotion) {
      setDelayedHp((prev) => ({ ...prev, ...updates }));
      return;
    }
    setTimeout(() => {
      setDelayedHp((prev) => ({ ...prev, ...updates }));
    }, 200);
  };

  // 自分のロボット一覧取得
  useEffect(() => {
    const fetchMyRobots = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, "users", user.uid, "robots"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RobotData));
        setRobots(data);
        const vQ = query(collection(db, "users", user.uid, "variants"), orderBy("createdAt", "desc"));
        const vSnap = await getDocs(vQ);
        const vData = vSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VariantData));
        setVariants(vData);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load your robots");
      } finally {
        setLoading(false);
      }
    };
    fetchMyRobots();
  }, [user]);

  // インベントリ監視
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, "users", user.uid, "inventory"), (snapshot) => {
      const inv: Record<string, number> = {};
      snapshot.docs.forEach(doc => {
        inv[doc.id] = doc.data().qty;
      });
      setInventory(inv);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      if (!snapshot.exists()) {
        setUserLevel(1);
        return;
      }
      const data = snapshot.data() as { level?: number; xp?: number };
      const level = typeof data.level === "number"
        ? data.level
        : levelFromXp(typeof data.xp === "number" ? data.xp : 0);
      setUserLevel(level);
    });
    return () => unsub();
  }, [user]);


  // Opponent data is resolved from server battle results. // REF: A1

  // Online matchmaking functions
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
        // TODO: Navigate to online battle or use existing battle system
        setIsMatchmaking(false);
        setBattleMode('battle');
      } else if (data.status === 'waiting') {
        setQueueId(data.queueId || null);
        setMatchmakingStatus('対戦相手を待っています...');
        // Start polling
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
      try {
        const result = await checkMatchStatus({ queueId: qId });
        const data = result.data as { status: string; battleId?: string; opponent?: any };

        if (data.status === 'matched') {
          setMatchmakingStatus('マッチング成功！');
          toast.success('対戦相手が見つかりました！');
          setIsMatchmaking(false);
          setQueueId(null);
          // TODO: Start battle with opponent
        } else if (data.status === 'timeout' || data.status === 'expired') {
          setMatchmakingStatus('タイムアウト');
          toast.error('マッチング相手が見つかりませんでした');
          setIsMatchmaking(false);
          setQueueId(null);
        } else if (data.status === 'waiting' && isMatchmaking) {
          // Continue polling
          setTimeout(poll, 2000);
        }
      } catch (error) {
        console.error('Poll error:', error);
        setIsMatchmaking(false);
      }
    };

    poll();
  };

  const cancelMatchmaking = async () => {
    try {
      const leaveMatchmaking = httpsCallable(functions, 'leaveMatchmaking');
      await leaveMatchmaking({ queueId });
    } catch (error) {
      console.error('Leave matchmaking error:', error);
    }
    setIsMatchmaking(false);
    setQueueId(null);
    setMatchmakingStatus('');
    toast('マッチメイキングをキャンセルしました');
  };

  // ローカルバトルシミュレーション is now handled by client/src/lib/battleEngine.ts
  // See: simulateBattle, getTrainingBattleId

  // バトル開始
  const startBattle = async () => {
    if (!selectedRobotId || (isTrainingMode && !enemyRobotId)) return; // REF: A1

    trigger("battle");
    unlockBattleSfx();
    playBattleSfx("battle_start", { throttleMs: 0 });
    playBGM('bgm_battle');
    setIsBattling(true);
    setBattleResult(null);
    setCurrentLogIndex(-1);
    setActiveSide(null);
    setHitSide(null);
    setImpactType(null);
    // Reset cheer state for new battle
    setCheerP1(false);
    setCheerP2(false);
    if (!isTrainingMode) {
      setEnemyRobotId(null);
      setEnemyRobots([]); // REF: A1
    }

    // トレーニングモードの場合は決定的ローカルシミュレーション
    if (isTrainingMode) {
      if (variants.some(v => v.id === selectedRobotId)) {
        toast.error("Variants not supported in Training Mode yet");
        setIsBattling(false);
        return;
      }
      const myRobot = robots.find(r => r.id === selectedRobotId);
      const enemyRobot = robots.find(r => r.id === enemyRobotId);
      if (!myRobot || !enemyRobot) {
        toast.error("ロボットが見つかりません");
        setIsBattling(false);
        return;
      }

      // Convert RobotData to BattleRobotData using helper
      const rawP1 = toBattleRobotData(myRobot);
      const rawP2 = toBattleRobotData(enemyRobot);

      // Normalize robot order for consistent results (same 2 robots -> same battle)
      const { p1, p2, normalizedCheer } = normalizeTrainingInput(rawP1, rawP2, { p1: cheerP1, p2: cheerP2 });
      const battleId = getTrainingBattleId(p1.id!, p2.id!);

      const battleItemsInput = selectedBattleItem ? { p1: selectedBattleItem, p2: null } : undefined;
      const result = simulateTrainingBattle(p1, p2, battleId, normalizedCheer, battleItemsInput);
      setBattleResult(result);
      playBattleLogs(result);
      return;
    }

    // 通常対戦モード
    try {
      const matchBattleFn = httpsCallable(functions, 'matchBattle');

      const isVariant = variants.find(v => v.id === selectedRobotId);
      const fighterRef = isVariant ? { kind: 'variant', id: selectedRobotId } : { kind: 'robot', id: selectedRobotId };

      const result = await matchBattleFn({
        playerRobotId: selectedRobotId,
        fighterRef,
        useItemId: (!isTrainingMode && selectedItemId) ? selectedItemId : undefined,
        cheer: { p1: cheerP1, p2: cheerP2 },  // Pass cheer reservation
        battleItems: selectedBattleItem ? { p1: selectedBattleItem, p2: null } : undefined // Pre-Battle Items (inventory reservation)
      });
      // Safety: Use type assertion with the defined interface, validating at runtime implicitly by property access structure
      const data = result.data as MatchBattleResponse;

      if (data.battleId) {
        let opponentRobot: RobotData | null = null;
        try {
          const battleSnap = await getDoc(doc(db, "battles", data.battleId));
          if (battleSnap.exists()) {
            const battleData = battleSnap.data() as { opponentRobotSnapshot?: RobotData };
            if (battleData?.opponentRobotSnapshot) {
              const rawOpponent = battleData.opponentRobotSnapshot;
              const opponentId = rawOpponent.id || "opponent_robot";
              opponentRobot = { ...rawOpponent, id: opponentId };
            }
          }
        } catch (error) {
          console.error("Failed to load opponent snapshot:", error);
        }

        if (!opponentRobot) {
          toast.error("対戦相手の情報を取得できませんでした");
          setIsBattling(false);
          return;
        }

        setEnemyRobots([opponentRobot]); // REF: A1
        setEnemyRobotId(opponentRobot.id);

        // matchBattle returns different structure
        const rewards = data.rewards || { exp: data.experienceGained || 0, coins: 0 };
        const normalizedRewards = {
          ...rewards,
          creditsReward: rewards.creditsReward ?? rewards.credits ?? rewards.coins ?? 0,
          xpReward: rewards.xpReward ?? rewards.exp ?? 0,
        };
        const battleResult: BattleResult = {
          winnerId: data.result.winner === 'player' ? selectedRobotId : opponentRobot.id,
          loserId: data.result.winner === 'player' ? opponentRobot.id : selectedRobotId,
          logs: data.result.log || [],
          rewards: normalizedRewards,
          resolvedPlayerRobot: data.resolvedPlayerRobot
        };
        setBattleResult(battleResult);
        // ログ再生開始
        playBattleLogs(battleResult); // Pass the full result object
      } else {
        toast.error("Battle failed to start");
        setIsBattling(false);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error during battle");
      setIsBattling(false);
    }
  };

  // ログ再生アニメーション
  const playBattleLogs = (result: BattleResult) => {
    const step = (index: number) => {
      if (index >= result.logs.length) {
        playBattleEndSfx(result);
        setIsBattling(false);
        return;
      }

      setCurrentLogIndex(index);
      const log = result.logs[index];
      playLogSfx(log);
      triggerLogFx(log);
      scheduleDelayedHp(log);

      // ============================================
      // CHEER SYSTEM: Display based on server log.cheerApplied
      // ============================================
      // log.damage; // Server already applied 1.2x
      const cheerApplied = !!log.cheerApplied;

      if (cheerApplied) {
        toast.message(`🎉 声援が刃になった（×${log.cheerMultiplier || 1.2}）`, { duration: 1500 });
      }

      // ============================================
      // PRE-BATTLE ITEM SYSTEM: Display activation
      // ============================================
      if (log.itemApplied && log.itemType) {
        let msg = "";
        let icon = "";
        switch (log.itemType) {
          case 'BOOST':
            icon = "⚡";
            msg = `ブースト発動！ (${log.itemEffect || 'Atk UP'})`;
            break;
          case 'SHIELD':
            icon = "🛡️";
            msg = `シールド発動！ (${log.itemEffect || 'Dmg Down'})`;
            break;
          case 'JAMMER':
          case 'DISRUPT':
          case 'CANCEL_CRIT':
            icon = "🤞";
            msg = `ジャマーがクリティカルを防いだ！`;
            break;
        }
        toast.success(`${icon} ${msg}`, { duration: 2000 });
        playSE('se_equip');
      }

      // VFX Logic
      if (log.damage > 0) {
        setShaking(log.defenderId);
        setTimeout(() => setShaking(null), 500);

        // Visuals
        const isPlayerDefender = log.defenderId === selectedRobotId;
        const attacker = log.attackerId === selectedRobotId ? robots.find(r => r.id === selectedRobotId) : enemyRobots.find(r => r.id === enemyRobotId);

        if (attacker) {
          const w = window.innerWidth;
          const h = window.innerHeight;
          const isMobile = w < 768;
          const targetX = isMobile ? w * 0.5 : (isPlayerDefender ? w * 0.3 : w * 0.7);
          const targetY = isMobile ? (isPlayerDefender ? h * 0.7 : h * 0.3) : h * 0.5;

          setActiveEffect({
            element: attacker.elementName || "Neutral",
            x: targetX,
            y: targetY
          });
          setTimeout(() => setActiveEffect(null), 500);
        }

        const shownDamage = log.damage; // Strictly use server-provided damage

        setDamagePopups(prev => [
          ...prev,
          {
            id: index + "-" + Math.random(),
            value: shownDamage, // Use fixed variable for display integrity
            isCritical: log.isCritical || cheerApplied,
            cheerApplied: cheerApplied, // Enhance damage popup styles for cheer application.
            x: Math.random() * 40 - 20,
            y: -50
          }
        ]);
        setTimeout(() => {
          setDamagePopups(prev => prev.slice(1));
        }, 1000);
      }

      // Cut-In Logic
      if (log.skillName) {
        setActiveCutIn({ skillName: log.skillName, robotId: log.attackerId });
        setTimeout(() => {
          setActiveCutIn(null);
          step(index + 1);
        }, prefersReducedMotion ? 600 : 1500);
        return;
      }

      setTimeout(() => {
        step(index + 1);
      }, getLogDelay(log));
    };

    step(0);
  };

  const myRobot = robots.find(r => r.id === selectedRobotId)
    || (variants.find(v => v.id === selectedRobotId) ? { ...variants.find(v => v.id === selectedRobotId), name: `Variant ${selectedRobotId?.slice(0, 4)}`, baseHp: 0 } as any : null)
    || battleResult?.resolvedPlayerRobot;
  const enemyRobot = enemyRobots.find(r => r.id === enemyRobotId) || robots.find(r => r.id === enemyRobotId);

  useEffect(() => {
    if (!myRobot?.id || !enemyRobot?.id) return;
    setDelayedHp({
      [myRobot.id]: myRobot.baseHp,
      [enemyRobot.id]: enemyRobot.baseHp,
    });
  }, [myRobot?.id, myRobot?.baseHp, enemyRobot?.id, enemyRobot?.baseHp]);

  // 現在のHP計算
  const getCurrentHp = (robotId: string) => {
    if (currentLogIndex === -1) {
      if (robotId === myRobot?.id) return myRobot.baseHp || 0;
      if (robotId === enemyRobot?.id) return enemyRobot.baseHp || 0;
      const robot = robots.find(r => r.id === robotId);
      return robot ? robot.baseHp : 0;
    }
    const log = battleResult?.logs[currentLogIndex];
    if (!log) return 0;
    return log.attackerId === robotId ? log.attackerHp : log.defenderHp;
  };

  const getDelayedHp = (robotId: string) => {
    const current = getCurrentHp(robotId);
    const stored = delayedHp[robotId];
    return typeof stored === "number" ? stored : current;
  };

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
  const playerLunge = !prefersReducedMotion && activeSide === "player" ? 12 : 0;
  const enemyLunge = !prefersReducedMotion && activeSide === "enemy" ? -12 : 0;
  const playerHitClass = hitSide === "player" ? "hit-flash" : "";
  const enemyHitClass = hitSide === "enemy" ? "hit-flash" : "";

  if (loading) return <div className="flex justify-center p-8 min-h-screen items-center bg-bg"><Loader2 className="animate-spin text-neon-cyan h-12 w-12" /></div>;

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
                    <TabsTrigger value="robots">Original ({robots.length})</TabsTrigger>
                    <TabsTrigger value="variants">Fusion ({variants.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="robots" className="mt-2">
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                      {robots.map(robot => {
                        const { level } = getLevelInfo(robot);
                        return (
                          <div
                            key={robot.id}
                            onClick={() => setSelectedRobotId(robot.id)}
                            className={`p-2 border rounded cursor-pointer hover:bg-secondary/10 ${selectedRobotId === robot.id ? 'border-primary bg-primary/10' : ''}`}
                          >
                            <div className="text-sm font-bold truncate">{robot.name}</div>
                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                              <span>Lv.{level}</span>
                              <span>HP: {robot.baseHp}</span>
                            </div>
                          </div>
                        );
                      })}
                      {robots.length === 0 && <div className="col-span-2 text-center text-xs text-muted-foreground p-4">No robots found.</div>}
                    </div>
                  </TabsContent>

                  <TabsContent value="variants" className="mt-2">
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                      {variants.map(v => (
                        <div
                          key={v.id}
                          onClick={() => setSelectedRobotId(v.id!)}
                          className={`p-2 border rounded cursor-pointer hover:bg-secondary/10 ${selectedRobotId === v.id ? 'border-primary bg-primary/10' : ''}`}
                        >
                          <div className="text-sm font-bold truncate">Variant {v.id?.slice(0, 4)}</div>
                          <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>Fusion</span>
                            <span>HP: ??</span>
                          </div>
                        </div>
                      ))}
                      {variants.length === 0 && <div className="col-span-2 text-center text-xs text-muted-foreground p-4">No variants created. Create one in Workshop!</div>}
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="mt-6 pt-4 border-t">
                  <label className="text-sm font-bold mb-2 block">{t('battle_item') || 'Battle Item'}</label>
                  <select
                    value={selectedItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="w-full border rounded p-2 text-sm bg-background"
                    disabled={isTrainingMode || isBattling}
                  >
                    <option value="">{t('no_item') || 'No Item'}</option>
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
                  <TabsList className="w-full">
                    <TabsTrigger value="battle" className="flex-1">🆚 対戦</TabsTrigger>
                    <TabsTrigger value="online" className="flex-1"><Wifi className="w-3 h-3 mr-1" />オンライン</TabsTrigger>
                    <TabsTrigger value="training" className="flex-1">🏋️ 練習</TabsTrigger>
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
                        <Sword className="w-4 h-4 text-primary" /> バトルアイテム（所持から1個予約）
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
                        <Zap className="w-5 h-5" />
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
                        <Shield className="w-5 h-5" />
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
                        <Heart className="w-5 h-5" />
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
                </div>
              )}

              <Button
                size="lg"
                disabled={!canStartBattle}
                onClick={startBattle}
                className="w-full md:w-auto px-12"
              >
                <Sword className="mr-2 h-5 w-5" />
                {t('start_battle')}
              </Button>
            </div>
          </div>
        )}

        {/* バトル画面 */}
        {(battleResult || isBattling) && myRobot && enemyRobot && (
          <div className="space-y-8 relative py-8">
            {impactType && (
              <div
                className={`impact-overlay ${impactType === "critical" ? "impact-critical" : "impact-cheer"}`}
                data-testid="battle-impact"
                aria-hidden="true"
              >
                <div className="impact-text">{impactType === "critical" ? "CRITICAL!" : "CHEER!"}</div>
              </div>
            )}
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">

              {/* Player Robot */}
              <motion.div
                className={`relative p-6 rounded-xl glass-panel w-full md:w-[45%] ${shaking === selectedRobotId ? 'border-red-500 shadow-[0_0_20px_rgba(255,0,0,0.5)]' : 'border-neon-cyan shadow-[0_0_10px_rgba(0,243,255,0.3)]'} ${playerHitClass}`}
                animate={
                  shaking === selectedRobotId
                    ? { x: [-10, 10, -10, 10, 0], rotate: [-2, 2, -2, 2, 0] }
                    : { x: playerLunge, scale: activeSide === "player" ? 1.02 : 1 }
                }
                transition={shaking === selectedRobotId ? { duration: 0.4 } : { duration: 0.18, ease: "easeOut" }}
              >
                <div className="absolute -top-3 left-4 bg-panel/80 px-3 py-1 text-neon-cyan text-xs font-orbitron border border-neon-cyan tracking-[0.12em] shadow-[0_0_10px_rgba(62,208,240,0.35)]">プレイヤー</div>
                <div className="flex justify-center my-4 drop-shadow-[0_0_15px_rgba(0,243,255,0.4)]">
                  <RobotSVG parts={myRobot.parts} colors={myRobot.colors} size={160} fx={fx} />
                </div>
                <div className="mt-2 text-center font-semibold text-lg text-white text-shadow-sm tracking-wide">{myRobot.name}</div>

                {/* HP Bar */}
                <div className="w-full mt-4 bg-panel/80 h-4 rounded-full overflow-hidden border border-white/20 relative">
                  <div
                    className="hp-delayed"
                    style={{ width: `${(getDelayedHp(myRobot.id) / myRobot.baseHp) * 100}%` }}
                    aria-hidden="true"
                  />
                  <motion.div
                    className="h-full bg-gradient-to-r from-neon-cyan to-blue-600 box-shadow-[0_0_10px_rgba(0,243,255,0.5)]"
                    initial={{ width: "100%" }}
                    animate={{ width: `${(getCurrentHp(myRobot.id) / myRobot.baseHp) * 100}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  />
                  <div className="absolute inset-0 bg-[url('/scanline.png')] opacity-20 pointer-events-none mix-blend-overlay"></div>
                </div>
                <div className="text-right text-xs font-mono mt-1 text-neon-cyan font-semibold">
                  HP: <span className="text-white text-lg font-orbitron">{getCurrentHp(myRobot.id)}</span> / {myRobot.baseHp}
                </div>

                {/* Damage Popups for Player */}
                <AnimatePresence>
                  {damagePopups.map(p => {
                    const log = battleResult?.logs[currentLogIndex];
                    if (log?.defenderId !== myRobot.id) return null;
                    if (p.id.split('-')[0] !== String(currentLogIndex) && Math.abs(currentLogIndex - Number(p.id.split('-')[0])) > 1) return null;

                    return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 0, scale: 0.5, rotate: Math.random() * 20 - 10 }}
                        animate={{ opacity: 1, y: -80, scale: p.isCritical ? 2.5 : 1.5, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 z-50 font-black italic stroke-black pointer-events-none select-none flex items-center justify-center w-full text-center ${p.isCritical ? 'text-neon-pink neon-text-purple text-6xl' : (p.cheerApplied ? 'text-green-200 text-5xl' : 'text-white text-4xl')}`}
                        style={{ textShadow: "4px 4px 0px #000" }}
                      >
                        {p.value}
                        {p.cheerApplied && <span className="block text-sm text-green-400 absolute -bottom-5 w-full text-center font-bold tracking-wide">×1.2</span>}
                        {p.isCritical && <span className="block text-sm text-yellow-400 absolute -top-4 w-full text-center tracking-widest">クリティカル！</span>}
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </motion.div>

              <div className="text-5xl font-black text-white/10 italic relative z-0 md:absolute md:left-1/2 md:-translate-x-1/2">
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 text-9xl opacity-10 blur-sm pointer-events-none">VS</span>
                VS
              </div>

              {/* Overload Button - Battle Intervention */}
              {isBattling && !hasUsedOverload && (
                <motion.div
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 2 }}
                >
                  <Button
                    onClick={() => {
                      setHasUsedOverload(true);
                      setIsOverloadActive(true);
                      setOverloadFlash(true);
                      playSE('se_levelup');
                      toast.success('オーバーロード発動！次の攻撃が強化！');
                      setTimeout(() => setOverloadFlash(false), 500);
                      setTimeout(() => setIsOverloadActive(false), 3000);
                    }}
                    className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white font-bold px-6 py-3 rounded-full shadow-[0_0_20px_rgba(255,100,50,0.5)] animate-pulse"
                  >
                    <Zap className="w-5 h-5 mr-2" />
                    オーバーロード
                  </Button>
                  <div className="text-xs text-center mt-1 text-muted-foreground">
                    1回のみ使用可能
                  </div>
                </motion.div>
              )}

              {/* Cheer is now pre-battle reservation - buttons removed */}

              {/* Overload Flash Effect */}
              <AnimatePresence>
                {overloadFlash && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-orange-500/40 z-50 pointer-events-none"
                  />
                )}
              </AnimatePresence>

              {/* Overload Active Indicator */}
              <AnimatePresence>
                {isOverloadActive && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg"
                  >
                    <Zap className="w-4 h-4 inline mr-1" />
                    OVERLOAD ACTIVE - ダメージ1.5倍
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Enemy Robot */}
              <motion.div
                className={`relative p-6 rounded-xl glass-panel w-full md:w-[45%] ${shaking === enemyRobot.id ? 'border-red-500 shadow-[0_0_20px_rgba(255,0,0,0.5)]' : 'border-neon-pink shadow-[0_0_10px_rgba(255,0,85,0.3)]'} ${enemyHitClass}`}
                animate={
                  shaking === enemyRobot.id
                    ? { x: [-10, 10, -10, 10, 0], rotate: [2, -2, 2, -2, 0] }
                    : { x: enemyLunge, scale: activeSide === "enemy" ? 1.02 : 1 }
                }
                transition={shaking === enemyRobot.id ? { duration: 0.4 } : { duration: 0.18, ease: "easeOut" }}
              >
                <div className="absolute -top-3 right-4 bg-panel/80 px-3 py-1 text-neon-pink text-xs font-orbitron border border-neon-pink tracking-[0.12em] shadow-[0_0_10px_rgba(255,106,106,0.35)]">相手</div>
                <div className="flex justify-center my-4 drop-shadow-[0_0_15px_rgba(255,0,85,0.4)]">
                  <RobotSVG parts={enemyRobot.parts} colors={enemyRobot.colors} size={160} />
                </div>
                <div className="mt-2 text-center font-semibold text-lg text-white text-shadow-sm tracking-wide">{enemyRobot.name}</div>

                {/* HP Bar */}
                <div className="w-full mt-4 bg-panel/70 h-4 rounded-full overflow-hidden border border-white/20 relative">
                  <div
                    className="hp-delayed"
                    style={{ width: `${(getDelayedHp(enemyRobot.id) / enemyRobot.baseHp) * 100}%` }}
                    aria-hidden="true"
                  />
                  <motion.div
                    className="h-full bg-gradient-to-r from-neon-pink to-red-600 box-shadow-[0_0_10px_rgba(255,0,85,0.5)]"
                    initial={{ width: "100%" }}
                    animate={{ width: `${(getCurrentHp(enemyRobot.id) / enemyRobot.baseHp) * 100}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  />
                </div>
                <div className="text-right text-xs font-mono mt-1 text-neon-pink font-semibold">
                  HP: <span className="text-white text-lg font-orbitron">{getCurrentHp(enemyRobot.id)}</span> / {enemyRobot.baseHp}
                </div>

                {/* Damage Popups for Enemy */}
                <AnimatePresence>
                  {damagePopups.map(p => {
                    const log = battleResult?.logs[currentLogIndex];
                    if (log?.defenderId !== enemyRobot.id) return null;

                    return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, scale: 0.5, y: 0 }}
                        animate={{ opacity: 1, y: -80, scale: p.isCritical ? 2.5 : 1.5 }}
                        exit={{ opacity: 0, scale: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 z-50 font-black italic select-none pointer-events-none text-center w-full ${p.isCritical ? 'text-neon-yellow neon-text-yellow text-6xl' : (p.cheerApplied ? 'text-green-200 text-5xl' : 'text-white text-4xl')}`}
                        style={{ textShadow: "4px 4px 0px #000" }}
                      >
                        {p.value}
                        {p.isCritical && <span className="block text-sm text-neon-pink absolute -top-4 w-full text-center tracking-widest">クリティカル！</span>}
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </motion.div>

            </div>

            {/* Battle Logs */}
            <div className="mt-8 h-48 overflow-y-auto glass-panel p-4 rounded-xl text-sm font-mono space-y-2 border border-white/5 scrollbar-thin scrollbar-thumb-neon-cyan/20 scrollbar-track-transparent">
              {battleResult?.logs.slice(0, currentLogIndex + 1).reverse().map((log, i) => (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={i}
                  className={`p-2 border-l-2 pl-3 rounded bg-black/20 backdrop-blur-sm ${log.cheerApplied ? "border-green-400 bg-green-900/10" : ""} ${log.damage > 0 ? "border-neon-pink text-pink-200" : "border-neon-cyan text-cyan-200"}`}
                >
                  <span className="opacity-50 text-[10px] mr-2 text-white/60">TURN {String(log.turn).padStart(2, '0')}</span>
                  {log.itemMessage ? `${log.message}${log.itemMessage}` : log.message}
                </motion.div>
              ))}
            </div>

            {/* Result Screen Overlay */}
            <AnimatePresence>
              {currentLogIndex >= (battleResult?.logs.length || 0) - 1 && battleResult && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md rounded-lg p-4"
                >
                  <motion.div
                    initial={{ scale: 0.5, y: 50 }}
                    animate={{ scale: 1, y: 0 }}
                    className="text-center space-y-8 p-10 glass-panel border-neon-cyan shadow-[0_0_50px_rgba(0,243,255,0.2)] max-w-md w-full relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-neon-cyan/10 to-transparent opacity-50 pointer-events-none"></div>

                    <h2 className={`text-5xl md:text-7xl font-black italic tracking-tighter ${battleResult.winnerId === myRobot.id ? "text-neon-cyan neon-text-cyan" : "text-red-500"}`}>
                      {battleResult.winnerId === myRobot.id ? "勝利！" : "敗北..."}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2">
                      {battleResult.winnerId === myRobot.id ? "見事な戦いでした！" : "次は勝てる！"}
                    </p>

                    <div className="space-y-4 relative z-10">
                      {battleResult.winnerId === myRobot.id && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                          className="text-yellow-400 font-bold text-xl flex flex-col items-center gap-2 bg-black/40 p-4 rounded border border-yellow-500/30"
                        >
                          <div className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-400" />
                            {isRewardCapped ? (
                              <span>本日の報酬上限に達した（以降は報酬0）</span>
                            ) : (
                              <span>
                                勝利報酬: +{rewardSummary?.creditsReward ?? 0} credits / +{rewardSummary?.xpReward ?? 0} XP
                                {rewardSummary?.hasLevelUp && (
                                  <span className="ml-2">Lv {rewardSummary.levelBefore} → {rewardSummary.levelAfter}</span>
                                )}
                              </span>
                            )}
                          </div>
                          {showCreditsCapWithXp && (
                            <div className="text-xs text-muted-foreground">
                              本日のクレジット上限に達した（XPは獲得）
                            </div>
                          )}
                          {(rewardSummary?.scanTokensGained ?? 0) > 0 && (
                            <div className="text-xs text-muted-foreground">
                              ScanToken +{rewardSummary?.scanTokensGained ?? 0}
                            </div>
                          )}
                          {battleResult.rewards.newSkill && (
                            <div className="text-neon-pink animate-pulse mt-2 text-sm border-t border-white/10 pt-2 w-full">
                              NEW SKILL: {battleResult.rewards.newSkill}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>

                    <div className="space-y-3 pt-4 relative z-10">
                      <Button size="lg" onClick={() => {
                        setBattleResult(null);
                        setIsBattling(false);
                        setEnemyRobotId(null);
                      }} className="w-full bg-neon-cyan text-black hover:bg-white font-bold h-12 text-lg shadow-[0_0_15px_rgba(0,243,255,0.4)] hover:shadow-[0_0_25px_rgba(0,243,255,0.7)] transition-all">
                        次のバトルへ
                      </Button>

                      <div className="flex justify-center">
                        <ShareButton text={`${battleResult.winnerId === myRobot.id ? '勝利' : '敗北'}しました！ #BarcodeGenesis #バーコードジェネシス`} />
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
