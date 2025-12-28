import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import RobotSVG from "@/components/RobotSVG";
import { Link } from "wouter";
import { toast } from "sonner";

// 型定義（Home.tsxと共通化すべきだが、一旦ここで定義）
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
  createdAt?: any;
}

export default function Collection() {
  const { user } = useAuth();
  const [robots, setRobots] = useState<RobotData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRobots = async () => {
      if (!user) return;

      try {
        const robotsRef = collection(db, "users", user.uid, "robots");
        // 作成日時の降順で取得（新しい順）
        const q = query(robotsRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        const robotsData: RobotData[] = [];
        querySnapshot.forEach((doc) => {
          robotsData.push({ id: doc.id, ...doc.data() } as RobotData);
        });
        
        setRobots(robotsData);
      } catch (error) {
        console.error("Error fetching robots:", error);
        toast.error("Failed to load your robot collection");
      } finally {
        setLoading(false);
      }
    };

    fetchRobots();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col">
      <header className="flex items-center mb-8 max-w-6xl mx-auto w-full">
        <Link href="/">
          <Button variant="ghost" className="mr-4">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-primary">My Robot Collection</h1>
        <div className="ml-auto text-muted-foreground">
          {robots.length} Robots
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full">
        {robots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p className="text-lg mb-4">No robots found.</p>
            <Link href="/">
              <Button>Scan your first barcode!</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {robots.map((robot) => (
              <Card key={robot.id} className="overflow-hidden hover:border-primary transition-colors group">
                <CardContent className="p-4">
                  <div className="aspect-square bg-secondary/20 rounded-lg mb-4 flex items-center justify-center relative">
                    <RobotSVG 
                      parts={robot.parts} 
                      colors={robot.colors} 
                      size={150} 
                    />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* 将来的に削除機能などを追加 */}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold truncate pr-2">{robot.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium whitespace-nowrap">
                        {robot.rarityName}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>HP</span>
                        <span className="font-mono text-foreground">{robot.baseHp}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ATK</span>
                        <span className="font-mono text-foreground">{robot.baseAttack}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>DEF</span>
                        <span className="font-mono text-foreground">{robot.baseDefense}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SPD</span>
                        <span className="font-mono text-foreground">{robot.baseSpeed}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
