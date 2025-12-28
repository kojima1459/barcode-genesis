import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { Loader2, LogOut, Scan, Sword, Trophy } from "lucide-react";
import BarcodeScanner from "@/components/BarcodeScanner";
import RobotSVG from "@/components/RobotSVG";
import { toast } from "sonner";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ShareButton from "@/components/ShareButton";
import TutorialModal from "@/components/TutorialModal";

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

export default function Home() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const [mode, setMode] = useState<'menu' | 'scan' | 'result'>('menu');
  const [isGenerating, setIsGenerating] = useState(false);
  const [robot, setRobot] = useState<RobotData | null>(null);

  const handleScan = async (barcode: string) => {
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

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-primary">{t('app_title')}</h1>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <span className="text-sm text-muted-foreground hidden sm:inline">
            {user?.email}
          </span>
          <Button variant="ghost" size="icon" onClick={() => logout()}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-8 max-w-4xl mx-auto w-full">
        <TutorialModal />
        
        {mode === 'menu' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
            <Card 
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setMode('scan')}
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

            <Link href="/collection" className="w-full">
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

            <Link href="/battle" className="w-full">
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

            <Link href="/leaderboard" className="w-full">
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
