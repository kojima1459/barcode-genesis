import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { httpsCallable } from "firebase/functions";
import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import RobotSVG from "@/components/RobotSVG";
import { useAuth } from "@/contexts/AuthContext";
import { db, functions } from "@/lib/firebase";
import { getItemLabel } from "@/lib/items";
import { toast } from "sonner";

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
  level?: number;
  xp?: number;
  exp?: number;
  skills?: Array<string | { id?: string }>;
  equipped?: {
    slot1?: string | null;
    slot2?: string | null;
  };
}

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

export default function RobotDetail({ robotId }: { robotId: string }) {
  const { user } = useAuth();
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
      } catch (error) {
        console.error("Failed to load robot detail:", error);
        toast.error("Failed to load robot detail");
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

  const handleSynthesize = async () => {
    if (!baseRobot) return;
    setSynthesizeError(null);
    setIsSynthesizing(true);
    try {
      const synthesize = httpsCallable(functions, "synthesizeRobots");
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
      const inherit = httpsCallable(functions, "inheritSkill");
      const result = await inherit({
        baseRobotId: baseRobot.id,
        materialRobotId: inheritMaterialId,
        skillId: inheritSkillId
      });
      const data = result.data as { success: boolean; baseSkills: string[] };

      setBaseRobot((prev) => (prev ? { ...prev, skills: data.baseSkills } : prev));
      if (data.success) {
        toast.success("Inheritance succeeded");
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
      const equip = httpsCallable(functions, "equipItem");
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
      const equip = httpsCallable(functions, "equipItem");
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!baseRobot) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
        <p className="text-lg text-muted-foreground mb-4">Robot not found.</p>
        <Link href="/collection">
          <Button>Back to Collection</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col">
      <header className="flex items-center mb-6 max-w-4xl mx-auto w-full">
        <Link href="/collection">
          <Button variant="ghost" className="mr-4">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-primary">Robot Detail</h1>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full space-y-6">
        <Card>
          <CardContent className="p-4 flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/3 flex items-center justify-center bg-secondary/20 rounded-lg p-4">
              <RobotSVG parts={baseRobot.parts} colors={baseRobot.colors} size={180} />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold">{baseRobot.name}</h2>
                <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                  {baseRobot.rarityName}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Lv.{baseRobot.level || 1} / XP {baseRobot.xp ?? baseRobot.exp ?? 0}
              </div>
              <div className="text-sm text-muted-foreground">
                Skills: {baseSkillIds.length > 0 ? baseSkillIds.join(", ") : "None"}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2">
                <div className="flex justify-between">
                  <span>HP</span>
                  <span className="font-mono text-foreground">{baseRobot.baseHp}</span>
                </div>
                <div className="flex justify-between">
                  <span>ATK</span>
                  <span className="font-mono text-foreground">{baseRobot.baseAttack}</span>
                </div>
                <div className="flex justify-between">
                  <span>DEF</span>
                  <span className="font-mono text-foreground">{baseRobot.baseDefense}</span>
                </div>
                <div className="flex justify-between">
                  <span>SPD</span>
                  <span className="font-mono text-foreground">{baseRobot.baseSpeed}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Equipment</h2>
          <p className="text-sm text-muted-foreground">Equip up to 2 items from your inventory.</p>
          <div className="grid gap-3">
            {(["slot1", "slot2"] as const).map((slot) => (
              <div key={slot} className="border rounded-lg p-3 space-y-2">
                <div className="text-sm font-medium">
                  {slot.toUpperCase()}: {equipped?.[slot] ? getItemLabel(equipped[slot] as string) : "Empty"}
                </div>
                <select
                  value={equipSelection[slot]}
                  onChange={(event) =>
                    setEquipSelection((prev) => ({ ...prev, [slot]: event.target.value }))
                  }
                  className="border rounded px-2 py-1 bg-background text-sm w-full"
                >
                  <option value="">Select item</option>
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
                    Equip
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleUnequip(slot)}
                    disabled={!equipped?.[slot] || equippingSlot === slot}
                  >
                    {equippingSlot === slot && <Loader2 className="h-4 w-4 animate-spin" />}
                    Unequip
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {equipError && <p className="text-sm text-destructive">{equipError}</p>}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Synthesize</h2>
          <p className="text-sm text-muted-foreground">Select 1-5 material robots to fuse into the base robot.</p>
          <div className="space-y-2">
            {materialRobots.length === 0 && (
              <p className="text-sm text-muted-foreground">No material robots available.</p>
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
            Synthesize
          </Button>
          {synthesizeError && <p className="text-sm text-destructive">{synthesizeError}</p>}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Inherit Skill</h2>
          <p className="text-sm text-muted-foreground">Select one material robot and one skill to inherit.</p>
          <div className="flex flex-col gap-2 max-w-md">
            <select
              value={inheritMaterialId}
              onChange={(event) => {
                setInheritMaterialId(event.target.value);
                setInheritSkillId("");
              }}
              className="border rounded px-3 py-2 bg-background text-sm"
            >
              <option value="">Select material robot</option>
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
              <option value="">Select skill</option>
              {inheritSkillOptions.map((skillId) => (
                <option key={skillId} value={skillId}>
                  {skillId}
                </option>
              ))}
            </select>
            {inheritMaterialId && inheritSkillOptions.length === 0 && (
              <p className="text-xs text-muted-foreground">Selected material has no skills.</p>
            )}
          </div>
          <Button
            onClick={handleInherit}
            disabled={isInheriting || !inheritMaterialId || !inheritSkillId}
          >
            {isInheriting && <Loader2 className="h-4 w-4 animate-spin" />}
            Inherit
          </Button>
          {inheritError && <p className="text-sm text-destructive">{inheritError}</p>}
        </section>
      </main>
    </div>
  );
}
