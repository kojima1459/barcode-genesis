import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { db, functions } from "@/lib/firebase";
import { collection, collectionGroup, getDocs, query, orderBy, limit, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { ArrowLeft, Loader2, Sword, Trophy, Search, Star } from "lucide-react";
import RobotSVG from "@/components/RobotSVG";
import { Link } from "wouter";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import ShareButton from "@/components/ShareButton";

interface RobotData {
  id: string;
  name: string;
  rarityName: string;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;
  parts: any;
  colors: any;
  level?: number;
  exp?: number;
  wins?: number;
}

interface BattleLog {
  turn: number;
  attackerId: string;
  defenderId: string;
  action: string;
  damage: number;
  isCritical: boolean;
  attackerHp: number;
  defenderHp: number;
  message: string;
}

interface BattleResult {
  winnerId: string;
  loserId: string;
  logs: BattleLog[];
  rewards: {
    exp: number;
    coins: number;
    newSkill?: string; // Name of new skill
    upgradedSkill?: string; // Name of upgraded skill
  };
}

export default function Battle() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [robots, setRobots] = useState<RobotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null);
  const [enemyRobotId, setEnemyRobotId] = useState<string | null>(null);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [currentLogIndex, setCurrentLogIndex] = useState(-1);
  const [isBattling, setIsBattling] = useState(false);

  const [enemyRobots, setEnemyRobots] = useState<RobotData[]>([]);
  const [friendId, setFriendId] = useState("");
  const [isSearching, setIsSearching] = useState(false);

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

  // バトル開始
  const startBattle = async () => {
    if (!selectedRobotId || !enemyRobotId) return;
    setIsBattling(true);
    setBattleResult(null);
    setCurrentLogIndex(-1);

    try {
      const startBattleFn = httpsCallable(functions, 'startBattle');
      const result = await startBattleFn({ myRobotId: selectedRobotId, enemyRobotId });
      const data = result.data as any;
      
      if (data.success) {
        setBattleResult(data.result);
        // ログ再生開始
        playBattleLogs(data.result.logs);
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
  const playBattleLogs = (logs: BattleLog[]) => {
    let index = 0;
    const interval = setInterval(() => {
      setCurrentLogIndex(index);
      index++;
      if (index >= logs.length) {
        clearInterval(interval);
        setIsBattling(false);
      }
    }, 1000); // 1秒ごとにターン進行
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
    const exp = robot.exp || 0;
    const nextLevelExp = level * 100;
    const progress = Math.min(100, (exp / nextLevelExp) * 100);
    return { level, exp, nextLevelExp, progress };
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col">
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
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
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
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              {/* Player */}
              <div className="text-center space-y-2 w-1/3">
                <div className="relative">
                  <RobotSVG parts={myRobot.parts} colors={myRobot.colors} size={150} />
                </div>
                <div className="font-bold">{myRobot.name}</div>
                <div className="text-xs text-muted-foreground mb-1">Lv.{getLevelInfo(myRobot).level}</div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${(getCurrentHp(myRobot.id) / myRobot.baseHp) * 100}%` }}
                  />
                </div>
                <div className="text-sm">{getCurrentHp(myRobot.id)} / {myRobot.baseHp}</div>
              </div>

              <div className="text-2xl font-bold text-muted-foreground">VS</div>

              {/* Enemy */}
              <div className="text-center space-y-2 w-1/3">
                <div className="relative">
                  <RobotSVG parts={enemyRobot.parts} colors={enemyRobot.colors} size={150} className="scale-x-[-1]" />
                </div>
                <div className="font-bold">{enemyRobot.name}</div>
                <div className="text-xs text-muted-foreground mb-1">Lv.{getLevelInfo(enemyRobot).level}</div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 transition-all duration-500"
                    style={{ width: `${(getCurrentHp(enemyRobot.id) / enemyRobot.baseHp) * 100}%` }}
                  />
                </div>
                <div className="text-sm">{getCurrentHp(enemyRobot.id)} / {enemyRobot.baseHp}</div>
              </div>
            </div>

            {/* バトルログ */}
            <Card className="h-48 overflow-y-auto">
              <CardContent className="p-4 space-y-2">
                {battleResult?.logs.slice(0, currentLogIndex + 1).map((log, i) => (
                  <div key={i} className="text-sm border-b pb-1 last:border-0">
                    <span className="font-bold text-primary">{t('turn')} {log.turn}:</span> {log.message}
                    {log.isCritical && <span className="text-destructive font-bold ml-2">{t('critical')}</span>}
                  </div>
                ))}
                {!isBattling && battleResult && (
                  <div className="text-center py-4 space-y-2">
                    <div className="font-bold text-xl text-primary animate-bounce">
                      {battleResult.winnerId === myRobot.id ? t('win') : t('lose')}
                    </div>
                    {battleResult.winnerId === myRobot.id && (
                      <div className="text-sm text-muted-foreground bg-secondary/20 p-2 rounded inline-block">
                        <div className="flex items-center justify-center gap-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span>{t('exp_gained')}: +{battleResult.rewards.exp}</span>
                        </div>
                        {/* レベルアップ判定は簡易的に表示（本来はサーバーからのレスポンスに含めるべきだが、今回はEXP計算で推測） */}
                        {(getLevelInfo(myRobot).exp + battleResult.rewards.exp) >= getLevelInfo(myRobot).nextLevelExp && (
                          <div className="text-green-500 font-bold mt-1">{t('level_up')}</div>
                        )}
                        
                        {/* スキル習得・強化通知 */}
                        {battleResult.rewards.newSkill && (
                          <div className="text-blue-500 font-bold mt-1 animate-pulse">
                            {t('new_skill')}: {battleResult.rewards.newSkill}!
                          </div>
                        )}
                        {battleResult.rewards.upgradedSkill && (
                          <div className="text-purple-500 font-bold mt-1 animate-pulse">
                            {t('skill_upgraded')}: {battleResult.rewards.upgradedSkill}!
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {!isBattling && battleResult && (
              <div className="flex justify-center gap-4">
                <Button onClick={() => { 
                  setBattleResult(null); 
                  setIsBattling(false); 
                  window.location.reload();
                }}>
                  {t('play_again')}
                </Button>
                
                {(() => {
                  const myRobot = robots.find(r => r.id === selectedRobotId);
                  if (!myRobot) return null;
                  
                  const isWin = battleResult.winnerId === myRobot.id;
                  const shareText = isWin 
                    ? t('share_battle_win')
                        .replace('{name}', myRobot.name)
                        .replace('{level}', String(getLevelInfo(myRobot).level))
                    : t('share_battle_lose')
                        .replace('{name}', myRobot.name);
                  
                  return (
                    <ShareButton 
                      text={shareText}
                      variant="secondary"
                    />
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
