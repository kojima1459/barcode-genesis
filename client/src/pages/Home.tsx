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
import { Factory, Loader2, Trophy, Zap, ScanBarcode, Swords, ShoppingCart, Activity, Users } from "lucide-react";
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
import { Interactive } from "@/components/ui/interactive";
import { SystemSkeleton } from "@/components/ui/SystemSkeleton";
import HangarCard from "@/components/HangarCard";
import { TechCard } from "@/components/ui/TechCard";
import { BossAlertCard, BossData } from "@/components/BossAlertCard";
import { cn } from "@/lib/utils";
import { useLocation, Link } from "wouter";
import { GlobalHeader } from "@/components/GlobalHeader";
import { BookOpen } from "lucide-react";


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
  const [hasClaimed, setHasClaimed] = useState(false);

  const [robots, setRobots] = useState<RobotData[]>([]);
  const [robotsLoading, setRobotsLoading] = useState(true);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitMessage, setLimitMessage] = useState("");

  // Daily Boss state
  const [bossData, setBossData] = useState<BossData | null>(null);
  const [canChallengeBoss, setCanChallengeBoss] = useState(false);
  const [bossLoading, setBossLoading] = useState(true);
  const [, setLocation] = useLocation();

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

    // Load Daily Boss
    const loadBoss = async () => {
      setBossLoading(true);
      try {
        const getDailyBoss = httpsCallable(functions, "getDailyBoss");
        const result = await getDailyBoss();
        const data = result.data as { boss: BossData; canChallenge: boolean };
        setBossData(data.boss);
        setCanChallengeBoss(data.canChallenge);
      } catch (error) {
        console.error("Failed to load daily boss:", error);
      } finally {
        setBossLoading(false);
      }
    };
    loadBoss();

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
        setHasClaimed(true);
        if (Array.isArray(data.newBadges) && data.newBadges.length > 0) {
          toast(`新バッジ獲得: ${data.newBadges.length}個`, { icon: "🏅" });
        }
      } else {
        setHasClaimed(true);
        toast("本日は受け取り済みです", { icon: "✅" });
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
      <div className="min-h-[100dvh] bg-bg text-text pb-24 md:pb-8 flex flex-col">
        {/* Global Header */}
        <GlobalHeader missions={missions} />

        <main className="flex-1 w-full max-w-md md:max-w-5xl mx-auto space-y-6 px-4 pt-4 relative z-10">
          <header className="flex justify-between items-center py-4">
            <SystemSkeleton className="h-16 w-48 rounded-lg" text="BOOTING OS..." showText={false} />
            <SystemSkeleton className="h-10 w-24 rounded-lg" showText={false} />
          </header>

          <SystemSkeleton
            className="h-64 w-full rounded-2xl"
            text="INITIALIZING SYSTEM..."
            subtext="CONNECTING TO BARCODE NETWORK"
          />

          <div className="grid grid-cols-3 gap-3">
            <SystemSkeleton className="h-24 w-full rounded-xl" showText={false} />
            <SystemSkeleton className="h-24 w-full rounded-xl" showText={false} />
            <SystemSkeleton className="h-24 w-full rounded-xl" showText={false} />
          </div>
        </main>
      </div>
    );
  }

  // Get the most "active" robot (using last one in list for now, ideally sort by lastUsed)
  // Logic: last added often feels like current main
  const mainRobot = robots.length > 0 ? robots[0] : null;

  return (
    <div className="min-h-[100dvh] flex flex-col text-text relative pb-24 md:pb-8">
      {/* Background Effect */}
      <div className="fixed inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none z-0" />

      {/* Mobile: Constrained width, Desktop: Expanded width */}
      <div className="flex-1 w-full max-w-md md:max-w-5xl mx-auto flex flex-col">
        {/* Global Header */}
        <GlobalHeader missions={missions} className="mb-4" />

        <main className="flex-1 w-full px-4 space-y-5 relative z-10">

          {/* 1. System Ticker */}
          <div className="w-full bg-black/40 border-y border-white/5 py-1 overflow-hidden">
            <div className="whitespace-nowrap animate-marquee text-[10px] font-mono text-muted-foreground/80 flex gap-8">
              <span>SYSTEM ONLINE...</span>
              <span>CONNECTION STABLE</span>
              <span>GRID ACCESS: AUTHORIZED</span>
              <span>WELCOME BACK, OPERATOR {user?.uid.slice(0, 6)}...</span>
              <span className="text-neon-cyan">NEW ORDERS AVAILABLE</span>
            </div>
          </div>

          {/* Desktop: Grid Layout | Mobile: Flex Column */}
          <div className="md:grid md:grid-cols-12 md:gap-6 space-y-5 md:space-y-0">

            {/* Main Column (Hangar + Operations) */}
            <div className="md:col-span-8 space-y-5">
              {/* 2. Hangar Card (Main Visual) */}
              <section>
                <HangarCard robot={mainRobot} className="md:aspect-[21/10]" />
              </section>

              {/* 2.5. Daily Boss Alert */}
              <section>
                <BossAlertCard
                  boss={bossData}
                  canChallenge={canChallengeBoss}
                  isLoading={bossLoading}
                  onChallenge={() => setLocation('/boss')}
                />
              </section>

              {/* NEW: How To Start Card */}
              <section>
                <Link href="/how-to">
                  <div className="w-full bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-blue-600/30 transition-all select-none active:scale-[0.98]">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-500/20 p-2 rounded-full">
                        <BookOpen className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-blue-100">初めての方へ</div>
                        <div className="text-[10px] text-blue-300">ゲームの遊び方（約30秒）</div>
                      </div>
                    </div>
                    <div className="text-xs text-blue-400 font-mono border border-blue-500/30 px-2 py-1 rounded">
                      GUIDE
                    </div>
                  </div>
                </Link>
              </section>

              {/* 3. Primary Objectives (Grid) */}
              <section className="space-y-2">
                <h2 className="text-xs font-bold text-muted-foreground tracking-widest flex items-center gap-2">
                  <Activity className="w-3 h-3" />
                  OPERATIONS
                </h2>
                <div className="grid grid-cols-3 gap-3 md:gap-4">
                  <Link href="/scan">
                    <Button
                      id="tutorial-generate-btn"
                      onClick={() => completeStep('HOME_GENERATE')}
                      className="h-28 md:h-32 w-full flex flex-col items-center justify-center gap-2 glass-panel border border-neon-cyan/30 hover:bg-neon-cyan/10 hover:border-neon-cyan transition-all group shadow-[0_0_15px_rgba(0,0,0,0.3)] bg-surface1/80"
                    >
                      <div className="p-3 rounded-full bg-surface2 group-hover:bg-neon-cyan/20 transition-colors">
                        <ScanBarcode className="w-6 h-6 text-neon-cyan" />
                      </div>
                      <span className="font-bold text-xs text-white tracking-wider group-hover:text-neon-cyan">SCAN</span>
                    </Button>
                  </Link>

                  <Link href="/battle">
                    <Button className="h-28 md:h-32 w-full flex flex-col items-center justify-center gap-2 glass-panel border border-neon-pink/30 hover:bg-neon-pink/10 hover:border-neon-pink transition-all group shadow-[0_0_15px_rgba(0,0,0,0.3)] bg-surface1/80">
                      <div className="p-3 rounded-full bg-surface2 group-hover:bg-neon-pink/20 transition-colors">
                        <Swords className="w-6 h-6 text-neon-pink" />
                      </div>
                      <span className="font-bold text-xs text-white tracking-wider group-hover:text-neon-pink">BATTLE</span>
                    </Button>
                  </Link>

                  <Link href="/workshop">
                    <Button className="h-28 md:h-32 w-full flex flex-col items-center justify-center gap-2 glass-panel border border-orange-500/30 hover:bg-orange-500/10 hover:border-orange-500 transition-all group shadow-[0_0_15px_rgba(0,0,0,0.3)] bg-surface1/80">
                      <div className="p-3 rounded-full bg-surface2 group-hover:bg-orange-500/20 transition-colors">
                        <Factory className="w-6 h-6 text-orange-500" />
                      </div>
                      <span className="font-bold text-xs text-white tracking-wider group-hover:text-orange-500">CRAFT</span>
                    </Button>
                  </Link>
                </div>
              </section>
            </div>

            {/* Side Column (Mission / Status) */}
            <div className="md:col-span-4 space-y-4">

              {/* Daily Missions (Consolidated) */}
              <TechCard className="p-4 h-full flex flex-col" intensity="medium" variant="outline">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-muted-foreground tracking-widest flex items-center gap-2">
                    <Trophy className="w-3 h-3 text-yellow-500" />
                    DAILY ORDERS
                  </h3>
                  <span className="text-[10px] text-muted-foreground/60">RESET: 00:00 JST</span>
                </div>

                {/* Daily Login Button inline if not claimed */}
                {!hasClaimed && (
                  <div className="mb-4 flex items-center justify-between bg-surface2/50 p-2 rounded border border-yellow-500/30">
                    <div className="text-xs font-bold text-yellow-500 flex items-center gap-2">
                      <span className="animate-pulse">●</span> LOGIN BONUS
                    </div>
                    <Button
                      size="sm"
                      onClick={handleClaimLoginBonus}
                      disabled={isClaimingLogin}
                      className="h-7 text-xs bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/40 border border-yellow-500/50"
                    >
                      {isClaimingLogin ? "Claiming..." : "CLAIM"}
                    </Button>
                  </div>
                )}

                {/* Mission List */}
                <div className="space-y-2 flex-1">
                  {missionsLoading ? (
                    <div className="text-xs text-muted-foreground text-center py-2 animate-pulse">SYNCING...</div>
                  ) : missions.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-2">NO ACTIVE ORDERS</div>
                  ) : (
                    missions.slice(0, 3).map(mission => (
                      <div key={mission.id} className="flex items-center justify-between p-2 bg-surface1/50 rounded border border-white/5">
                        <div className="flex-1">
                          <div className="text-xs font-bold text-gray-300">{mission.title}</div>
                          <div className="w-full h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                            <div className="h-full bg-neon-cyan transition-all" style={{ width: `${Math.min(100, ((mission.progress || 0) / (mission.target || 1)) * 100)}%` }} />
                          </div>
                        </div>
                        <Button
                          size="sm"
                          disabled={mission.claimed || (mission.progress || 0) < (mission.target || 1) || claimingMissionId === mission.id}
                          onClick={() => handleClaimMission(mission.id)}
                          className={cn("ml-3 h-6 px-3 text-[10px] font-bold uppercase",
                            mission.claimed ? "bg-transparent text-muted-foreground border border-white/10" :
                              (mission.progress || 0) >= (mission.target || 1) ? "bg-neon-cyan text-black hover:bg-white" : "bg-transparent text-muted-foreground border border-white/10"
                          )}
                        >
                          {mission.claimed ? "DONE" : "CLAIM"}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </TechCard>

              {/* Quick Link Rows (Vertical Stack in Side Column) */}
              <div className="flex flex-col gap-3">
                <Link href="/shop">
                  <TechCard className="p-3 flex items-center gap-3 cursor-pointer group hover:bg-white/5 transition-colors" variant="outline" intensity="low">
                    <div className="p-2 rounded bg-surface2 text-primary group-hover:text-white transition-colors">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">SHOP</div>
                      <div className="text-[10px] text-muted-foreground">SUPPLIES</div>
                    </div>
                  </TechCard>
                </Link>
                <Link href="/collection">
                  <TechCard className="p-3 flex items-center gap-3 cursor-pointer group hover:bg-white/5 transition-colors" variant="outline" intensity="low">
                    <div className="p-2 rounded bg-surface2 text-primary group-hover:text-white transition-colors">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">UNITS</div>
                      <div className="text-[10px] text-muted-foreground">DATABASE</div>
                    </div>
                  </TechCard>
                </Link>
              </div>

            </div>
          </div>

          <AdBanner />

          {/* Footer Area */}
          <div className="text-center pb-8 pt-4">
            {permission === 'default' && (
              <Button variant="ghost" size="sm" onClick={requestPermission} className="text-xs text-muted-foreground hover:text-white">
                <Zap className="w-3 h-3 mr-1" /> Enable Notifications
              </Button>
            )}
            <p className="text-[10px] text-white/20 mt-4 font-mono">
              BARCODE GENESIS SYSTEM v{import.meta.env.VITE_APP_VERSION || '1.0.0'}
            </p>
          </div>

          <TutorialModal />

          {/* --- Modals/Dialogs preserved --- */}
          <Dialog open={showLimitModal} onOpenChange={setShowLimitModal}>
            <DialogContent className="bg-card border-neon-cyan text-foreground">
              <DialogHeader>
                <DialogTitle className="text-neon-cyan flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  製造上限に達しました
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

        </main>

        <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
      </div>
    </div>
  );
}


