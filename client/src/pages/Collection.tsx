import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { getDb } from "@/lib/firebase";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { ArrowLeft, Loader2, Filter } from "lucide-react";
import RobotSVG from "@/components/RobotSVG";
import { Link } from "wouter";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { RobotData } from "@/types/shared";
import SEO from "@/components/SEO";
import { Interactive } from "@/components/ui/interactive";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { SystemSkeleton } from "@/components/ui/SystemSkeleton";
import LazyRender from "@/components/LazyRender";

// Constants for 図鑑
const FAMILY_NAMES = ["DRINK", "SNACK", "DAILY", "BEAUTY", "OTHER"];
const RARITY_NAMES = ["N", "R", "SR", "UR"];
const SLOTS_PER_COMBO = 20;
const TOTAL_SLOTS = FAMILY_NAMES.length * RARITY_NAMES.length * SLOTS_PER_COMBO; // 400

// Helper functions to compute family/slot from barcode (backward compat)
const getFamilyFromBarcode = (barcode: string): number => {
  const d0 = parseInt(barcode[0], 10) || 0;
  const d1 = parseInt(barcode[1], 10) || 0;
  return ((d0 + d1) % 5) + 1;
};

const getSlotFromBarcode = (barcode: string): number => {
  const d9 = parseInt(barcode[9], 10) || 0;
  const d10 = parseInt(barcode[10], 10) || 0;
  const d11 = parseInt(barcode[11], 10) || 0;
  const d12 = parseInt(barcode[12], 10) || 0;
  const seed = d9 * 1000 + d10 * 100 + d11 * 10 + d12;
  return seed % 20;
};

// Map rarity number (1-4) to index (0-3), or legacy rarityName
const getRarityIndex = (robot: RobotData): number => {
  if (typeof robot.rarity === 'number' && robot.rarity >= 1 && robot.rarity <= 4) {
    return robot.rarity - 1;
  }
  // Legacy mapping
  const legacyMap: Record<string, number> = {
    'ノーマル': 0, 'Common': 0,
    'レア': 1, 'Rare': 1,
    'スーパーレア': 2, 'Epic': 2,
    'ウルトラレア': 3, 'Legendary': 3,
  };
  return legacyMap[robot.rarityName] ?? 0;
};

interface SlotInfo {
  familyIndex: number;
  rarityIndex: number;
  slot: number;
  robot: RobotData | null;
}

