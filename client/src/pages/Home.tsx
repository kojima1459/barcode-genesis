import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { db, functions } from "@/lib/firebase";
import { callGenerateRobot } from "@/lib/functions";
import { httpsCallable } from "firebase/functions";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { Loader2, LogOut, Scan, ShoppingCart, Sword, Trophy } from "lucide-react";
import BarcodeScanner from "@/components/BarcodeScanner";
import RobotSVG from "@/components/RobotSVG";
import { toast } from "sonner";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ShareButton from "@/components/ShareButton";
import TutorialModal from "@/components/TutorialModal";
import SoundSettings from "@/components/SoundSettings";
import { useSound } from "@/contexts/SoundContext";
import { RobotData } from "@/types/shared";


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
  const { playBGM, playSE } = useSound();
  const { user, logout } = useAuth();
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

  useEffect(() => {
    // playBGM('bgm_menu'); // ユーザー要望により起動時の英語アナウンス（BGMに含まれる）を停止
  }, [playBGM]);

  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setCredits(typeof data.credits === "number" ? data.credits : 0);
          setLoginStreak(typeof data.loginStreak === "number" ? data.loginStreak : null);
        }
      } catch (error) {
        console.error("Failed to load user data:", error);
      }
    };

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

    loadData();
    loadMissions();
    loadFollowing();
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

      let userMessage = `エラー: ${message}`;
      if (code === 'internal') {
        userMessage = 'サーバーエラーが発生しました。時間を置いて再度お試しください。(internal)';
      } else if (code === 'invalid-argument') {
        userMessage = '無効なバーコードです。(invalid-argument)';
      } else if (code === 'unauthenticated') {
        userMessage = '認証エラーです。再度ログインしてください。(unauthenticated)';
      } else if (code === 'resource-exhausted') {
        userMessage = 'リクエスト数が多すぎます。しばらく待ってください。(resource-exhausted)';
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
      const claim = httpsCallable(functions, "claimLoginBonus");
      const result = await claim();
      const data = result.data as { streak: number; credits: number };
      setLoginStreak(data.streak);
      setCredits(data.credits);
      toast.success("Login bonus claimed");
    } catch (error) {
      console.error("Login bonus failed:", error);
      const message = error instanceof Error ? error.message : "Login bonus failed";
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

  return (
    <div className="min-h-screen bg-dark-bg p-4 flex flex-col pb-24 relative overflow-hidden text-foreground">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 pointer-events-none" />

      <main className="flex-1 w-full max-w-4xl mx-auto space-y-8 relative z-10">

        {/* Header Section */}
        <section className="flex justify-between items-center py-4">
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter text-neon-cyan neon-text-cyan">
              BARCODE<br />GENESIS
            </h1>
            <p className="text-xs text-muted-foreground tracking-widest font-orbitron">SYSTEM ONLINE</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-muted-foreground font-mono">CREDITS</div>
              <div className="text-xl font-bold font-orbitron text-neon-yellow">{creditBalance.toLocaleString()}</div>
            </div>
            {/* User Avatar or something could go here */}
            <div className="flex gap-2">
              <SoundSettings />
              <LanguageSwitcher />
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <section className="grid grid-cols-2 gap-4">
          <Link href="/scan">
            <Button className="h-32 w-full flex flex-col gap-2 glass-panel border-neon-cyan hover:bg-neon-cyan/10 transition-all group">
              <ScanBarcode className="w-12 h-12 text-neon-cyan group-hover:drop-shadow-[0_0_10px_rgba(0,243,255,0.8)] transition-all" />
              <span className="font-bold text-lg tracking-wider">GENERATE</span>
            </Button>
          </Link>
          <Link href="/battle">
            <Button className="h-32 w-full flex flex-col gap-2 glass-panel border-neon-pink hover:bg-neon-pink/10 transition-all group">
              <Swords className="w-12 h-12 text-neon-pink group-hover:drop-shadow-[0_0_10px_rgba(255,0,85,0.8)] transition-all" />
              <span className="font-bold text-lg tracking-wider">BATTLE</span>
            </Button>
          </Link>
        </section>

        {/* Robot List Preview */}
        <section>
          <div className="flex justify-between items-end mb-4 border-b border-white/10 pb-2">
            <h2 className="text-xl font-bold font-orbitron flex items-center gap-2">
              <Zap className="w-5 h-5 text-neon-yellow" />
              YOUR UNIT
            </h2>
            <Link href="/collection">
              <Button variant="link" className="text-neon-cyan h-auto p-0 text-xs">VIEW ALL &gt;</Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-2 py-8 text-center text-muted-foreground animate-pulse">Scanning database...</div>
            ) : robots.length === 0 ? (
              <div className="col-span-2 py-12 text-center glass-panel rounded-lg border-dashed border-white/20">
                <p className="text-muted-foreground mb-4">No Units Found</p>
                <Link href="/scan"><Button variant="secondary">Generate First Robot</Button></Link>
              </div>
            ) : (
              robots.slice(0, 4).map(robot => (
                <Link key={robot.id} href={`/robots/${robot.id}`}>
                  <div className="glass-panel p-3 rounded-lg flex items-center gap-4 hover:border-white/50 transition-all cursor-pointer group">
                    <RobotSVG parts={robot.parts} colors={robot.colors} size={60} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate text-white group-hover:text-neon-cyan transition-colors">{robot.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        Lv.{robot.level || 1} • <span style={{ color: robot.rarityName === 'Legendary' ? '#ffd700' : 'inherit' }}>{robot.rarityName}</span>
                      </div>
                    </div>
                    <div className="text-xs font-mono text-white/50">
                      HP {robot.baseHp}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <TutorialModal />
      </main>
    </div>
  );


}


