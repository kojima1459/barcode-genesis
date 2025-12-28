import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { db, functions } from "@/lib/firebase";
import { collection, collectionGroup, getDocs, query, orderBy, limit, where, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { ArrowLeft, Loader2, Sword, Trophy, Search, Star } from "lucide-react";
import RobotSVG from "@/components/RobotSVG";
import { ElementalBurst, SkillCutIn } from "@/components/BattleEffects";
import { Link } from "wouter";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { RobotData, BattleResult } from "@/types/shared";
import ShareButton from "@/components/ShareButton";
import { useSound } from "@/contexts/SoundContext";
import { getItemLabel } from "@/lib/items";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Shield, Heart } from "lucide-react";



export default function Battle() {
  const { t } = useLanguage();
  const { playBGM, playSE } = useSound();
  const { user } = useAuth();
  const [robots, setRobots] = useState<RobotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null);
  const [enemyRobotId, setEnemyRobotId] = useState<string | null>(null);
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [currentLogIndex, setCurrentLogIndex] = useState(-1);
  const [isBattling, setIsBattling] = useState(false);
  const [damagePopups, setDamagePopups] = useState<{ id: string; value: number; isCritical: boolean; x: number; y: number }[]>([]);
  const [shaking, setShaking] = useState<string | null>(null); // robotId that is shaking (taking damage)

  const [enemyRobots, setEnemyRobots] = useState<RobotData[]>([]);
  const [friendId, setFriendId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isTrainingMode, setIsTrainingMode] = useState(false);

  // 自分のロボット一覧取得
  useEffect(() => {
    const fetchMyRobots = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, "users", user.uid, "robots"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RobotData));
        setRobots(data);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load your robots");
      } finally {
        setLoading(false);
      }
    };
    fetchMyRobots();
  }, [user]);

  // 敵ロボット一覧取得（Collection Group Query）
  useEffect(() => {
    loadRandomOpponents();
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

  const loadRandomOpponents = async () => {
    if (!user) return;
    try {
      // 自分以外のロボットを取得したいが、Firestoreの制約上クライアント側でフィルタリング
      // collectionGroupを使って全ユーザーのロボットを取得
      const q = query(collectionGroup(db, "robots"), orderBy("createdAt", "desc"), limit(20));
      const snapshot = await getDocs(q);

      const data: RobotData[] = [];
      snapshot.forEach(doc => {
        // 自分のロボットは除外（親のパスに自分のUIDが含まれているかチェック）
        if (!doc.ref.path.includes(user.uid)) {
          data.push({ id: doc.id, ...doc.data() } as RobotData);
        }
      });

      setEnemyRobots(data);
    } catch (error) {
      console.error("Error fetching enemies:", error);
    }
  };

  const searchFriend = async () => {
    if (!friendId.trim()) return;
    setIsSearching(true);
    setEnemyRobots([]); // Clear current list

    try {
      // Search robots by userId
      // Note: collectionGroup queries by field require an index
      const robotsRef = collectionGroup(db, 'robots');
      const q = query(robotsRef, where('userId', '==', friendId.trim()));
      const snapshot = await getDocs(q);

      const friendRobots: RobotData[] = [];
      snapshot.forEach(doc => {
        friendRobots.push({ id: doc.id, ...doc.data() } as RobotData);
      });

      if (friendRobots.length === 0) {
        toast.error("No robots found for this User ID");
        // Fallback to random opponents
        loadRandomOpponents();
      } else {
        setEnemyRobots(friendRobots);
        toast.success(`Found ${friendRobots.length} robots!`);
      }
    } catch (error) {
      console.error("Error searching friend:", error);
      toast.error("Error searching friend. Make sure ID is correct.");
      loadRandomOpponents();
    } finally {
      setIsSearching(false);
    }
  };

  // ローカルバトルシミュレーション（トレーニングモード用）
  const simulateLocalBattle = (attacker: RobotData, defender: RobotData): BattleResult => {
    const logs: BattleLog[] = [];
    let attackerHp = attacker.baseHp;
    let defenderHp = defender.baseHp;
    let turn = 1;
    const maxTurns = 20;

    // 先攻決定（スピードが高い方が先攻）
    const attackerFirst = attacker.baseSpeed >= defender.baseSpeed;
    const [first, second] = attackerFirst ? [attacker, defender] : [defender, attacker];
    let firstHp = attackerFirst ? attackerHp : defenderHp;
    let secondHp = attackerFirst ? defenderHp : attackerHp;

    while (firstHp > 0 && secondHp > 0 && turn <= maxTurns) {
      // 先攻の攻撃
      const firstDamage = Math.max(1, first.baseAttack - Math.floor(second.baseDefense / 2) + Math.floor(Math.random() * 10));
      const firstCrit = Math.random() < 0.1;
      const actualFirstDamage = firstCrit ? firstDamage * 2 : firstDamage;
      secondHp = Math.max(0, secondHp - actualFirstDamage);
      logs.push({
        turn,
        attackerId: first.id,
        defenderId: second.id,
        action: 'attack',
        damage: actualFirstDamage,
        isCritical: firstCrit,
        attackerHp: firstHp,
        defenderHp: secondHp,
        message: `${first.name} の攻撃！ ${second.name} に ${actualFirstDamage} ダメージ！`
      });

      if (secondHp <= 0) break;

      // 後攻の攻撃
      const secondDamage = Math.max(1, second.baseAttack - Math.floor(first.baseDefense / 2) + Math.floor(Math.random() * 10));
      const secondCrit = Math.random() < 0.1;
      const actualSecondDamage = secondCrit ? secondDamage * 2 : secondDamage;
      firstHp = Math.max(0, firstHp - actualSecondDamage);
      logs.push({
        turn,
        attackerId: second.id,
        defenderId: first.id,
        action: 'attack',
        damage: actualSecondDamage,
        isCritical: secondCrit,
        attackerHp: secondHp,
        defenderHp: firstHp,
        message: `${second.name} の攻撃！ ${first.name} に ${actualSecondDamage} ダメージ！`
      });

      turn++;
    }

    const winnerId = firstHp > 0 ? first.id : second.id;
    const loserId = firstHp > 0 ? second.id : first.id;

    return {
      winnerId,
      loserId,
      logs,
      rewards: { exp: 0, coins: 0 } // トレーニングでは報酬なし
    };
  };

  // バトル開始
  const startBattle = async () => {
    if (!selectedRobotId || !enemyRobotId) return;

    playBGM('bgm_battle');
    setIsBattling(true);
    setBattleResult(null);
    setCurrentLogIndex(-1);

    // トレーニングモードの場合はローカルシミュレーション
    if (isTrainingMode) {
      const myRobot = robots.find(r => r.id === selectedRobotId);
      const enemyRobot = robots.find(r => r.id === enemyRobotId);
      if (!myRobot || !enemyRobot) {
        toast.error("ロボットが見つかりません");
        setIsBattling(false);
        return;
      }

      const result = simulateLocalBattle(myRobot, enemyRobot);
      setBattleResult(result);
      playBattleLogs(result.logs);

      const animationDuration = result.logs.length * 1000 + 500;
      setTimeout(() => {
        if (result.winnerId === selectedRobotId) {
          playSE('se_win');
        } else {
          playSE('se_lose');
        }
      }, animationDuration);
      return;
    }

    // 通常対戦モード
    try {
      const matchBattleFn = httpsCallable(functions, 'matchBattle');
      const result = await matchBattleFn({
        playerRobotId: selectedRobotId,
        useItemId: (!isTrainingMode && selectedItemId) ? selectedItemId : undefined
      });
      const data = result.data as any;

      if (data.battleId) {
        // matchBattle returns different structure
        const battleResult: BattleResult = {
          winnerId: data.result.winner === 'player' ? selectedRobotId : enemyRobotId!,
          loserId: data.result.winner === 'player' ? enemyRobotId! : selectedRobotId,
          logs: data.result.log || [],
          rewards: data.rewards || { exp: data.experienceGained || 0, coins: 0 }
        };
        setBattleResult(battleResult);
        // ログ再生開始
        playBattleLogs(battleResult.logs);

        // 結果SE予約（アニメーション終了後）
        const animationDuration = battleResult.logs.length * 1000 + 500;
        setTimeout(() => {
          if (battleResult.winnerId === selectedRobotId) {
            playSE('se_win');
            if (battleResult.rewards.newSkill || battleResult.rewards.upgradedSkill) {
              setTimeout(() => playSE('se_levelup'), 1500);
            }
          } else {
            playSE('se_lose');
          }
        }, animationDuration);

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
    let index = 0;
    const interval = setInterval(() => {
      // Check interval end
      if (index >= result.logs.length) {
        clearInterval(interval);
        const finalWinnerId = result.winnerId;
        if (finalWinnerId === selectedRobotId) {
          playSE('se_win');
          if (result.rewards?.newSkill || result.rewards?.upgradedSkill) {
            setTimeout(() => playSE('se_levelup'), 1500);
          }
        } else {
          playSE('se_lose');
        }
        setIsBattling(false);
        return;
      }

      setCurrentLogIndex(index);
      const log = result.logs[index];

      // VFX Logic
      if (log.damage > 0) {
        playSE('se_attack');
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

        setDamagePopups(prev => [
          ...prev,
          {
            id: index + "-" + Math.random(),
            value: log.damage,
            isCritical: log.isCritical,
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
        clearInterval(interval);
        setActiveCutIn({ skillName: log.skillName, robotId: log.attackerId });
        setTimeout(() => {
          setActiveCutIn(null);
          startResumeLoop(index + 1, result);
        }, 1500);
        return;
      }

      index++;
    }, 1200);
  };

  const myRobot = robots.find(r => r.id === selectedRobotId);
  const enemyRobot = enemyRobots.find(r => r.id === enemyRobotId) || robots.find(r => r.id === enemyRobotId);

  // 現在のHP計算
  const getCurrentHp = (robotId: string) => {
    if (currentLogIndex === -1) {
      const robot = robots.find(r => r.id === robotId);
      return robot ? robot.baseHp : 0;
    }
    const log = battleResult?.logs[currentLogIndex];
    if (!log) return 0;
    return log.attackerId === robotId ? log.attackerHp : log.defenderHp;
  };

  // レベルとEXPの計算ヘルパー
  const getLevelInfo = (robot: RobotData) => {
    const level = robot.level || 1;
    const exp = robot.xp ?? robot.exp ?? 0;
    const nextLevelExp = level * 100;
    const progress = Math.min(100, (exp / nextLevelExp) * 100);
    return { level, exp, nextLevelExp, progress };
  };

  if (loading) return <div className="flex justify-center p-8 min-h-screen items-center bg-dark-bg"><Loader2 className="animate-spin text-neon-cyan h-12 w-12" /></div>;

  return (
    <div className="min-h-screen bg-dark-bg text-foreground p-4 flex flex-col pb-20 overflow-hidden relative">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 pointer-events-none" />
      <header className="flex items-center mb-8 max-w-4xl mx-auto w-full">
        <Link href="/">
          <Button variant="ghost" className="mr-4">
            <ArrowLeft className="h-5 w-5 mr-2" />
            {t('back')}
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-primary">{t('battle_arena')}</h1>
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
                </div>

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
                <Tabs defaultValue="battle" onValueChange={(v) => {
                  setIsTrainingMode(v === 'training');
                  setEnemyRobotId(null);
                }}>
                  <TabsList className="w-full">
                    <TabsTrigger value="battle" className="flex-1">🆚 対戦モード</TabsTrigger>
                    <TabsTrigger value="training" className="flex-1">🏋️ トレーニング</TabsTrigger>
                  </TabsList>
                </Tabs>

                {!isTrainingMode && (
                  <>
                    <h2 className="text-xl font-bold">{t('select_opponent')}</h2>
                    <div className="flex gap-2">
                      <Input
                        placeholder={t('friend_id_placeholder')}
                        value={friendId}
                        onChange={(e) => setFriendId(e.target.value)}
                        className="font-mono text-xs"
                      />
                      <Button onClick={searchFriend} disabled={isSearching} size="sm" variant="secondary">
                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                      {enemyRobots.length > 0 ? (
                        enemyRobots.map(robot => {
                          const { level } = getLevelInfo(robot);
                          return (
                            <div
                              key={robot.id}
                              onClick={() => setEnemyRobotId(robot.id)}
                              className={`p-2 border rounded cursor-pointer hover:bg-secondary/10 ${enemyRobotId === robot.id ? 'border-destructive bg-destructive/10' : ''}`}
                            >
                              <div className="text-sm font-bold truncate">{robot.name}</div>
                              <div className="flex justify-between items-center text-xs text-muted-foreground">
                                <span>Lv.{level}</span>
                                <span>HP: {robot.baseHp}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">User: {robot.id.substring(0, 4)}...</div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="col-span-2 text-center text-muted-foreground py-4">
                          {t('no_opponents')}
                        </div>
                      )}
                    </div>
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
              </CardContent>
            </Card>

            <div className="md:col-span-2 flex justify-center">
              <Button
                size="lg"
                disabled={!selectedRobotId || !enemyRobotId}
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
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">

              {/* Player Robot */}
              <motion.div
                className={`relative p-6 rounded-xl glass-panel w-full md:w-[45%] ${shaking === selectedRobotId ? 'border-red-500 shadow-[0_0_20px_rgba(255,0,0,0.5)]' : 'border-neon-cyan shadow-[0_0_10px_rgba(0,243,255,0.3)]'}`}
                animate={shaking === selectedRobotId ? { x: [-10, 10, -10, 10, 0], rotate: [-2, 2, -2, 2, 0] } : { scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <div className="absolute -top-3 left-4 bg-black px-3 py-1 text-neon-cyan text-xs font-orbitron border border-neon-cyan tracking-widest shadow-[0_0_10px_rgba(0,243,255,0.5)]">PLAYER</div>
                <div className="flex justify-center my-4 drop-shadow-[0_0_15px_rgba(0,243,255,0.4)]">
                  <RobotSVG parts={myRobot.parts} colors={myRobot.colors} size={160} />
                </div>
                <div className="mt-2 text-center font-bold text-lg text-white text-shadow-sm tracking-wide">{myRobot.name}</div>

                {/* HP Bar */}
                <div className="w-full mt-4 bg-black/80 h-4 rounded-full overflow-hidden border border-white/20 relative">
                  <motion.div
                    className="h-full bg-gradient-to-r from-neon-cyan to-blue-600 box-shadow-[0_0_10px_rgba(0,243,255,0.5)]"
                    initial={{ width: "100%" }}
                    animate={{ width: `${(getCurrentHp(myRobot.id) / myRobot.baseHp) * 100}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  />
                  <div className="absolute inset-0 bg-[url('/scanline.png')] opacity-20 pointer-events-none mix-blend-overlay"></div>
                </div>
                <div className="text-right text-xs font-mono mt-1 text-neon-cyan font-bold">
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
                        className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 z-50 font-black italic stroke-black pointer-events-none select-none flex items-center justify-center w-full text-center ${p.isCritical ? 'text-neon-pink neon-text-purple text-6xl' : 'text-white text-4xl'}`}
                        style={{ textShadow: "4px 4px 0px #000" }}
                      >
                        {p.value}
                        {p.isCritical && <span className="block text-sm text-yellow-400 absolute -top-4 w-full text-center tracking-widest">CRITICAL!</span>}
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </motion.div>

              <div className="text-5xl font-black text-white/10 italic relative z-0 md:absolute md:left-1/2 md:-translate-x-1/2">
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 text-9xl opacity-10 blur-sm pointer-events-none">VS</span>
                VS
              </div>

              {/* Enemy Robot */}
              <motion.div
                className={`relative p-6 rounded-xl glass-panel w-full md:w-[45%] ${shaking === enemyRobot.id ? 'border-red-500 shadow-[0_0_20px_rgba(255,0,0,0.5)]' : 'border-neon-pink shadow-[0_0_10px_rgba(255,0,85,0.3)]'}`}
                animate={shaking === enemyRobot.id ? { x: [-10, 10, -10, 10, 0], rotate: [2, -2, 2, -2, 0] } : {}}
              >
                <div className="absolute -top-3 right-4 bg-black px-3 py-1 text-neon-pink text-xs font-orbitron border border-neon-pink tracking-widest shadow-[0_0_10px_rgba(255,0,85,0.5)]">ENEMY</div>
                <div className="flex justify-center my-4 drop-shadow-[0_0_15px_rgba(255,0,85,0.4)]">
                  <RobotSVG parts={enemyRobot.parts} colors={enemyRobot.colors} size={160} />
                </div>
                <div className="mt-2 text-center font-bold text-lg text-white text-shadow-sm tracking-wide">{enemyRobot.name}</div>

                {/* HP Bar */}
                <div className="w-full mt-4 bg-black/50 h-4 rounded-full overflow-hidden border border-white/20 relative">
                  <motion.div
                    className="h-full bg-gradient-to-r from-neon-pink to-red-600 box-shadow-[0_0_10px_rgba(255,0,85,0.5)]"
                    initial={{ width: "100%" }}
                    animate={{ width: `${(getCurrentHp(enemyRobot.id) / enemyRobot.baseHp) * 100}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  />
                </div>
                <div className="text-right text-xs font-mono mt-1 text-neon-pink font-bold">
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
                        className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 z-50 font-black italic select-none pointer-events-none text-center w-full ${p.isCritical ? 'text-neon-yellow neon-text-yellow text-6xl' : 'text-white text-4xl'}`}
                        style={{ textShadow: "4px 4px 0px #000" }}
                      >
                        {p.value}
                        {p.isCritical && <span className="block text-sm text-neon-pink absolute -top-4 w-full text-center tracking-widest">CRITICAL!</span>}
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
                  className={`p-2 border-l-2 pl-3 rounded bg-black/20 backdrop-blur-sm ${log.damage > 0 ? "border-neon-pink text-pink-200" : "border-neon-cyan text-cyan-200"}`}
                >
                  <span className="opacity-50 text-[10px] mr-2 text-white/60">TURN {String(log.turn).padStart(2, '0')}</span>
                  {log.message}
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

                    <h2 className={`text-6xl font-black italic tracking-tighter ${battleResult.winnerId === myRobot.id ? "text-neon-cyan neon-text-cyan" : "text-gray-500"}`}>
                      {battleResult.winnerId === myRobot.id ? "VICTORY" : "DEFEAT"}
                    </h2>

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
                            <span>EXP +{battleResult.rewards.exp}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-yellow-500 border border-yellow-300" />
                            <span>Gold +{battleResult.rewards.coins}</span>
                          </div>
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
                        NEXT BATTLE
                      </Button>

                      <div className="flex justify-center">
                        <ShareButton text={`I just ${battleResult.winnerId === myRobot.id ? 'won' : 'lost'} a battle in #BarcodeGenesis!`} />
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
