import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { ArrowLeft, Loader2, Trash2, Filter, ArrowUpDown, Check, X } from "lucide-react";
import RobotSVG from "@/components/RobotSVG";
import { Link } from "wouter";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { RobotData } from "@/types/shared";
import SEO from "@/components/SEO";

type SortKey = 'createdAt' | 'baseAttack' | 'baseHp' | 'baseSpeed' | 'rarityName';
type SortOrder = 'asc' | 'desc';

const RARITY_ORDER: Record<string, number> = {
  'Common': 1,
  'Rare': 2,
  'Epic': 3,
  'Legendary': 4,
};

export default function Collection() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [robots, setRobots] = useState<RobotData[]>([]);
  const [loading, setLoading] = useState(true);

  // Sort & Filter State
  const [sortBy, setSortBy] = useState<SortKey>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterRarity, setFilterRarity] = useState<string | null>(null);

  // Selection Mode State
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDisassembling, setIsDisassembling] = useState(false);

  useEffect(() => {
    const fetchRobots = async () => {
      if (!user) return;

      try {
        const robotsRef = collection(db, "users", user.uid, "robots");
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

  // Filtered and Sorted Robots
  const displayedRobots = useMemo(() => {
    let result = [...robots];

    // Filter
    if (filterRarity) {
      result = result.filter(r => r.rarityName === filterRarity);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'createdAt') {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        comparison = aTime - bTime;
      } else if (sortBy === 'rarityName') {
        comparison = (RARITY_ORDER[a.rarityName] || 0) - (RARITY_ORDER[b.rarityName] || 0);
      } else {
        comparison = (a[sortBy] || 0) - (b[sortBy] || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [robots, sortBy, sortOrder, filterRarity]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDisassemble = async () => {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(`${selectedIds.size}体のロボットを分解してクレジットに変換しますか？この操作は取り消せません。`);
    if (!confirmed) return;

    setIsDisassembling(true);
    try {
      const batchDisassemble = httpsCallable(functions, 'batchDisassemble');
      const result = await batchDisassemble({ robotIds: Array.from(selectedIds) });
      const data = result.data as { creditsGained: number; robotsDeleted: number };

      toast.success(`${data.robotsDeleted}体を分解し、${data.creditsGained}クレジットを獲得しました！`);

      // Remove deleted robots from state
      setRobots(prev => prev.filter(r => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
      setIsSelectMode(false);
    } catch (error) {
      console.error("Disassemble failed:", error);
      toast.error("分解に失敗しました");
    } finally {
      setIsDisassembling(false);
    }
  };

  const cancelSelectMode = () => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const rarities = ['Common', 'Rare', 'Epic', 'Legendary'];

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col pb-24 relative overflow-hidden">
      <SEO
        title={t("seo_collection_title")}
        description={t("seo_collection_desc")}
      />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 pointer-events-none" />
      <header className="flex items-center mb-4 max-w-6xl mx-auto w-full flex-wrap gap-2">
        <Link href="/">
          <Button variant="ghost" className="mr-2">
            <ArrowLeft className="h-5 w-5 mr-2" />
            {t('back')}
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-primary">{t('collection')}</h1>
        <div className="ml-auto text-muted-foreground text-sm">
          {displayedRobots.length} / {robots.length} {t('total')}
        </div>
      </header>

      {/* Controls */}
      <div className="max-w-6xl mx-auto w-full mb-4 flex flex-wrap gap-2 items-center">
        {/* Sort */}
        <div className="flex items-center gap-1 text-sm">
          <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="bg-secondary border rounded px-2 py-1 text-sm"
          >
            <option value="createdAt">作成日</option>
            <option value="baseAttack">攻撃力</option>
            <option value="baseHp">HP</option>
            <option value="baseSpeed">スピード</option>
            <option value="rarityName">レア度</option>
          </select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
            className="px-2"
          >
            {sortOrder === 'desc' ? '降順' : '昇順'}
          </Button>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1 text-sm">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={filterRarity || ''}
            onChange={(e) => setFilterRarity(e.target.value || null)}
            className="bg-secondary border rounded px-2 py-1 text-sm"
          >
            <option value="">全レア度</option>
            {rarities.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Selection Mode Toggle */}
        <div className="ml-auto flex gap-2">
          {!isSelectMode ? (
            <Button variant="outline" size="sm" onClick={() => setIsSelectMode(true)}>
              <Trash2 className="w-4 h-4 mr-1" />
              一括分解
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={cancelSelectMode}>
                <X className="w-4 h-4 mr-1" />
                キャンセル
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisassemble}
                disabled={selectedIds.size === 0 || isDisassembling}
              >
                {isDisassembling ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
                分解 ({selectedIds.size})
              </Button>
            </>
          )}
        </div>
      </div>

      <main className="flex-1 max-w-6xl mx-auto w-full">
        {displayedRobots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p className="text-lg mb-4">{filterRarity ? `${filterRarity}のロボットがいません` : 'No robots found.'}</p>
            {!filterRarity && (
              <Link href="/scan">
                <Button>Scan your first barcode!</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {displayedRobots.map((robot) => (
              <Card
                key={robot.id}
                className={`overflow-hidden transition-all cursor-pointer group relative ${isSelectMode && selectedIds.has(robot.id)
                  ? 'ring-2 ring-primary border-primary'
                  : 'hover:border-primary'
                  }`}
                onClick={() => isSelectMode && toggleSelection(robot.id)}
              >
                {isSelectMode && (
                  <div className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedIds.has(robot.id) ? 'bg-primary border-primary' : 'bg-background border-muted-foreground'
                    }`}>
                    {selectedIds.has(robot.id) && <Check className="w-4 h-4 text-primary-foreground" />}
                  </div>
                )}
                <CardContent className="p-3">
                  <div className="aspect-square bg-secondary/20 rounded-lg mb-2 flex items-center justify-center">
                    <RobotSVG
                      parts={robot.parts}
                      colors={robot.colors}
                      size={100}
                    />
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-sm truncate">{robot.name}</h3>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Lv.{robot.level || 1}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${robot.rarityName === 'Legendary' ? 'bg-yellow-500/20 text-yellow-500' :
                        robot.rarityName === 'Epic' ? 'bg-purple-500/20 text-purple-500' :
                          robot.rarityName === 'Rare' ? 'bg-blue-500/20 text-blue-500' :
                            'bg-gray-500/20 text-gray-400'
                        }`}>
                        {robot.rarityName}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      HP {robot.baseHp} / ATK {robot.baseAttack}
                    </div>

                    {!isSelectMode && (
                      <Link href={`/robots/${robot.id}`} className="block mt-2">
                        <Button variant="secondary" size="sm" className="w-full text-xs">
                          詳細
                        </Button>
                      </Link>
                    )}
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

