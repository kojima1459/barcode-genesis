import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Loader2, Zap, Cpu, Calendar, Barcode, Trophy, Skull } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import RobotSVG from "@/components/RobotSVG";
import { useAuth } from "@/contexts/AuthContext";
import { getItemLabel } from "@/lib/items";
import { toast } from "sonner";
import { RobotData, VariantData } from "@/types/shared";
import { useUserData } from "@/hooks/useUserData";
import { useSound } from "@/contexts/SoundContext";
import { useLanguage } from "@/contexts/LanguageContext";
import SEO from "@/components/SEO";
import ShareCardModal from "@/components/ShareCardModal";
import EvolutionModal from "@/components/EvolutionModal";
import { useRobotFx } from "@/hooks/useRobotFx";
import { Interactive } from "@/components/ui/interactive";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { SystemSkeleton } from "@/components/ui/SystemSkeleton";


type InventoryMap = Record<string, number>;

const getSkillIds = (skills?: RobotData["skills"]) => {
  if (!Array.isArray(skills)) return [];
  const ids = new Set<string>();
  for (const skill of skills) {
    if (typeof skill === "string") {
      ids.add(skill);
      continue;
    }
    if (skill && typeof skill === "object" && typeof skill.id === "string") {
      ids.add(skill.id);
    }
  }
  return Array.from(ids);
};

// Calculate level info from robot data
const getLevelInfo = (robot: RobotData) => {
  const level = robot.level || 1;
  const xp = robot.xp || 0;
  // Simple level progression: each level requires level * 100 XP
  const currentLevelXp = (level - 1) * 100;
  const nextLevelXp = level * 100;
  const xpInCurrentLevel = xp - currentLevelXp;
  const xpNeededForNextLevel = nextLevelXp - currentLevelXp;
  const progress = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNextLevel) * 100));
  return { level, nextLevelExp: nextLevelXp, progress };
};

const formatCreatedAt = (createdAt: unknown, fallback: string) => {
  if (createdAt && typeof createdAt === "object") {
    const withToDate = createdAt as { toDate?: () => Date };
    if (typeof withToDate.toDate === "function") {
      return withToDate.toDate().toLocaleDateString("ja-JP");
    }
    const withSeconds = createdAt as { seconds?: number };
    if (typeof withSeconds.seconds === "number") {
      return new Date(withSeconds.seconds * 1000).toLocaleDateString("ja-JP");
    }
  }
  return fallback;
};

