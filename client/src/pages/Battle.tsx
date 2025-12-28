import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { db, functions } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { ArrowLeft, Loader2, Sword, Trophy } from "lucide-react";
import RobotSVG from "@/components/RobotSVG";
import { Link } from "wouter";
import { toast } from "sonner";

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
  };
}

export default function Battle() {
  const { user } = useAuth();
  const [robots, setRobots] = useState<RobotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null);
  const [enemyRobotId, setEnemyRobotId] = useState<string | null>(null);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [currentLogIndex, setCurrentLogIndex] = useState(-1);
  const [isBattling, setIsBattling] = useState(false);

  // ロボット一覧取得
  useEffect(() => {
    const fetchRobots = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, "users", user.uid, "robots"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RobotData));
        setRobots(data);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load robots");
      } finally {
        setLoading(false);
      }
    };
    fetchRobots();
  }, [user]);

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
  const enemyRobot = robots.find(r => r.id === enemyRobotId);

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

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col">
      <header className="flex items-center mb-8 max-w-4xl mx-auto w-full">
        <Link href="/">
          <Button variant="ghost" className="mr-4">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-primary">Battle Arena</h1>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full space-y-8">
        {/* ロボット選択エリア */}
        {!battleResult && !isBattling && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-bold">Select Your Robot</h2>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {robots.map(robot => (
                    <div 
                      key={robot.id}
                      onClick={() => setSelectedRobotId(robot.id)}
                      className={`p-2 border rounded cursor-pointer hover:bg-secondary/10 ${selectedRobotId === robot.id ? 'border-primary bg-primary/10' : ''}`}
                    >
                      <div className="text-sm font-bold truncate">{robot.name}</div>
                      <div className="text-xs text-muted-foreground">HP: {robot.baseHp}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-bold">Select Opponent</h2>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {robots.filter(r => r.id !== selectedRobotId).map(robot => (
                    <div 
                      key={robot.id}
                      onClick={() => setEnemyRobotId(robot.id)}
                      className={`p-2 border rounded cursor-pointer hover:bg-secondary/10 ${enemyRobotId === robot.id ? 'border-destructive bg-destructive/10' : ''}`}
                    >
                      <div className="text-sm font-bold truncate">{robot.name}</div>
                      <div className="text-xs text-muted-foreground">HP: {robot.baseHp}</div>
                    </div>
                  ))}
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
                Start Battle
              </Button>
            </div>
          </div>
        )}

        {/* バトル画面 */}
        {(battleResult || isBattling) && myRobot && enemyRobot && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              {/* Player */}
              <div className="text-center space-y-2">
                <div className="relative">
                  <RobotSVG parts={myRobot.parts} colors={myRobot.colors} size={150} />
                  {/* ダメージエフェクトなどをここに表示 */}
                </div>
                <div className="font-bold">{myRobot.name}</div>
                <div className="w-32 h-2 bg-secondary rounded-full mx-auto overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${(getCurrentHp(myRobot.id) / myRobot.baseHp) * 100}%` }}
                  />
                </div>
                <div className="text-sm">{getCurrentHp(myRobot.id)} / {myRobot.baseHp}</div>
              </div>

              <div className="text-2xl font-bold text-muted-foreground">VS</div>

              {/* Enemy */}
              <div className="text-center space-y-2">
                <div className="relative">
                  <RobotSVG parts={enemyRobot.parts} colors={enemyRobot.colors} size={150} className="scale-x-[-1]" />
                </div>
                <div className="font-bold">{enemyRobot.name}</div>
                <div className="w-32 h-2 bg-secondary rounded-full mx-auto overflow-hidden">
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
                    <span className="font-bold text-primary">Turn {log.turn}:</span> {log.message}
                    {log.isCritical && <span className="text-destructive font-bold ml-2">CRITICAL!</span>}
                  </div>
                ))}
                {!isBattling && battleResult && (
                  <div className="text-center py-4 font-bold text-xl text-primary animate-bounce">
                    {battleResult.winnerId === myRobot.id ? "YOU WIN!" : "YOU LOSE..."}
                  </div>
                )}
              </CardContent>
            </Card>

            {!isBattling && (
              <div className="flex justify-center">
                <Button onClick={() => { setBattleResult(null); setIsBattling(false); }}>
                  Play Again
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
