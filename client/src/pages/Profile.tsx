import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSound } from "@/contexts/SoundContext";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ArrowLeft, Copy, Edit2, Save, User, Trophy, Sword, Shield, LogOut, Camera, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import RobotSVG from "@/components/RobotSVG";
import { RobotData } from "@/types/shared";
import { Interactive } from "@/components/ui/interactive";
import { SystemSkeleton } from "@/components/ui/SystemSkeleton";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { SoundSettings } from "@/components/SoundSettings";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Crown, Settings } from "lucide-react";
import { GlobalHeader } from "@/components/GlobalHeader";

interface UserProfile {
  displayName?: string;
  photoURL?: string;
  wins?: number;
  battles?: number;
  level?: number;
  xp?: number;
  workshopLines?: number;
}

export default function Profile() {
  const { t } = useLanguage();
  const { playSE } = useSound();
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<UserProfile>({});
  const [robots, setRobots] = useState<RobotData[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        // Fetch user profile
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfile(data);
          setNewName(data.displayName || "");
        }

        // Fetch user robots for stats
        const q = query(collection(db, "users", user.uid, "robots"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const robotData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RobotData));
        setRobots(robotData);
      } catch (error) {
        console.error(error);
        toast.error(t('error'));
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  const handleSaveName = async () => {
    if (!user || !newName.trim()) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName: newName.trim()
      });
      setProfile(prev => ({ ...prev, displayName: newName.trim() }));
      setIsEditing(false);
      toast.success(t('success'));
      playSE('se_click');
    } catch (error) {
      console.error(error);
      toast.error(t('error'));
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error("Image too large (max 5MB)");
      return;
    }

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `users/${user.uid}/avatar`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      await updateDoc(doc(db, "users", user.uid), {
        photoURL: downloadURL
      });

      setProfile(prev => ({ ...prev, photoURL: downloadURL }));
      toast.success(t('upload_photo_success'));
      playSE('se_click');
    } catch (error) {
      console.error("Avatar upload failed:", error);
      toast.error(t('upload_photo_failed'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      setLocation("/");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Failed to logout");
    }
  };

  const copyId = () => {
    if (user) {
      navigator.clipboard.writeText(user.uid);
      toast.success(t('copied_to_clipboard'));
      playSE('se_click');
    }
  };

  // Calculate total stats
  const totalWins = robots.reduce((acc, r) => acc + (r.level ? Math.floor(r.level * 1.5) : 0), 0);
  const displayWins = profile.wins || 0;
  const displayBattles = profile.battles || 0;
  const winRate = displayBattles > 0 ? Math.round((displayWins / displayBattles) * 100) : 0;

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8">
      <SystemSkeleton
        className="w-full max-w-2xl h-64 rounded-3xl"
        text="RETRIEVING PROFILE..."
        subtext="ACCESSING USER CLEARANCE LEVEL"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg text-text pb-24 flex flex-col relative overflow-hidden">
      {/* Global Header */}
      <GlobalHeader />

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 relative z-10 space-y-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold font-orbitron text-primary">{t('profile_title')}</h1>
        </div>

        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-6 w-6" />
              {t('user_profile')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
              {/* Avatar Upload */}
              <div
                className="relative group cursor-pointer"
                onClick={handleAvatarClick}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />

                <div className="w-32 h-32 rounded-full bg-secondary flex items-center justify-center text-4xl overflow-hidden border-2 border-secondary group-hover:border-primary transition-colors relative">
                  {profile.photoURL ? (
                    <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    "👤"
                  )}

                  {/* Overlay for hover/uploading */}
                  <div className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${isUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    ) : (
                      <Camera className="w-8 h-8 text-white" />
                    )}
                  </div>
                </div>
                <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-1.5 rounded-full shadow-lg">
                  <Edit2 className="w-3 h-3" />
                </div>
              </div>

              <div className="flex-1 space-y-4 w-full">
                {/* Name Edit */}
                <div className="flex items-center gap-4">
                  {isEditing ? (
                    <div className="flex gap-2 w-full max-w-sm">
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder={t('edit_name_placeholder')}
                      />
                      <Button size="icon" onClick={handleSaveName}>
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <h2 className="text-3xl font-bold">{profile.displayName || t('name_no_name')}</h2>
                      <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* ID Copy */}
                <div className="flex items-center gap-2 text-muted-foreground bg-secondary/20 p-2 rounded w-fit">
                  <span className="text-xs font-mono">ID: {user?.uid}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyId}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 pt-4">
                  <Interactive className="text-center p-4 bg-secondary/10 rounded-lg h-auto">
                    <div className="text-2xl font-bold text-primary">{robots.length}</div>
                    <div className="text-xs text-muted-foreground">{t('robots_count')}</div>
                  </Interactive>
                  <Interactive className="text-center p-4 bg-secondary/10 rounded-lg h-auto">
                    <div className="text-2xl font-bold text-yellow-500">{displayWins}</div>
                    <div className="text-xs text-muted-foreground">{t('wins_count')}</div>
                  </Interactive>
                  <Interactive className="text-center p-4 bg-secondary/10 rounded-lg h-auto">
                    <div className="text-2xl font-bold text-green-500">{winRate}%</div>
                    <div className="text-xs text-muted-foreground">{t('win_rate')}</div>
                  </Interactive>
                </div>

                {/* Level / XP / Lines */}
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <Interactive className="text-center p-4 bg-secondary/10 rounded-lg h-auto">
                    <div className="text-2xl font-bold text-blue-500">{profile.level || 1}</div>
                    <div className="text-xs text-muted-foreground">{t('level_label')}</div>
                  </Interactive>
                  <Interactive className="text-center p-4 bg-secondary/10 rounded-lg h-auto">
                    <div className="text-2xl font-bold text-purple-500">{profile.xp || 0}</div>
                    <div className="text-xs text-muted-foreground">{t('xp_label')}</div>
                  </Interactive>
                  <Interactive className="text-center p-4 bg-secondary/10 rounded-lg h-auto">
                    <div className="text-2xl font-bold text-orange-500">{profile.workshopLines || 1}</div>
                    <div className="text-xs text-muted-foreground">{t('factory_lines')}</div>
                  </Interactive>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Strongest Robot */}
        {robots.length > 0 && (
          <Interactive className="h-auto overflow-hidden rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                {t('ace_robot')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-8">
                <div className="w-32 h-32 bg-secondary/20 rounded-lg flex items-center justify-center">
                  <RobotSVG
                    parts={robots[0].parts}
                    colors={robots[0].colors}
                    size={100}
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{robots[0].name}</h3>
                  <div className="flex gap-2 mt-2">
                    <span className="px-2 py-1 rounded bg-primary/20 text-primary text-xs font-bold">
                      {robots[0].rarityName}
                    </span>
                    <span className="px-2 py-1 rounded bg-secondary text-secondary-foreground text-xs font-bold">
                      Lv.{robots[0].level || 1}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Sword className="h-4 w-4" /> {robots[0].baseAttack}
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield className="h-4 w-4" /> {robots[0].baseDefense}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Interactive>
        )}

        {/* Settings & Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ⚙️ {t('settings_info')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/guide">
              <Button variant="ghost" className="w-full justify-start gap-3">
                📖 {t('how_to_play_guide')}
              </Button>
            </Link>
            <Link href="/premium">
              <Button variant="ghost" className="w-full justify-start gap-3">
                💎 {t('premium_subscription')}
              </Button>
            </Link>
            <div className="border-t my-2" />
            <Link href="/privacy">
              <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground text-sm">
                プライバシーポリシー
              </Button>
            </Link>
            <Link href="/terms">
              <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground text-sm">
                利用規約
              </Button>
            </Link>
            <Link href="/law">
              <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground text-sm">
                特定商取引法に基づく表記
              </Button>
            </Link>
            <div className="border-t my-2" />
            <Button
              variant="outline"
              className="w-full justify-start gap-3 text-red-400 hover:text-red-500 hover:bg-red-950/20 border-red-900/30"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              {t('logout')}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
