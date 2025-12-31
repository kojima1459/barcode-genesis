import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { collectionGroup, getDocs, query, orderBy, limit } from "firebase/firestore";
import { ArrowLeft, Trophy, Medal, Crown } from "lucide-react";
import { SystemSkeleton } from "@/components/ui/SystemSkeleton";
import { Link } from "wouter";
import RobotSVG from "@/components/RobotSVG";
import { useLanguage } from "@/contexts/LanguageContext";
import { Interactive } from "@/components/ui/interactive";

interface RobotData {
  id: string;
  name: string;
  baseHp: number;
  level?: number;
  wins?: number;
  userId?: string; // Note: This might not be directly on the doc unless we added it, but parent path has it
  parts: any;
  colors: any;
}

export default function Leaderboard() {
  const { t } = useLanguage();
  const [topRobots, setTopRobots] = useState<RobotData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // Query all robots ordered by wins descending
        const q = query(
          collectionGroup(db, "robots"),
          orderBy("wins", "desc"),
          limit(20)
        );

        const snapshot = await getDocs(q);
        const data: RobotData[] = [];

        snapshot.forEach(doc => {
          const robot = { id: doc.id, ...doc.data() } as RobotData;
          // Extract userId from reference path if not in data
          // Path: users/{userId}/robots/{robotId}
          if (!robot.userId) {
            const pathSegments = doc.ref.path.split('/');
            if (pathSegments.length >= 2) {
              robot.userId = pathSegments[1];
            }
          }
          data.push(robot);
        });

        setTopRobots(data);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown className="w-6 h-6 text-yellow-500" />;
      case 1: return <Medal className="w-6 h-6 text-gray-400" />;
      case 2: return <Medal className="w-6 h-6 text-amber-700" />;
      default: return <span className="font-bold text-muted-foreground w-6 text-center">{index + 1}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col pb-24">
      <header className="flex items-center mb-8 max-w-4xl mx-auto w-full">
        <Link href="/">
          <Button variant="ghost" className="mr-4">
            <ArrowLeft className="h-5 w-5 mr-2" />
            {t('back')}
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          {t('leaderboard')}
        </h1>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full">
        <Card>
          <CardHeader>
            <CardTitle>{t('top_players')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-4">
                <SystemSkeleton
                  className="w-full h-64 rounded-xl"
                  text="COMPILING HALL OF FAME..."
                  subtext="QUERYING GLOBAL UNIT STATISTICS"
                />
              </div>
            ) : topRobots.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                {t('no_opponents')}
              </div>
            ) : (
              <div className="space-y-2">
                {topRobots.map((robot, index) => (
                  <Interactive
                    key={robot.id}
                    className={`flex items-center p-4 rounded-lg border h-auto ${index < 3 ? 'bg-secondary/10 border-primary/20' : 'bg-card'}`}
                  >
                    <div className="flex items-center justify-center w-12 mr-4">
                      {getRankIcon(index)}
                    </div>

                    <div className="relative w-12 h-12 mr-4 flex-shrink-0">
                      <RobotSVG parts={robot.parts} colors={robot.colors} size={48} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold truncate">{robot.name}</span>
                        <span className="text-xs bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                          Lv.{robot.level || 1}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        Owner: <span className="font-mono">{robot.userId?.substring(0, 8)}...</span>
                      </div>
                    </div>

                    <div className="text-right ml-4">
                      <div className="font-bold text-lg text-primary">{robot.wins || 0}</div>
                      <div className="text-xs text-muted-foreground">{t('wins')}</div>
                    </div>
                  </Interactive>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
