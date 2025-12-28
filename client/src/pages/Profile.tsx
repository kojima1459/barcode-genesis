import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSound } from "@/contexts/SoundContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { ArrowLeft, Copy, Edit2, Save, User, Trophy, Sword, Shield } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import RobotSVG from "@/components/RobotSVG";
import { RobotData } from "@/types/shared";

interface UserProfile {
  displayName?: string;
  wins?: number;
  battles?: number;
}



export default function Profile() {
  const { t } = useLanguage();
  const { playSE } = useSound();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({});
  const [robots, setRobots] = useState<RobotData[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

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
        toast.error("Failed to load profile");
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
      toast.success("Profile updated");
      playSE('se_click');
    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile");
    }
  };

  const copyId = () => {
    if (user) {
      navigator.clipboard.writeText(user.uid);
      toast.success("ID copied to clipboard");
      playSE('se_click');
    }
  };

  // Calculate total stats
  const totalWins = robots.reduce((acc, r) => acc + (r.level ? Math.floor(r.level * 1.5) : 0), 0); // Mock calculation as wins are not stored on robot yet
  // Note: Real win count should be stored in user profile or aggregated from battle logs
  // For now, we use the profile.wins if available, otherwise 0
  const displayWins = profile.wins || 0;
  const displayBattles = profile.battles || 0;
  const winRate = displayBattles > 0 ? Math.round((displayWins / displayBattles) * 100) : 0;

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col">
      <header className="flex items-center mb-8 max-w-4xl mx-auto w-full">
        <Link href="/" onClick={() => playSE('se_click')}>
          <Button variant="ghost" className="mr-4">
            <ArrowLeft className="h-5 w-5 mr-2" />
            {t('back')}
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-primary">Profile</h1>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full space-y-8">
        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-6 w-6" />
              User Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
              {/* Avatar Placeholder */}
              <div className="w-32 h-32 rounded-full bg-secondary flex items-center justify-center text-4xl">
                👤
              </div>

              <div className="flex-1 space-y-4 w-full">
                {/* Name Edit */}
                <div className="flex items-center gap-4">
                  {isEditing ? (
                    <div className="flex gap-2 w-full max-w-sm">
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Enter name"
                      />
                      <Button size="icon" onClick={handleSaveName}>
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <h2 className="text-3xl font-bold">{profile.displayName || "No Name"}</h2>
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
                  <div className="text-center p-4 bg-secondary/10 rounded-lg">
                    <div className="text-2xl font-bold text-primary">{robots.length}</div>
                    <div className="text-xs text-muted-foreground">Robots</div>
                  </div>
                  <div className="text-center p-4 bg-secondary/10 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-500">{displayWins}</div>
                    <div className="text-xs text-muted-foreground">Wins</div>
                  </div>
                  <div className="text-center p-4 bg-secondary/10 rounded-lg">
                    <div className="text-2xl font-bold text-green-500">{winRate}%</div>
                    <div className="text-xs text-muted-foreground">Win Rate</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Strongest Robot */}
        {robots.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                Ace Robot
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
          </Card>
        )}
      </main>
    </div>
  );
}
