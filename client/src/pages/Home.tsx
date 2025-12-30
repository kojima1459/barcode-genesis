import { useEffect, useState, type CSSProperties } from "react";
import { useTutorial } from "@/contexts/TutorialContext";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { db, functions } from "@/lib/firebase";
import { callGenerateRobot } from "@/lib/functions";
import { httpsCallable } from "firebase/functions";
import { collection, doc, getDocs, onSnapshot } from "firebase/firestore";
import { Factory, Loader2, Trophy, Zap, ScanBarcode, Swords } from "lucide-react";
import RobotSVG from "@/components/RobotSVG";
import { toast } from "sonner";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useNotification } from "@/hooks/useNotification";
import ShareButton from "@/components/ShareButton";
import TutorialModal from "@/components/TutorialModal";
import SoundSettings from "@/components/SoundSettings";
import { useSound } from "@/contexts/SoundContext";
import { RobotData } from "@/types/shared";
import AdBanner from "@/components/AdBanner";
import ThemeSwitcher from "@/components/ThemeSwitcher";



interface Mission {
  id: string;
  title?: string;
  progress?: number;
  target?: number;
  claimed?: boolean;
  rewardCredits?: number;
}

export default function Home() {
  const { t } = useLanguage();
  const { completeStep } = useTutorial();
  const { playBGM, playSE } = useSound();
  const { user, logout } = useAuth();
  const { permission, requestPermission } = useNotification();
  const [mode, setMode] = useState<'menu' | 'scan' | 'result'>('menu');
  const [isGenerating, setIsGenerating] = useState(false);
  const [robot, setRobot] = useState<RobotData | null>(null);
  const [credits, setCredits] = useState(0);
  const [loginStreak, setLoginStreak] = useState<number | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isClaimingLogin, setIsClaimingLogin] = useState(false);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [missionDateKey, setMissionDateKey] = useState<string | null>(null);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [missionsError, setMissionsError] = useState<string | null>(null);
  const [claimingMissionId, setClaimingMissionId] = useState<string | null>(null);
  const [followTarget, setFollowTarget] = useState("");
  const [following, setFollowing] = useState<string[]>([]);
  const [followError, setFollowError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  const [robots, setRobots] = useState<RobotData[]>([]);
  const [robotsLoading, setRobotsLoading] = useState(true);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitMessage, setLimitMessage] = useState("");

  useEffect(() => {
    // playBGM('bgm_menu'); // ユーザー要望により起動時の英語アナウンス（BGMに含まれる）を停止
  }, [playBGM]);

  useEffect(() => {
    if (!user) return;
    const unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setCredits(typeof data.credits === "number" ? data.credits : 0);
      setLoginStreak(typeof data.loginStreak === "number" ? data.loginStreak : null);
    });

    const loadMissions = async () => {
      setMissionsLoading(true);
      setMissionsError(null);
      try {
        const getMissions = httpsCallable(functions, "getDailyMissions");
        const result = await getMissions();
        const data = result.data as { dateKey: string; missions: Mission[] };
        setMissionDateKey(data.dateKey);
        setMissions(Array.isArray(data.missions) ? data.missions : []);
      } catch (error) {
        console.error("Failed to load missions:", error);
        setMissionsError("Failed to load missions");
      } finally {
        setMissionsLoading(false);
      }
    };

    const loadFollowing = async () => {
      try {
        const followSnap = await getDocs(collection(db, "publicUsers", user.uid, "following"));
        const ids = followSnap.docs.map((docSnap) => docSnap.id);
        setFollowing(ids);
      } catch (error) {
        console.error("Failed to load following list:", error);
      }
    };

    const loadRobots = async () => {
      setRobotsLoading(true);
      try {
        const q = collection(db, "users", user.uid, "robots");
        const snapshot = await getDocs(q);
        // Simple mapping, might want sorting
        const robotList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RobotData));
        // Sort by level desc or createdAt desc if available
        // robotList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); 
        setRobots(robotList);
      } catch (e) {
        console.error("Failed to load robots:", e);
      } finally {
        setRobotsLoading(false);
      }
    };

    loadMissions();
    loadFollowing();
    loadRobots();
    return () => {
      unsubUser();
    };
  }, [user]);

  const handleScan = async (barcode: string) => {
    playSE('se_scan');
    setIsGenerating(true);
    try {
      const data = await callGenerateRobot(barcode);

      if (data?.robot) {
        setRobot(data.robot);
        setMode('result');
        toast.success(t('scan_success'));
      } else {
        toast.error(t('scan_failed'));
      }
    } catch (error: any) {
      console.error('generateRobot error:', error);

      // Improve error handling based on HttpsError code
      const code = error?.code;
      const message = error?.message || 'Unknown error';

      if (code === 'resource-exhausted') {
        setLimitMessage(message);
        setShowLimitModal(true);
        return;
      }

      let userMessage = "Error: " + message;
      if (code === 'internal') {
        userMessage = 'サーバーエラーが発生しました。時間を置いて再度お試しください。(internal)';
      } else if (code === 'invalid-argument') {
        userMessage = '無効なバーコードです。(invalid-argument)';
      } else if (code === 'unauthenticated') {
        userMessage = '認証エラーです。再度ログインしてください。(unauthenticated)';
      }

      toast.error(userMessage, {
        duration: 5000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClaimLoginBonus = async () => {
    if (!user) return;
    setLoginError(null);
    setIsClaimingLogin(true);
    try {
      const claim = httpsCallable(functions, "claimDailyLogin");
      const result = await claim();
      const data = result.data as { claimed?: boolean; streak?: number; creditsGained?: number; newBadges?: string[] };
      if (data?.claimed) {
        if (typeof data.streak === "number") {
          setLoginStreak(data.streak);
        }
        toast.success("ログインボーナス獲得！");
        if (Array.isArray(data.newBadges) && data.newBadges.length > 0) {
          toast(`新バッジ獲得: ${data.newBadges.length}個`, { icon: "🏅" });
        }
      } else {
        toast("Login bonus already claimed", { icon: "✅" });
      }
    } catch (error: any) {
      const message = error?.message || "Login bonus failed";
      console.error("Login bonus failed:", error);
      setLoginError(message);
    } finally {
      setIsClaimingLogin(false);
    }
  };

  const handleClaimMission = async (missionId: string) => {
    if (!missionDateKey) return;
    setMissionsError(null);
    setClaimingMissionId(missionId);
    try {
      const claim = httpsCallable(functions, "claimMissionReward");
      const result = await claim({ dateKey: missionDateKey, missionId });
      const data = result.data as { credits: number; missionId: string };
      setCredits(data.credits);
      setMissions((prev) =>
        prev.map((mission) =>
          mission.id === missionId ? { ...mission, claimed: true } : mission
        )
      );
      toast.success("Mission reward claimed");
    } catch (error) {
      console.error("Claim mission failed:", error);
      const message = error instanceof Error ? error.message : "Claim mission failed";
      setMissionsError(message);
    } finally {
      setClaimingMissionId(null);
    }
  };

  const handleFollow = async () => {
    if (!user || !followTarget.trim()) return;
    setFollowError(null);
    setIsFollowing(true);
    try {
      const follow = httpsCallable(functions, "followUser");
      await follow({ targetUid: followTarget.trim() });
      setFollowTarget("");
      const followSnap = await getDocs(collection(db, "publicUsers", user.uid, "following"));
      setFollowing(followSnap.docs.map((docSnap) => docSnap.id));
      toast.success("Followed");
    } catch (error) {
      console.error("Follow failed:", error);
      const message = error instanceof Error ? error.message : "Follow failed";
      setFollowError(message);
    } finally {
      setIsFollowing(false);
    }
  };

  const loading = missionsLoading || robotsLoading;

  if (loading) {
    return (
      <div className="min-h-[100dvh] p-4 flex flex-col text-text">
        <main className="flex-1 w-full max-w-4xl mx-auto space-y-4">
          <div className="flex justify-between items-center py-2">
            <Skeleton className="h-14 w-40" />
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] p-4 flex flex-col text-text">
      <main className="flex-1 w-full max-w-4xl mx-auto space-y-4">
        {/* Header Section */}
        <section className="flex justify-between items-center py-2">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-primary">
              BARCODE<br />GENESIS
            </h1>
            <p className="text-xs text-muted-foreground tracking-[0.12em] font-orbitron">SYSTEM ONLINE</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-muted-foreground font-mono">CREDITS</div>
              <div className="text-xl font-bold font-orbitron text-primary">{credits.toLocaleString()}</div>
            </div>
            {/* User Avatar or something could go here */}
            <div className="flex gap-2">
              <ThemeSwitcher />
              <SoundSettings />
              <LanguageSwitcher />
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-semibold text-muted-foreground tracking-[0.12em]">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
          <Link href="/scan">
            <Button
              id="tutorial-generate-btn"
              onClick={() => completeStep('HOME_GENERATE')}
              className="h-20 w-full flex flex-col gap-2 glass-panel hover:bg-surface2/60 transition-all group"
            >
              <ScanBarcode className="w-7 h-7 text-primary transition-all" />
              <span className="font-bold text-sm tracking-wider">SCAN</span>
            </Button>
          </Link>
          <Link href="/battle">
            <Button className="h-20 w-full flex flex-col gap-2 glass-panel hover:bg-surface2/60 transition-all group">
              <Swords className="w-7 h-7 text-primary transition-all" />
              <span className="font-bold text-sm tracking-wider">BATTLE</span>
            </Button>
          </Link>
          <Link href="/workshop">
            <Button className="h-20 w-full flex flex-col gap-2 glass-panel hover:bg-surface2/60 transition-all group">
              <Factory className="w-7 h-7 text-primary transition-all" />
              <span className="font-bold text-sm tracking-wider">WORKSHOP</span>
            </Button>
          </Link>
          </div>
        </section>

        {/* Daily Bonus */}
        <section className="glass-panel p-4 rounded-lg border-border/70 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded bg-surface2 border border-border flex items-center justify-center text-primary">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold font-orbitron tracking-[0.08em]">DAILY BONUS</h2>
                <div className="text-xs text-muted-foreground font-mono">STREAK: {loginStreak || 0} DAYS</div>
                <div className="text-[11px] text-muted-foreground">1日1回受け取れます</div>
              </div>
            </div>
            <Button
              onClick={handleClaimLoginBonus}
              disabled={isClaimingLogin}
              className="bg-primary text-black hover:bg-primary/80 font-bold px-5 h-10"
            >
              {isClaimingLogin ? <Loader2 className="w-4 h-4 animate-spin" /> : "CLAIM"}
            </Button>
          </div>
        </section>

        {/* Active Missions */}
        <section className="glass-panel p-4 rounded-lg border-border/70 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-muted-foreground tracking-[0.12em]">Active Missions</h3>
            <Button variant="link" className="text-primary h-auto p-0 text-xs" disabled>
              VIEW ALL
            </Button>
          </div>
          {missionsLoading ? (
            <div className="py-4 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : missionsError ? (
            <div className="py-4 text-xs text-danger font-mono">{missionsError}</div>
          ) : missions.length === 0 ? (
            <div className="py-3 text-xs text-muted-foreground font-mono">No missions available today.</div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {missions.slice(0, 3).map(mission => (
                <div key={mission.id} className="flex items-center justify-between p-3 bg-surface2/70 border border-border/60 rounded group/mission transition-all">
                  <div className="flex-1">
                    <div className="text-sm font-bold text-text mb-1">{mission.title || "Daily Mission"}</div>
                    <div className="w-full h-1.5 bg-bg/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-1000"
                        style={{ width: `${Math.min(100, ((mission.progress || 0) / (mission.target || 1)) * 100)}%` }}
                      />
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground font-mono flex justify-between">
                      <span>PROGRESS: {mission.progress || 0}/{mission.target || 1}</span>
                      <span className="text-primary">REWARD: {mission.rewardCredits} CR</span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    disabled={mission.claimed || (mission.progress || 0) < (mission.target || 1) || claimingMissionId === mission.id}
                    onClick={() => handleClaimMission(mission.id)}
                    className={`ml-3 text-[10px] font-black tracking-tighter ${
                      mission.claimed
                        ? 'bg-surface2 text-muted'
                        : (mission.progress || 0) >= (mission.target || 1)
                          ? 'bg-primary text-black hover:bg-primary/80'
                          : 'bg-bg/60 text-muted border border-border/60 hover:bg-surface2/80'
                    }`}
                  >
                    {claimingMissionId === mission.id ? <Loader2 className="w-3 h-3 animate-spin" /> : mission.claimed ? "CLAIMED" : "CLAIM"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>


        {/* Robot List Preview */}
        <section className="space-y-2">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold font-orbitron flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              YOUR UNIT
            </h2>
            <Link href="/collection">
              <Button variant="link" className="text-primary h-auto p-0 text-xs">VIEW ALL &gt;</Button>
            </Link>
          </div>

          <div className="w-full">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground animate-pulse">Scanning database...</div>
            ) : robots.length === 0 ? (
              <div className="py-8 text-center glass-panel rounded-lg border-dashed border-border/60">
                <p className="text-muted-foreground mb-4">No Units Found</p>
                <Link href="/scan"><Button variant="secondary">Generate First Robot</Button></Link>
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
                {robots.slice(0, 8).map((robot, index) => (
                  <Link key={robot.id} href={'/robots/' + robot.id} className="snap-start">
                    <div
                      className="glass-panel p-3 rounded-lg flex items-center gap-3 hover:border-border transition-all cursor-pointer group min-w-[220px] card-in"
                      style={{ "--delay": `${index * 60}ms` } as CSSProperties}
                    >
                      <RobotSVG parts={robot.parts} colors={robot.colors} size={56} />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate text-text group-hover:text-primary transition-colors">{robot.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          Lv.{robot.level || 1} • <span className="text-muted-foreground">{robot.rarityName}</span>
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        HP {robot.baseHp}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <AdBanner />

        {permission === 'default' && (
          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              onClick={requestPermission}
              className="border-neon-cyan text-neon-cyan hover:bg-neon-cyan/20"
            >
              <Zap className="mr-2 h-4 w-4" />
              通知を有効にする
            </Button>
          </div>
        )}

        <TutorialModal />

        <Dialog open={showLimitModal} onOpenChange={setShowLimitModal}>
          <DialogContent className="bg-card border-neon-cyan text-foreground">
            <DialogHeader>
              <DialogTitle className="text-neon-cyan flex items-center gap-2">
                <Zap className="h-5 w-5" />
                GENERATION LIMIT REACHED
              </DialogTitle>
              <DialogDescription className="text-muted-foreground pt-4">
                {limitMessage}
                <br /><br />
                アップグレードして制限を解除しませんか？
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Link href="/premium">
                <Button className="w-full sm:w-auto bg-neon-yellow text-black hover:bg-neon-yellow/80 font-bold" onClick={() => setShowLimitModal(false)}>
                  プレミアムプランを見る
                </Button>
              </Link>
              <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setShowLimitModal(false)}>
                閉じる
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <div className="mt-8 pb-8 text-center">
          <p className="text-gray-500 text-xs font-mono">
            v{import.meta.env.VITE_APP_VERSION || '1.0.0-dev'}
          </p>
        </div>
      </main>
    </div>
  );


}
