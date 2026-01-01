import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSound } from "@/contexts/SoundContext";
import { db, storage } from "@/lib/firebase";
// [REFACTOR 1.3] Removed unused import: getDoc
import { doc, updateDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
// [REFACTOR 1.3] Removed unused imports: ArrowLeft
import { Copy, Edit2, Save, User, Trophy, Sword, Shield, LogOut, Camera, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import RobotSVG from "@/components/RobotSVG";
import { RobotData } from "@/types/shared";
import { Interactive } from "@/components/ui/interactive";
import { SystemSkeleton } from "@/components/ui/SystemSkeleton";
// [REFACTOR 1.3] Removed unused imports: ThemeSwitcher, SoundSettings, LanguageSwitcher, Crown, Settings
import { GlobalHeader } from "@/components/GlobalHeader";
import { useUserData } from "@/hooks/useUserData";
// [REFACTOR 1.1] Import compressImage and validation from imageUtils
import { compressImage, validateImageFile } from "@/lib/imageUtils";

// [REFACTOR 3.1] Constants for name validation
const MAX_NAME_LENGTH = 20;
const NAME_PATTERN = /^[\p{L}\p{N}\s\-_]+$/u; // Letters, numbers, spaces, hyphens, underscores

// [REFACTOR 1.4] Removed unused interface: UserProfile

export default function Profile() {
  const { t } = useLanguage();
  const { playSE } = useSound();
  const { user, logout } = useAuth();
  const { userData, loading: userDataLoading } = useUserData();
  const [, setLocation] = useLocation();
  const [robots, setRobots] = useState<RobotData[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userData) {
      setNewName(userData.displayName || "");
    }
  }, [userData]);

  useEffect(() => {
    const fetchRobots = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, "users", user.uid, "robots"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        const robotData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RobotData));
        setRobots(robotData);
      } catch (error) {
        console.error(error);
        toast.error(t('error'));
      }
    };
    fetchRobots();
  }, [user]);

  const handleSaveName = async () => {
    if (!user || !newName.trim()) return;

    // [REFACTOR 3.1] Name validation - length check
    const trimmedName = newName.trim();
    if (trimmedName.length > MAX_NAME_LENGTH) {
      toast.error(`名前は${MAX_NAME_LENGTH}文字以内にしてください`);
      return;
    }

    // [REFACTOR 3.1] Name validation - character check
    if (!NAME_PATTERN.test(trimmedName)) {
      toast.error("名前に使用できない文字が含まれています");
      return;
    }

    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName: trimmedName
      });
      // useUserData will auto-update
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

  // [REFACTOR 1.1] compressImage function moved to lib/imageUtils.ts

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];

    // [REFACTOR 2.2] File validation (size and type check)
    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid file");
      return;
    }

    setIsUploading(true);
    try {
      // Compress image before upload
      // [REFACTOR 1.1] Using imported compressImage from imageUtils
      const compressedBlob = await compressImage(file);
      // [REFACTOR 3.3] Removed console.log in production - compression info

      const storageRef = ref(storage, `users/${user.uid}/avatar`);
      await uploadBytes(storageRef, compressedBlob);
      const downloadURL = await getDownloadURL(storageRef);

      await updateDoc(doc(db, "users", user.uid), {
        photoURL: downloadURL
      });

      // useUserData will auto-update
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

  // [REFACTOR 2.3] Added error handling for clipboard API
  const copyId = async () => {
    if (!user) return;
    try {
      await navigator.clipboard.writeText(user.uid);
      toast.success(t('copied_to_clipboard'));
      playSE('se_click');
    } catch (error) {
      console.error("Clipboard copy failed:", error);
      toast.error("クリップボードへのコピーに失敗しました");
    }
  };

  // Calculate display stats
  // [REFACTOR 5.3] Removed unused totalWins calculation
  const displayWins = userData?.wins || 0;
  const displayBattles = userData?.battles || 0;
  const winRate = displayBattles > 0 ? Math.round((displayWins / displayBattles) * 100) : 0;

  if (userDataLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8">
      <SystemSkeleton
        className="w-full max-w-2xl h-64 rounded-3xl"
        text="RETRIEVING PROFILE..."
        subtext="ACCESSING USER CLEARANCE LEVEL"
      />
    </div>
  );

  return (
    <div className="flex-1 flex flex-col relative pb-32 md:pb-8 bg-background text-foreground overflow-hidden">
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
                  {userData?.photoURL ? (
                    <img src={userData.photoURL} alt="Profile" className="w-full h-full object-cover" />
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
                      <h2 className="text-3xl font-bold">{userData?.displayName || t('name_no_name')}</h2>
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
                    <div className="text-2xl font-bold text-blue-500">{userData?.level || 1}</div>
                    <div className="text-xs text-muted-foreground">{t('level_label')}</div>
                  </Interactive>
                  <Interactive className="text-center p-4 bg-secondary/10 rounded-lg h-auto">
                    <div className="text-2xl font-bold text-purple-500">{userData?.xp || 0}</div>
                    <div className="text-xs text-muted-foreground">{t('xp_label')}</div>
                  </Interactive>
                  <Interactive className="text-center p-4 bg-secondary/10 rounded-lg h-auto">
                    <div className="text-2xl font-bold text-orange-500">{userData?.workshopLines || 1}</div>
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