export default function Collection() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [robots, setRobots] = useState<RobotData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [selectedFamily, setSelectedFamily] = useState<number>(0); // 0 = ALL, 1-5 = specific
  const [selectedRarity, setSelectedRarity] = useState<number | null>(null); // null = ALL

  useEffect(() => {
    const fetchRobots = async () => {
      if (!user) return;

      try {
        const robotsRef = collection(getDb(), "users", user.uid, "robots");
        const q = query(robotsRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        const robotsData: RobotData[] = [];
        querySnapshot.forEach((doc) => {
          robotsData.push({ id: doc.id, ...doc.data() } as RobotData);
        });

        setRobots(robotsData);
      } catch (error) {
        console.error("Error fetching robots:", error);
        toast.error(t('failed_load_collection'));
      } finally {
        setLoading(false);
      }
    };

    fetchRobots();
  }, [user]);

  // Build slot map: key = "familyIndex-rarityIndex-slot" -> representative robot
  const slotMap = useMemo(() => {
    const map = new Map<string, RobotData>();

    for (const robot of robots) {
      const barcode = robot.sourceBarcode || robot.id;
      const familyIndex = (robot.family ?? getFamilyFromBarcode(barcode)) - 1;
      const rarityIndex = getRarityIndex(robot);
      const slot = robot.slot ?? getSlotFromBarcode(barcode);

      const key = `${familyIndex}-${rarityIndex}-${slot}`;

      // Keep the most recent one (robots are already sorted by createdAt desc)
      if (!map.has(key)) {
        map.set(key, robot);
      }
    }

    return map;
  }, [robots]);

  // Calculate discovered count
  const discoveredCount = slotMap.size;
  const progressPercent = Math.round((discoveredCount / TOTAL_SLOTS) * 100);

  // Generate slots for display based on filters
  const displaySlots = useMemo(() => {
    const slots: SlotInfo[] = [];

    const familyRange = selectedFamily === 0
      ? [0, 1, 2, 3, 4]
      : [selectedFamily - 1];

    const rarityRange = selectedRarity === null
      ? [0, 1, 2, 3]
      : [selectedRarity];

    for (const fi of familyRange) {
      for (const ri of rarityRange) {
        for (let s = 0; s < SLOTS_PER_COMBO; s++) {
          const key = `${fi}-${ri}-${s}`;
          slots.push({
            familyIndex: fi,
            rarityIndex: ri,
            slot: s,
            robot: slotMap.get(key) || null,
          });
        }
      }
    }

    return slots;
  }, [slotMap, selectedFamily, selectedRarity]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <SystemSkeleton
          className="w-full max-w-2xl aspect-square rounded-3xl"
          text="ACCESSING ENCYCLOPEDIA..."
          subtext="DOWNLOADING UNIT ARCHIVES FROM SERVER"
        />
      </div>
    );
  }

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
        <h1 className="text-2xl font-bold text-primary">図鑑</h1>
      </header>

      {/* Progress Bar */}
      <div className="max-w-6xl mx-auto w-full mb-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
          <span>発見済み</span>
          <span>{discoveredCount} / {TOTAL_SLOTS} ({progressPercent}%)</span>
        </div>
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-cyan-500 to-blue-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-6xl mx-auto w-full mb-4 flex flex-wrap gap-2 items-center">
        {/* Family Tabs */}
        <div className="flex gap-1 flex-wrap">
          <Button
            variant={selectedFamily === 0 ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedFamily(0)}
          >
            ALL
          </Button>
          {FAMILY_NAMES.map((name, i) => (
            <Button
              key={name}
              variant={selectedFamily === i + 1 ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFamily(i + 1)}
            >
              {name}
            </Button>
          ))}
        </div>

        {/* Rarity Filter */}
        <div className="flex items-center gap-1 text-sm ml-auto">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={selectedRarity ?? ''}
            onChange={(e) => setSelectedRarity(e.target.value === '' ? null : parseInt(e.target.value, 10))}
            className="bg-secondary border rounded px-2 py-1 text-sm"
          >
            <option value="">全レア度</option>
            {RARITY_NAMES.map((name, i) => (
              <option key={name} value={i}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Slot Grid */}
      <main className="flex-1 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {displaySlots.map((slotInfo, idx) => (
            <LazyRender key={`${slotInfo.familyIndex}-${slotInfo.rarityIndex}-${slotInfo.slot}-${idx}`} minHeight="100px">
              <Interactive
                className={`overflow-hidden transition-all h-auto ${slotInfo.robot
                  ? 'cursor-pointer hover:border-neon-cyan/50 bg-black/30 border-white/10'
                  : 'opacity-40 bg-black/10 border-white/5'
                  }`}
                disabled={!slotInfo.robot}
              >
                <CardContent className="p-2">
                  {slotInfo.robot ? (
                    <Link href={`/robots/${slotInfo.robot.id}`}>
                      <div className="aspect-square bg-black/40 rounded flex items-center justify-center mb-1 border border-white/5">
                        <RobotSVG
                          parts={slotInfo.robot.parts}
                          colors={slotInfo.robot.colors}
                          size={64}
                          animate={false}
                          simplified={true}
                        />
                      </div>
                      <div className="text-[10px] truncate text-center font-bold text-white/90">
                        {slotInfo.robot.name}
                      </div>
                      <div className="text-[8px] text-neon-cyan/70 text-center font-bold font-mono">
                        {RARITY_NAMES[slotInfo.rarityIndex]}
                      </div>
                    </Link>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="aspect-square w-full bg-black/20 rounded flex items-center justify-center mb-1 border border-white/5 border-dashed">
                        <span className="text-xl text-white/10">?</span>
                      </div>
                      <div className="text-[10px] text-white/20 text-center font-mono">
                        ???
                      </div>
                      <div className="text-[8px] text-white/10 text-center font-mono">
                        {RARITY_NAMES[slotInfo.rarityIndex]}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Interactive>
            </LazyRender>
          ))}
        </div>
      </main>
    </div>
  );
}
