import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { db, functions } from "@/lib/firebase";
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

// 型定義（本来は共有型を使うべきだが、簡易的に定義）
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
    playBGM('bgm_menu');
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
      const generateRobot = httpsCallable(functions, 'generateRobot');
      const result = await generateRobot({ barcode });
      const data = result.data as any;
      
      if (data.success) {
        setRobot(data.robot);
        setMode('result');
        toast.success(t('scan_success'));
      } else {
        toast.error(data.error || t('scan_failed'));
      }
    } catch (error) {
      console.error(error);
      toast.error(t('error'));
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
    <div className="min-h-screen bg-background p-4 flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-primary">{t('app_title')}</h1>
        <div className="flex items-center gap-4">
          <SoundSettings />
          <LanguageSwitcher />
          <Link href="/profile">
            <Button variant="ghost" className="text-sm text-muted-foreground hidden sm:inline-flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                👤
              </span>
              {user?.email}
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => logout()}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-8 max-w-4xl mx-auto w-full">
        <TutorialModal />
        
        {mode === 'menu' && (
          <div className="w-full space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
              <Card 
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => {
                  playSE('se_click');
                  setMode('scan');
                }}
              >
                <CardContent className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className="p-4 rounded-full bg-primary/10 text-primary">
                    <Scan className="h-12 w-12" />
                  </div>
                  <h2 className="text-2xl font-bold">{t('scan_barcode')}</h2>
                  <p className="text-muted-foreground text-center">
                    {t('scan_desc')}
                  </p>
                </CardContent>
              </Card>

              <Link href="/collection" className="w-full" onClick={() => playSE('se_click')}>
                <Card className="cursor-pointer hover:border-primary transition-colors h-full">
                  <CardContent className="flex flex-col items-center justify-center h-64 gap-4">
                    <div className="p-4 rounded-full bg-secondary text-secondary-foreground">
                      <RobotSVG 
                        parts={{head:1,face:1,body:1,armLeft:1,armRight:1,legLeft:1,legRight:1,backpack:1,weapon:1,accessory:1}} 
                        colors={{primary:'#3b82f6',secondary:'#1e40af',accent:'#60a5fa',glow:'#93c5fd'}} 
                        size={48} 
                      />
                    </div>
                    <h2 className="text-2xl font-bold">{t('collection')}</h2>
                    <p className="text-muted-foreground text-center">
                      {t('collection_desc')}
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/shop" className="w-full" onClick={() => playSE('se_click')}>
                <Card className="cursor-pointer hover:border-primary transition-colors h-full">
                  <CardContent className="flex flex-col items-center justify-center h-64 gap-4">
                    <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-500">
                      <ShoppingCart className="h-12 w-12" />
                    </div>
                    <h2 className="text-2xl font-bold">{t('shop')}</h2>
                    <p className="text-muted-foreground text-center">
                      {t('shop_desc')}
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/battle" className="w-full" onClick={() => playSE('se_click')}>
                <Card className="cursor-pointer hover:border-primary transition-colors h-full">
                  <CardContent className="flex flex-col items-center justify-center h-64 gap-4">
                    <div className="p-4 rounded-full bg-destructive/10 text-destructive">
                      <Sword className="h-12 w-12" />
                    </div>
                    <h2 className="text-2xl font-bold">{t('battle')}</h2>
                    <p className="text-muted-foreground text-center">
                      {t('battle_desc')}
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/leaderboard" className="w-full" onClick={() => playSE('se_click')}>
                <Card className="cursor-pointer hover:border-primary transition-colors h-full">
                  <CardContent className="flex flex-col items-center justify-center h-64 gap-4">
                    <div className="p-4 rounded-full bg-yellow-500/10 text-yellow-500">
                      <Trophy className="h-12 w-12" />
                    </div>
                    <h2 className="text-2xl font-bold">{t('leaderboard')}</h2>
                    <p className="text-muted-foreground text-center">
                      {t('leaderboard_desc')}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Login Bonus</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">Credits: {credits}</div>
                  <div className="text-sm text-muted-foreground">
                    Streak: {loginStreak ?? "-"}
                  </div>
                  <Button onClick={handleClaimLoginBonus} disabled={isClaimingLogin}>
                    {isClaimingLogin && <Loader2 className="h-4 w-4 animate-spin" />}
                    Claim bonus
                  </Button>
                  {loginError && <p className="text-sm text-destructive">{loginError}</p>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Daily Missions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {missionsLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading missions...
                    </div>
                  )}
                  {!missionsLoading && missions.length === 0 && (
                    <div className="text-sm text-muted-foreground">No missions yet.</div>
                  )}
                  {missions.map((mission) => {
                    const progress = mission.progress ?? 0;
                    const target = mission.target ?? 0;
                    const claimed = mission.claimed ?? false;
                    const canClaim = !claimed && target > 0 && progress >= target;
                    return (
                      <div key={mission.id} className="border rounded p-2 text-sm space-y-1">
                        <div className="font-medium">{mission.title ?? mission.id}</div>
                        <div className="text-muted-foreground">
                          Progress: {progress}/{target} • Reward: {mission.rewardCredits ?? 0} credits
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleClaimMission(mission.id)}
                          disabled={!canClaim || claimingMissionId === mission.id}
                        >
                          {claimingMissionId === mission.id && <Loader2 className="h-4 w-4 animate-spin" />}
                          {claimed ? "Claimed" : "Claim"}
                        </Button>
                      </div>
                    );
                  })}
                  {missionsError && <p className="text-sm text-destructive">{missionsError}</p>}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Follow</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={followTarget}
                    onChange={(event) => setFollowTarget(event.target.value)}
                    placeholder="Target UID"
                    className="border rounded px-3 py-2 bg-background text-sm flex-1"
                  />
                  <Button onClick={handleFollow} disabled={isFollowing || !followTarget.trim()}>
                    {isFollowing && <Loader2 className="h-4 w-4 animate-spin" />}
                    Follow
                  </Button>
                </div>
                {followError && <p className="text-sm text-destructive">{followError}</p>}
                <div className="text-sm text-muted-foreground">
                  Following: {following.length > 0 ? following.join(", ") : "None"}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {mode === 'scan' && (
          <div className="w-full max-w-md space-y-4">
            <Button variant="ghost" onClick={() => setMode('menu')}>
              ← {t('back_to_menu')}
            </Button>
            
            {isGenerating ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-64 gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p>{t('analyzing')}</p>
                  <p className="text-sm text-muted-foreground">{t('constructing')}</p>
                </CardContent>
              </Card>
            ) : (
              <BarcodeScanner onScanSuccess={handleScan} />
            )}
          </div>
        )}

        {mode === 'result' && robot && (
          <div className="w-full max-w-2xl space-y-4">
            <Button variant="ghost" onClick={() => setMode('menu')}>
              ← {t('back_to_menu')}
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Robot Visual */}
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="flex items-center justify-center p-8">
                  <RobotSVG 
                    parts={robot.parts} 
                    colors={robot.colors} 
                    size={300} 
                    className="drop-shadow-2xl"
                  />
                </CardContent>
              </Card>

              {/* Robot Stats */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold">{robot.name}</h2>
                  <div className="flex gap-2 mt-2">
                    <span className="px-2 py-1 rounded bg-primary/20 text-primary text-sm font-bold">
                      {robot.rarityName}
                    </span>
                    <span className="px-2 py-1 rounded bg-secondary text-secondary-foreground text-sm font-bold">
                      {t('level')} 1
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{t('hp')}</span>
                      <span>{robot.baseHp}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500" 
                        style={{ width: `${(robot.baseHp / 2000) * 100}%` }} 
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{t('attack')}</span>
                      <span>{robot.baseAttack}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500" 
                        style={{ width: `${(robot.baseAttack / 200) * 100}%` }} 
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{t('defense')}</span>
                      <span>{robot.baseDefense}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500" 
                        style={{ width: `${(robot.baseDefense / 200) * 100}%` }} 
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{t('speed')}</span>
                      <span>{robot.baseSpeed}</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-yellow-500" 
                        style={{ width: `${(robot.baseSpeed / 200) * 100}%` }} 
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1" size="lg" onClick={() => setMode('menu')}>
                    {t('save_return')}
                  </Button>
                  <ShareButton 
                    text={t('share_robot_text')
                      .replace('{name}', robot.name)
                      .replace('{rarity}', robot.rarityName)
                      .replace('{power}', String(robot.baseAttack + robot.baseDefense + robot.baseSpeed + robot.baseHp))}
                    variant="secondary"
                    size="lg"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