export default function RobotDetail({ robotId }: { robotId: string }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { playSE } = useSound();
  const { fx, trigger } = useRobotFx();
  const [baseRobot, setBaseRobot] = useState<RobotData | null>(null);
  const [robots, setRobots] = useState<RobotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [synthesizeError, setSynthesizeError] = useState<string | null>(null);
  const [inheritError, setInheritError] = useState<string | null>(null);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [inheritMaterialId, setInheritMaterialId] = useState("");
  const [inheritSkillId, setInheritSkillId] = useState("");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isInheriting, setIsInheriting] = useState(false);
  const [inventory, setInventory] = useState<InventoryMap>({});
  const [equipSelection, setEquipSelection] = useState<{ slot1: string; slot2: string }>({
    slot1: "",
    slot2: ""
  });
  const [equipError, setEquipError] = useState<string | null>(null);
  const [equippingSlot, setEquippingSlot] = useState<"slot1" | "slot2" | null>(null);
  const [upgradeItemId, setUpgradeItemId] = useState("");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [cosmeticItemId, setCosmeticItemId] = useState("");
  const [isApplyingCosmetic, setIsApplyingCosmetic] = useState(false);
  const [cosmeticError, setCosmeticError] = useState<string | null>(null);
  const [isEvolutionModalOpen, setIsEvolutionModalOpen] = useState(false);
  const [Recharts, setRecharts] = useState<null | typeof import("recharts")>(null);

  // Variant creation state
  const [variantPartnerId, setVariantPartnerId] = useState("");
  const [variantName, setVariantName] = useState("");
  const [isCreatingVariant, setIsCreatingVariant] = useState(false);
  const [variants, setVariants] = useState<VariantData[]>([]);
  const { workshopLines: userLimit } = useUserData();

  // Battle history state
  const [battleHistory, setBattleHistory] = useState<Array<{
    id: string;
    opponentName: string;
    won: boolean;
    date: Date;
  }>>([]);

  useEffect(() => {
    let active = true;
    import("recharts")
      .then((mod) => {
        if (active) setRecharts(mod);
      })
      .catch(() => {
        if (active) setRecharts(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setBaseRobot(null);
      setRobots([]);
      return;
    }

    const loadRobots = async () => {
      setLoading(true);
      try {
        const [{ collection, doc, getDoc, getDocs, orderBy, query }, { getDb }] = await Promise.all([
          import("firebase/firestore"),
          import("@/lib/firebase"),
        ]);
        const db = getDb();
        const baseRef = doc(db, "users", user.uid, "robots", robotId);
        const baseSnap = await getDoc(baseRef);
        if (!baseSnap.exists()) {
          setBaseRobot(null);
          return;
        }

        const robotsRef = collection(db, "users", user.uid, "robots");
        const robotsQuery = query(robotsRef, orderBy("createdAt", "desc"));
        const robotsSnap = await getDocs(robotsQuery);
        const robotsData = robotsSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as RobotData));

        const inventorySnap = await getDocs(collection(db, "users", user.uid, "inventory"));
        const inventoryData: InventoryMap = {};
        inventorySnap.forEach((itemDoc) => {
          const data = itemDoc.data();
          if (typeof data.qty === "number") {
            inventoryData[itemDoc.id] = data.qty;
          }
        });

        setBaseRobot({ id: baseSnap.id, ...baseSnap.data() } as RobotData);
        setRobots(robotsData);
        setInventory(inventoryData);

        // Fetch variants for capacity check
        try {
          const variantsQuery = query(collection(db, "users", user.uid, "variants"), orderBy("createdAt", "desc"));
          const variantSnap = await getDocs(variantsQuery);
          setVariants(variantSnap.docs.map(d => ({ id: d.id, ...d.data() } as VariantData)));
        } catch (variantError) {
          console.warn("Could not fetch variants:", variantError);
        }

        // Fetch battle history (from user's battle_logs subcollection if exists)
        try {
          const battleLogsRef = collection(db, "users", user.uid, "battle_logs");
          const battleLogsQuery = query(battleLogsRef, orderBy("createdAt", "desc"));
          const battleLogsSnap = await getDocs(battleLogsQuery);
          const relevantBattles: Array<{ id: string; opponentName: string; won: boolean; date: Date }> = [];

          battleLogsSnap.docs.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.robotId === robotId || data.playerRobotId === robotId) {
              relevantBattles.push({
                id: docSnap.id,
                opponentName: data.opponentRobotName || data.opponentName || t('label_unknown'),
                won: data.won ?? data.winnerId === robotId,
                date: data.createdAt?.toDate?.() || new Date(),
              });
            }
          });

          setBattleHistory(relevantBattles.slice(0, 5));
        } catch (historyError) {
          console.warn("Could not fetch battle history:", historyError);
          // Non-critical error, continue without history
        }
      } catch (error) {
        console.error("Failed to load robot detail:", error);
        toast.error(t('failed_load_robot_detail'));
      } finally {
        setLoading(false);
      }
    };

    loadRobots();
  }, [robotId, user]);

  const materialRobots = useMemo(() => robots.filter((robot) => robot.id !== baseRobot?.id), [robots, baseRobot?.id]);
  const baseSkillIds = useMemo(() => getSkillIds(baseRobot?.skills), [baseRobot]);
  const inheritMaterial = materialRobots.find((robot) => robot.id === inheritMaterialId) || null;
  const inheritSkillOptions = useMemo(() => getSkillIds(inheritMaterial?.skills), [inheritMaterial]);
  const equipped = baseRobot?.equipped ?? {};
  const inventoryOptions = useMemo(
    () => Object.entries(inventory).filter(([, qty]) => qty > 0),
    [inventory]
  );

  const toggleMaterial = (id: string) => {
    setSelectedMaterials((prev) => {
      if (prev.includes(id)) {
        return prev.filter((materialId) => materialId !== id);
      }
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  };

  const getCallable = async (name: string) => {
    const [{ httpsCallable }, { getFunctions }] = await Promise.all([
      import("firebase/functions"),
      import("@/lib/firebase"),
    ]);
    return httpsCallable(getFunctions(), name);
  };

  const handleSynthesize = async () => {
    if (!baseRobot) return;
    setSynthesizeError(null);
    setIsSynthesizing(true);
    try {
      const synthesize = await getCallable("synthesizeRobots");
      const result = await synthesize({ baseRobotId: baseRobot.id, materialRobotIds: selectedMaterials });
      const data = result.data as { baseRobotId: string; newLevel: number; newXp: number };

      setBaseRobot((prev) =>
        prev ? { ...prev, level: data.newLevel, xp: data.newXp } : prev
      );

      const removed = new Set(selectedMaterials);
      setRobots((prev) => prev.filter((robot) => !removed.has(robot.id)));
      setSelectedMaterials([]);
      if (removed.has(inheritMaterialId)) {
        setInheritMaterialId("");
        setInheritSkillId("");
      }
      toast.success("Synthesis completed");
      playSE('se_levelup');
    } catch (error) {
      console.error("Synthesis failed:", error);
      const message = error instanceof Error ? error.message : "Synthesis failed";
      setSynthesizeError(message);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleInherit = async () => {
    if (!baseRobot) return;
    setInheritError(null);
    setIsInheriting(true);
    try {
      const inherit = await getCallable("inheritSkill");
      const result = await inherit({
        baseRobotId: baseRobot.id,
        materialRobotId: inheritMaterialId,
        skillId: inheritSkillId
      });
      const data = result.data as { success: boolean; baseSkills: string[] };

      setBaseRobot((prev) => (prev ? { ...prev, skills: data.baseSkills } : prev));
      if (data.success) {
        toast.success("Inheritance succeeded");
        playSE('se_levelup');
      } else {
        toast.error("Inheritance failed");
      }
    } catch (error) {
      console.error("Inheritance failed:", error);
      const message = error instanceof Error ? error.message : "Inheritance failed";
      setInheritError(message);
    } finally {
      setIsInheriting(false);
    }
  };

  const handleEquip = async (slot: "slot1" | "slot2") => {
    if (!baseRobot) return;
    const itemId = equipSelection[slot];
    if (!itemId) return;
    setEquipError(null);
    setEquippingSlot(slot);
    try {
      const equip = await getCallable("equipItem");
      const result = await equip({ robotId: baseRobot.id, slot, itemId });
      const data = result.data as { equipped: { slot1?: string | null; slot2?: string | null }; inventory: InventoryMap };

      setBaseRobot((prev) => (prev ? { ...prev, equipped: data.equipped } : prev));
      setInventory((prev) => ({ ...prev, ...data.inventory }));
      toast.success("Equipped");
    } catch (error) {
      console.error("Equip failed:", error);
      const message = error instanceof Error ? error.message : "Equip failed";
      setEquipError(message);
    } finally {
      setEquippingSlot(null);
    }
  };

  const handleUnequip = async (slot: "slot1" | "slot2") => {
    if (!baseRobot) return;
    setEquipError(null);
    setEquippingSlot(slot);
    try {
      const equip = await getCallable("equipItem");
      const result = await equip({ robotId: baseRobot.id, slot });
      const data = result.data as { equipped: { slot1?: string | null; slot2?: string | null }; inventory: InventoryMap };

      setBaseRobot((prev) => (prev ? { ...prev, equipped: data.equipped } : prev));
      setInventory((prev) => ({ ...prev, ...data.inventory }));
      setEquipSelection((prev) => ({ ...prev, [slot]: "" }));
      toast.success("Unequipped");
    } catch (error) {
      console.error("Unequip failed:", error);
      const message = error instanceof Error ? error.message : "Unequip failed";
      setEquipError(message);
    } finally {
      setEquippingSlot(null);
    }
  };

  // 強化アイテム使用
  const handleUpgrade = async () => {
    if (!baseRobot || !upgradeItemId) return;
    setUpgradeError(null);
    setIsUpgrading(true);
    try {
      const useUpgrade = await getCallable("useUpgradeItem");
      const result = await useUpgrade({ robotId: baseRobot.id, itemId: upgradeItemId });
      const data = result.data as {
        robotId: string;
        stat: string;
        oldValue: number;
        newValue: number;
        remainingQty: number;
      };

      // ロボットのステータス更新
      setBaseRobot((prev) =>
        prev ? { ...prev, [data.stat]: data.newValue } : prev
      );
      // インベントリ更新
      setInventory((prev) => ({
        ...prev,
        [upgradeItemId]: data.remainingQty
      }));
      setUpgradeItemId("");
      toast.success(`${data.stat} が ${data.oldValue} → ${data.newValue} に上昇！`);
    } catch (error) {
      console.error("Upgrade failed:", error);
      const message = error instanceof Error ? error.message : "強化に失敗しました";
      setUpgradeError(message);
    } finally {
      setIsUpgrading(false);
    }
  };

  // コスメティックアイテム適用
  const handleApplyCosmetic = async () => {
    if (!baseRobot || !cosmeticItemId) return;
    setCosmeticError(null);
    setIsApplyingCosmetic(true);
    try {
      const applyCosmetic = await getCallable("applyCosmeticItem");
      const result = await applyCosmetic({ robotId: baseRobot.id, itemId: cosmeticItemId });
      const data = result.data as {
        robotId: string;
        cosmeticApplied: string;
        allCosmetics: string[];
        remainingQty: number;
      };

      // ロボットのコスメティック更新
      setBaseRobot((prev) =>
        prev ? { ...prev, cosmetics: data.allCosmetics } : prev
      );
      // インベントリ更新
      setInventory((prev) => ({
        ...prev,
        [cosmeticItemId]: data.remainingQty
      }));
      setCosmeticItemId("");
      toast.success(`${data.cosmeticApplied} を適用しました！`);
    } catch (error) {
      console.error("Cosmetic apply failed:", error);
      const message = error instanceof Error ? error.message : "適用に失敗しました";
      setCosmeticError(message);
    } finally {
      setIsApplyingCosmetic(false);
    }
  };

  // Variant creation handler
  const handleCreateVariant = async () => {
    if (!baseRobot || !variantPartnerId) return;
    if (variants.length >= userLimit) {
      toast.error(t('robot_detail_variant_full'));
      return;
    }
    setIsCreatingVariant(true);
    try {
      const createFn = await getCallable('createVariant');
      await createFn({ robotIdA: baseRobot.id, robotIdB: variantPartnerId, name: variantName });
      toast.success(t('robot_detail_variant_success'));
      setVariantPartnerId("");
      setVariantName("");
      // Reload variants
      const { collection, getDocs, query: firestoreQuery, orderBy } = await import("firebase/firestore");
      const { getDb } = await import("@/lib/firebase");
      const variantsQuery = firestoreQuery(collection(getDb(), "users", user!.uid, "variants"), orderBy("createdAt", "desc"));
      const variantSnap = await getDocs(variantsQuery);
      setVariants(variantSnap.docs.map(d => ({ id: d.id, ...d.data() } as VariantData)));
    } catch (e: any) {
      console.error("Variant creation failed:", e);
      const code = e?.code || "";
      if (code.includes("resource-exhausted")) {
        toast.error(t('robot_detail_variant_full'));
      } else {
        toast.error(e?.message || "Failed to create variant");
      }
    } finally {
      setIsCreatingVariant(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg p-4 flex flex-col pb-24 text-foreground">
        <div className="max-w-2xl mx-auto w-full space-y-6">
          <div className="flex items-center">
            <Skeleton className="h-10 w-20" />
          </div>
          <SystemSkeleton
            className="aspect-square w-full rounded-2xl"
            text="BOOTING UNIT DATA..."
            subtext="DECRYPTING GENETIC SIGNATURE"
          />
          <div className="space-y-4">
            <SystemSkeleton className="h-12 w-full" showText={false} />
            <div className="grid grid-cols-2 gap-4">
              <SystemSkeleton className="h-24 w-full" text="ANALYZING STATS..." subtext="CALIBRATING SYSTEMS" />
              <SystemSkeleton className="h-24 w-full" text="ANALYZING STATS..." subtext="CALIBRATING SYSTEMS" />
              <SystemSkeleton className="h-24 w-full" text="ANALYZING STATS..." subtext="CALIBRATING SYSTEMS" />
              <SystemSkeleton className="h-24 w-full" text="ANALYZING STATS..." subtext="CALIBRATING SYSTEMS" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!baseRobot) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <p className="text-lg text-muted-foreground mb-4">{t('robot_not_found')}</p>
        <Link href="/collection">
          <Button>Back to Collection</Button>
        </Link>
      </div>
    );
  }
  if (loading) return <div className="flex justify-center p-8 min-h-screen items-center bg-dark-bg"><Loader2 className="animate-spin text-neon-cyan" /></div>;
  if (!baseRobot) return <div className="p-8 text-center text-white bg-dark-bg min-h-screen">{t('robot_not_found')}</div>;

  const { level, nextLevelExp, progress } = getLevelInfo(baseRobot);

  return (
    <div className="min-h-screen bg-dark-bg p-4 flex flex-col pb-24 relative overflow-hidden text-foreground">
      <SEO
        title={baseRobot ? `${baseRobot.name} | ${t("app_title")}` : t("loading")}
        description={baseRobot ? `${baseRobot.name} (Lv.${baseRobot.level}) - ${baseRobot.rarityName} Unit. HP: ${baseRobot.baseHp}, ATK: ${baseRobot.baseAttack}, DEF: ${baseRobot.baseDefense}` : ""}
      />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 pointer-events-none" />

      <main className="max-w-2xl mx-auto w-full relative z-10 space-y-6">
        {/* Navigation */}
        <div className="flex items-center">
          <Link href="/collection">
            <Button variant="ghost" className="text-white hover:text-neon-cyan pl-0">
              <ArrowLeft className="mr-2 h-4 w-4" /> BACK
            </Button>
          </Link>
        </div>

        {/* Robot Header Card */}
        <div className="glass-panel p-8 rounded-2xl border-neon-cyan relative text-center">
          <div className="absolute top-4 left-4 border border-neon-cyan px-2 py-0.5 text-[10px] text-neon-cyan font-orbitron">
            ID: {baseRobot.id.substring(0, 6)}
          </div>

          <div className="flex justify-center mb-6 drop-shadow-[0_0_30px_rgba(0,243,255,0.3)]">
            <RobotSVG parts={baseRobot.parts} colors={baseRobot.colors} size={240} fx={fx} />
          </div>


          <h1 className="text-3xl font-black italic tracking-wider text-white mb-1">
            <ScrambleText text={baseRobot.name} duration={1000} />
          </h1>
          <div className="text-neon-cyan font-orbitron text-sm mb-4">
            {baseRobot.rarityName} // {baseRobot.elementName || t('element_neutral')}
          </div>

          {/* Level & XP */}
          <div className="bg-black/40 rounded-full p-2 border border-white/10 flex items-center gap-3 px-4">
            <span className="font-bold text-sm">Lv.{level}</span>
            <div className="flex-1 h-2 bg-black/60 rounded-full overflow-hidden">
              <div className="h-full bg-neon-yellow" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground">
              {Math.floor(progress)}%
            </span>
          </div>

          {/* Share Button */}
          <div className="mt-4">
            <ShareCardModal robot={baseRobot} />
          </div>
        </div>

        {/* Origin Section - Robot's Birth Info */}
        <div className="glass-panel p-6 rounded-xl border border-white/5">
          <h3 className="text-sm text-neon-magenta mb-4 font-orbitron font-semibold tracking-widest flex items-center gap-2">
            <Cpu className="w-4 h-4" /> ORIGIN DATA
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Barcode className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Source Barcode</div>
                <div className="font-mono text-neon-cyan">{baseRobot.sourceBarcode || t('unknown_value')}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Genesis Date</div>
                <div className="font-mono">
                  {formatCreatedAt(baseRobot.createdAt, t('unknown_date'))}
                </div>
              </div>
            </div>
          </div>
          {/* Flavor text */}
          <div className="mt-4 p-3 bg-black/30 rounded-lg border border-white/5 text-xs text-muted-foreground italic">
            「このユニットはバーコード {baseRobot.sourceBarcode?.slice(0, 6) || "??????"}... から抽出されたデータを基に、第{(baseRobot.parts?.head || 1) % 7 + 1}世代合成プロトコルにより生成されました。」
          </div>
        </div>

        {/* Battle History */}
        {battleHistory.length > 0 && (
          <div className="glass-panel p-6 rounded-xl border border-white/5">
            <h3 className="text-sm text-neon-yellow mb-4 font-orbitron font-semibold tracking-widest flex items-center gap-2">
              <Trophy className="w-4 h-4" /> BATTLE RECORD
            </h3>
            <div className="space-y-2">
              {battleHistory.map((battle, index) => (
                <Interactive
                  key={battle.id || index}
                  className={`flex items-center justify-between p-2 rounded-lg h-auto border ${battle.won ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}
                >
                  <div className="flex items-center gap-2">
                    {battle.won ? (
                      <Trophy className="w-4 h-4 text-green-400" />
                    ) : (
                      <Skull className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-sm">vs {battle.opponentName}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {battle.date.toLocaleDateString("ja-JP")}
                  </div>
                </Interactive>
              ))}
            </div>
            <div className="mt-3 text-xs text-muted-foreground text-center">
              勝率: {battleHistory.length > 0 ? Math.round((battleHistory.filter(b => b.won).length / battleHistory.length) * 100) : 0}%
            </div>
          </div>
        )}

        {/* Status Visualization */}
        <div className="glass-panel p-6 rounded-xl border border-white/5 relative overflow-hidden">
          <h3 className="text-sm text-neon-cyan mb-4 font-orbitron font-semibold tracking-widest absolute top-4 left-6 z-10">STATUS ANALYSIS</h3>
          <div className="h-[250px] w-full relative z-0">
            {Recharts ? (
              <Recharts.ResponsiveContainer width="100%" height="100%">
                <Recharts.RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                  { subject: 'HP', A: baseRobot.baseHp, fullMark: 500 },
                  { subject: 'ATK', A: baseRobot.baseAttack, fullMark: 200 },
                  { subject: 'DEF', A: baseRobot.baseDefense, fullMark: 200 },
                  { subject: 'SPD', A: baseRobot.baseSpeed, fullMark: 200 },
                ]}>
                  <Recharts.PolarGrid stroke="#ffffff33" />
                  <Recharts.PolarAngleAxis dataKey="subject" tick={{ fill: '#0ff', fontSize: 12, fontFamily: 'Orbitron' }} />
                  <Recharts.PolarRadiusAxis angle={30} domain={[0, 200]} tick={false} axisLine={false} />
                  <Recharts.Radar
                    name="Stats"
                    dataKey="A"
                    stroke="#00f3ff"
                    strokeWidth={2}
                    fill="#00f3ff"
                    fillOpacity={0.3}
                  />
                </Recharts.RadarChart>
              </Recharts.ResponsiveContainer>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                {t('loading')}
              </div>
            )}
          </div>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Simple Status Cards with Neon Styled Borders */}
          <Interactive className="glass-panel p-4 rounded-xl border-l-4 border-l-red-500 h-auto">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Attack</div>
            <div className="text-2xl font-orbitron font-semibold">
              <ScrambleText text={String(baseRobot.baseAttack)} delay={300} />
            </div>
          </Interactive>
          <Interactive className="glass-panel p-4 rounded-xl border-l-4 border-l-blue-500 h-auto">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Defense</div>
            <div className="text-2xl font-orbitron font-semibold">
              <ScrambleText text={String(baseRobot.baseDefense)} delay={400} />
            </div>
          </Interactive>
          <Interactive className="glass-panel p-4 rounded-xl border-l-4 border-l-green-500 h-auto">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Speed</div>
            <div className="text-2xl font-orbitron font-semibold">
              <ScrambleText text={String(baseRobot.baseSpeed)} delay={500} />
            </div>
          </Interactive>
          <Interactive className="glass-panel p-4 rounded-xl border-l-4 border-l-yellow-500 h-auto">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">HP</div>
            <div className="text-2xl font-orbitron font-semibold">
              <ScrambleText text={String(baseRobot.baseHp)} delay={200} />
            </div>
          </Interactive>
        </div>

        {/* Skills Section (Placeholder for improved skill listing) */}
        {baseRobot.skills && baseRobot.skills.length > 0 && (
          <div className="glass-panel p-4 rounded-xl">
            <h3 className="text-sm text-neon-purple mb-4 font-orbitron font-semibold">ACTIVE SKILLS</h3>
            <div className="space-y-2">
              {baseRobot.skills.map((skill, i) => (
                <div key={i} className="p-3 bg-white/5 rounded border border-white/5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-neon-purple/20 flex items-center justify-center text-neon-purple">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    {/* Check if skill is object and has name property */}
                    <div className="font-bold text-sm">
                      {typeof skill === 'string' ? skill :
                        (skill && typeof skill === 'object' && 'name' in skill) ? (skill as { name: string }).name :
                          t('error_unknown_skill')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">装備</h2>
          <p className="text-sm text-muted-foreground">インベントリから2つまでアイテムを装備できます。</p>
          <div className="grid gap-3">
            {(["slot1", "slot2"] as const).map((slot) => (
              <div key={slot} className="border rounded-lg p-3 space-y-2">
                <div className="text-sm font-medium">
                  {slot === 'slot1' ? 'スロット1' : 'スロット2'}: {equipped?.[slot] ? getItemLabel(equipped[slot] as string) : "空"}
                </div>
                <select
                  value={equipSelection[slot]}
                  onChange={(event) =>
                    setEquipSelection((prev) => ({ ...prev, [slot]: event.target.value }))
                  }
                  className="border rounded px-2 py-1 bg-background text-sm w-full"
                >
                  <option value="">アイテムを選択</option>
                  {inventoryOptions.map(([itemId, qty]) => (
                    <option key={itemId} value={itemId}>
                      {getItemLabel(itemId)} (x{qty})
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleEquip(slot)}
                    disabled={!equipSelection[slot] || equippingSlot === slot}
                  >
                    {equippingSlot === slot && <Loader2 className="h-4 w-4 animate-spin" />}
                    装備する
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleUnequip(slot)}
                    disabled={!equipped?.[slot] || equippingSlot === slot}
                  >
                    {equippingSlot === slot && <Loader2 className="h-4 w-4 animate-spin" />}
                    外す
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {equipError && <p className="text-sm text-destructive">{equipError}</p>}
        </section>

        {/* Evolution Section */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            進化
          </h2>
          <p className="text-sm text-muted-foreground">
            同じカテゴリのロボットを2体消費して、このロボットを強化します。
          </p>
          <Button onClick={() => setIsEvolutionModalOpen(true)}>
            <Zap className="w-4 h-4 mr-2" />
            進化する
          </Button>
          <EvolutionModal
            isOpen={isEvolutionModalOpen}
            onClose={() => setIsEvolutionModalOpen(false)}
            target={baseRobot}
            allRobots={robots}
            onSuccess={() => {
              // Reload data
              trigger("evolve");
              setTimeout(() => window.location.reload(), 2000);
            }}
          />
        </section>

        {/* Variant Creation Section */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Cpu className="w-5 h-5 text-neon-purple" />
            {t('robot_detail_variant_title')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('robot_detail_variant_desc')}
          </p>
          <div className="text-xs text-muted-foreground">
            {t('robot_detail_capacity')}: {variants.length} / {userLimit}
          </div>
          {variants.length >= userLimit ? (
            <p className="text-sm text-destructive">{t('robot_detail_variant_full')}</p>
          ) : (
            <div className="flex flex-col gap-2 max-w-md">
              <select
                value={variantPartnerId}
                onChange={(e) => setVariantPartnerId(e.target.value)}
                className="border rounded px-2 py-1 bg-background text-sm"
              >
                <option value="">{t('robot_detail_select_partner')}</option>
                {materialRobots.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder={t('robot_detail_variant_name')}
                value={variantName}
                onChange={(e) => setVariantName(e.target.value)}
                maxLength={20}
                className="border rounded px-2 py-1 bg-background text-sm"
              />
              <Button
                onClick={handleCreateVariant}
                disabled={!variantPartnerId || isCreatingVariant}
              >
                {isCreatingVariant && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {t('robot_detail_create_variant')}
              </Button>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">合成</h2>
          <p className="text-sm text-muted-foreground">1～5体の素材ロボットを選択してベースロボットに融合。</p>
          <div className="space-y-2">
            {materialRobots.length === 0 && (
              <p className="text-sm text-muted-foreground">素材ロボットがありません。</p>
            )}
            {materialRobots.map((robot) => {
              const isSelected = selectedMaterials.includes(robot.id);
              return (
                <label key={robot.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleMaterial(robot.id)}
                    disabled={!isSelected && selectedMaterials.length >= 5}
                  />
                  <span className="flex-1 truncate">{robot.name}</span>
                  <span className="text-xs text-muted-foreground">Lv.{robot.level || 1}</span>
                </label>
              );
            })}
          </div>
          <Button
            onClick={handleSynthesize}
            disabled={isSynthesizing || selectedMaterials.length === 0}
          >
            {isSynthesizing && <Loader2 className="h-4 w-4 animate-spin" />}
            合成する
          </Button>
          {synthesizeError && <p className="text-sm text-destructive">{synthesizeError}</p>}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">スキル継承</h2>
          <p className="text-sm text-muted-foreground">素材ロボットと継承するスキルを選択してください。</p>
          <div className="flex flex-col gap-2 max-w-md">
            <select
              value={inheritMaterialId}
              onChange={(event) => {
                setInheritMaterialId(event.target.value);
                setInheritSkillId("");
              }}
              className="border rounded px-3 py-2 bg-background text-sm"
            >
              <option value="">素材ロボットを選択</option>
              {materialRobots.map((robot) => (
                <option key={robot.id} value={robot.id}>
                  {robot.name}
                </option>
              ))}
            </select>
            <select
              value={inheritSkillId}
              onChange={(event) => setInheritSkillId(event.target.value)}
              className="border rounded px-3 py-2 bg-background text-sm"
              disabled={!inheritMaterialId || inheritSkillOptions.length === 0}
            >
              <option value="">スキルを選択</option>
              {inheritSkillOptions.map((skillId) => (
                <option key={skillId} value={skillId}>
                  {skillId}
                </option>
              ))}
            </select>
            {inheritMaterialId && inheritSkillOptions.length === 0 && (
              <p className="text-xs text-muted-foreground">選択した素材にはスキルがありません。</p>
            )}
          </div>
          <Button
            onClick={handleInherit}
            disabled={isInheriting || !inheritMaterialId || !inheritSkillId}
          >
            {isInheriting && <Loader2 className="h-4 w-4 animate-spin" />}
            継承する
          </Button>
          {inheritError && <p className="text-sm text-destructive">{inheritError}</p>}
        </section>

        {/* 強化アイテム使用 */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">ロボット強化</h2>
          <p className="text-sm text-muted-foreground">強化アイテムを使用してステータスを永久に上昇させます。</p>
          <div className="flex flex-col sm:flex-row gap-2 max-w-md">
            <select
              value={upgradeItemId}
              onChange={(event) => setUpgradeItemId(event.target.value)}
              className="border rounded px-3 py-2 bg-background text-sm flex-1"
            >
              <option value="">アイテムを選択</option>
              {Object.entries(inventory)
                .filter(([id, qty]) => qty > 0 && ['power_core', 'shield_plate', 'speed_chip', 'hp_module'].includes(id))
                .map(([itemId, qty]) => (
                  <option key={itemId} value={itemId}>
                    {getItemLabel(itemId)} (x{qty})
                  </option>
                ))}
            </select>
            <Button
              onClick={handleUpgrade}
              disabled={isUpgrading || !upgradeItemId}
            >
              {isUpgrading && <Loader2 className="h-4 w-4 animate-spin" />}
              使用する
            </Button>
          </div>
          {upgradeError && <p className="text-sm text-destructive">{upgradeError}</p>}
        </section>

        {/* コスメティック適用 */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">カスタマイズ</h2>
          <p className="text-sm text-muted-foreground">コスメティックアイテムでロボットの見た目を変更します。</p>
          <div className="flex flex-col sm:flex-row gap-2 max-w-md">
            <select
              value={cosmeticItemId}
              onChange={(event) => setCosmeticItemId(event.target.value)}
              className="border rounded px-3 py-2 bg-background text-sm flex-1"
            >
              <option value="">アイテムを選択</option>
              {Object.entries(inventory)
                .filter(([id, qty]) => qty > 0 && ['gold_coating', 'neon_glow', 'flame_aura', 'ice_armor'].includes(id))
                .map(([itemId, qty]) => (
                  <option key={itemId} value={itemId}>
                    {getItemLabel(itemId)} (x{qty})
                  </option>
                ))}
            </select>
            <Button
              onClick={handleApplyCosmetic}
              disabled={isApplyingCosmetic || !cosmeticItemId}
            >
              {isApplyingCosmetic && <Loader2 className="h-4 w-4 animate-spin" />}
              適用する
            </Button>
          </div>
          {cosmeticError && <p className="text-sm text-destructive">{cosmeticError}</p>}
        </section>
      </main>
    </div>
  );
}
