import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { Loader2, Swords, Factory, ChevronDown, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RobotSVG from "@/components/RobotSVG";
import SilhouetteCard from "@/components/SilhouetteCard";
import SEO from "@/components/SEO";
import { Interactive } from "@/components/ui/interactive";
import { SystemSkeleton } from "@/components/ui/SystemSkeleton";
import { RobotData, VariantData } from "@/types/shared";
import { getMotif, getMotifLabel, getRarityLabel, getRarityTier, getRobotSeed } from "@/lib/rarity";
import { LOGIN_BADGES, getBadgeLabel } from "@/lib/badges";
import {
  ROLES,
  ROLE_LABELS,
  generateDexSlots,
  getSlotsByRole,
  getDexSlotId,
  getUnlockedSlots,
  calculateDexProgress,
  type RobotRole,
  type DexSlot,
} from "@/lib/dexRegistry";
import AdBanner from "@/components/AdBanner";

function shortId(id?: string) {
  if (!id) return "—";
  return id.length <= 8 ? id : `${id.slice(0, 4)}…${id.slice(-3)}`;
}

// ============================================
// Progress Bar Component
// ============================================

interface DexProgressBarProps {
  unlocked: number;
  total: number;
  percent: number;
  remaining: number;
}

function DexProgressBar({ unlocked, total, percent, remaining }: DexProgressBarProps) {
  return (
    <Card className="bg-gradient-to-r from-neon-cyan/5 to-neon-pink/5 border-white/10">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-bold text-lg flex items-center gap-2">
            <span className="text-neon-cyan">{unlocked}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-white">{total}</span>
            <span className="text-xs text-muted-foreground ml-1">ユニット</span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-neon-cyan">{percent}%</span>
            <div className="text-xs text-muted-foreground">
              あと<span className="text-neon-pink font-bold mx-1">{remaining}</span>体
            </div>
          </div>
        </div>
        <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-neon-cyan to-neon-pink"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Role Section Component
// ============================================

interface RoleSectionProps {
  role: RobotRole;
  slots: DexSlot[];
  unlockedSlots: Set<string>;
  robotMap: Map<string, RobotData>;
  onBattle: (robotId: string) => void;
  onWorkshop: (robotId: string) => void;
}

function RoleSection({
  role,
  slots,
  unlockedSlots,
  robotMap,
  onBattle,
  onWorkshop,
}: RoleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const roleLabel = ROLE_LABELS[role].ja;
  const unlockedCount = slots.filter(s => unlockedSlots.has(s.id)).length;

  const roleColors: Record<RobotRole, string> = {
    ATTACKER: "border-red-400/40 text-red-300 bg-red-400/10",
    TANK: "border-blue-400/40 text-blue-300 bg-blue-400/10",
    SPEED: "border-green-400/40 text-green-300 bg-green-400/10",
    BALANCE: "border-amber-400/40 text-amber-300 bg-amber-400/10",
    TRICKY: "border-purple-400/40 text-purple-300 bg-purple-400/10",
  };

  return (
    <div className="space-y-2" data-testid={`role-section-${role}`}>
      {/* Section Header */}
      <Interactive
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/10 hover:bg-black/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`${roleColors[role]} text-sm px-3 py-1`}>
            {roleLabel}
          </Badge>
          <span className="text-sm text-muted-foreground">
            <span className="text-white font-bold">{unlockedCount}</span>/{slots.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        )}
      </Interactive>

      {/* Slot Grid */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 pt-2">
              {slots.map(slot => {
                const isUnlocked = unlockedSlots.has(slot.id);
                const robot = robotMap.get(slot.id);

                if (isUnlocked && robot) {
                  // Owned robot card (compact version)
                  return (
                    <Interactive
                      key={slot.id}
                      className="bg-black/30 border-white/10 hover:border-neon-cyan/40 transition-colors h-auto overflow-hidden rounded-xl"
                      data-testid="owned-robot-card"
                    >
                      <CardContent className="p-3 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <div className="shrink-0 w-[56px] h-[56px] flex items-center justify-center rounded border border-white/10 bg-black/20">
                            <RobotSVG parts={robot.parts} colors={robot.colors} size={52} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-xs truncate">{robot.name || "Unnamed"}</div>
                            <div className="text-[9px] text-muted-foreground font-mono">
                              Lv.{robot.level ?? 1}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="flex-1 h-7 text-[10px] px-2"
                            onClick={() => onBattle(robot.id)}
                          >
                            <Swords className="h-3 w-3 mr-1" />
                            Battle
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="flex-1 h-7 text-[10px] px-2"
                            onClick={() => onWorkshop(robot.id)}
                          >
                            <Factory className="h-3 w-3 mr-1" />
                            WS
                          </Button>
                        </div>
                      </CardContent>
                    </Interactive>
                  );
                } else {
                  // Silhouette placeholder
                  return <SilhouetteCard key={slot.id} slot={slot} lang="ja" />;
                }
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// Main Dex Component
// ============================================

export default function Dex() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [robots, setRobots] = useState<RobotData[]>([]);
  const [variants, setVariants] = useState<VariantData[]>([]);
  const [loadingRobots, setLoadingRobots] = useState(true);
  const [loadingVariants, setLoadingVariants] = useState(true);
  const [badgeIds, setBadgeIds] = useState<string[]>([]);
  const [titleId, setTitleId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (!snap.exists()) {
        setBadgeIds([]);
        setTitleId(null);
        return;
      }
      const data = snap.data() as any;
      setBadgeIds(Array.isArray(data.badgeIds) ? data.badgeIds : []);
      setTitleId(typeof data.titleId === "string" ? data.titleId : null);
    });

    setLoadingRobots(true);
    const qRobots = query(collection(db, "users", user.uid, "robots"), orderBy("createdAt", "desc"));
    const unsubRobots = onSnapshot(
      qRobots,
      (snap) => {
        setRobots(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RobotData)));
        setLoadingRobots(false);
      },
      () => setLoadingRobots(false),
    );

    setLoadingVariants(true);
    const qVariants = query(collection(db, "users", user.uid, "variants"), orderBy("createdAt", "desc"));
    const unsubVariants = onSnapshot(
      qVariants,
      (snap) => {
        setVariants(snap.docs.map((d) => ({ id: d.id, ...d.data() } as VariantData)));
        setLoadingVariants(false);
      },
      () => setLoadingVariants(false),
    );

    return () => {
      unsubUser();
      unsubRobots();
      unsubVariants();
    };
  }, [user]);

  const variantsEmpty = !loadingVariants && variants.length === 0;

  // ============================================
  // Dex Collection Logic
  // ============================================

  const dexProgress = useMemo(() => calculateDexProgress(robots), [robots]);
  const unlockedSlots = useMemo(() => getUnlockedSlots(robots), [robots]);

  // Map slot ID -> first robot that fills that slot
  const robotMap = useMemo(() => {
    const map = new Map<string, RobotData>();
    for (const robot of robots) {
      if (robot.parts) {
        const slotId = getDexSlotId(robot);
        if (!map.has(slotId)) {
          map.set(slotId, robot);
        }
      }
    }
    return map;
  }, [robots]);

  // ============================================
  // Actions
  // ============================================

  const handleBattle = (robotId: string) => {
    setLocation(`/battle?selected=${encodeURIComponent(robotId)}`);
  };

  const useInWorkshop = (id?: string, idB?: string) => {
    if (!id) return;
    if (idB) {
      sessionStorage.setItem("workshopParentA", id);
      sessionStorage.setItem("workshopParentB", idB);
      setLocation(`/workshop?a=${encodeURIComponent(id)}&b=${encodeURIComponent(idB)}`);
      return;
    }

    const existingA = sessionStorage.getItem("workshopParentA");
    const existingB = sessionStorage.getItem("workshopParentB");

    let nextA: string;
    let nextB: string | null;

    if (!existingA || (existingA && existingB)) {
      nextA = id;
      nextB = null;
    } else {
      nextA = existingA;
      nextB = id === existingA ? null : id;
    }

    sessionStorage.setItem("workshopParentA", nextA);
    if (nextB) sessionStorage.setItem("workshopParentB", nextB);
    else sessionStorage.removeItem("workshopParentB");

    setLocation(`/workshop?a=${encodeURIComponent(nextA)}${nextB ? `&b=${encodeURIComponent(nextB)}` : ""}`);
  };

  const statsLine = useMemo(
    () => (r: RobotData) => `Lv.${r.level ?? 1}  HP ${r.baseHp ?? 0}  ATK ${r.baseAttack ?? 0}  DEF ${r.baseDefense ?? 0}  SPD ${r.baseSpeed ?? 0}`,
    [],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-4">
      <SEO title="Dex | Barcode Genesis" description="Your robots and variants." />

      <h1 className="text-2xl font-bold text-primary">Dex</h1>

      {/* Collection Progress */}
      {!loadingRobots && (
        <DexProgressBar
          unlocked={dexProgress.unlocked}
          total={dexProgress.total}
          percent={dexProgress.percent}
          remaining={dexProgress.remaining}
        />
      )}

      <Card className="bg-black/30 border-white/10">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-bold">称号・バッジ</div>
            <div className="text-xs text-muted-foreground">
              現在の称号: {getBadgeLabel(titleId) ?? "Rookie"}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {LOGIN_BADGES.map((badge) => {
              const owned = badgeIds.includes(badge.id);
              return (
                <div
                  key={badge.id}
                  className={`rounded border px-3 py-2 text-xs ${owned ? "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan" : "border-white/10 bg-black/20 text-muted-foreground"
                    }`}
                >
                  <div className="font-bold">{owned ? badge.name : "LOCKED"}</div>
                  <div className="text-[10px]">
                    {owned ? badge.description : `連続${badge.threshold}日で解放`}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="collection">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="collection">Collection</TabsTrigger>
          <TabsTrigger value="robots">Robots ({robots.length})</TabsTrigger>
          <TabsTrigger value="variants">Variants ({variants.length})</TabsTrigger>
        </TabsList>

        {/* Collection Tab - New! */}
        <TabsContent value="collection" className="mt-4 space-y-4">
          {loadingRobots ? (
            <div className="space-y-4">
              <SystemSkeleton className="h-40 w-full rounded-2xl" text="SCANNING REGISTRY..." subtext="MAPPING UNIT DISCOVERIES" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[...Array(6)].map((_, i) => (
                  <SystemSkeleton key={i} className="h-48 w-full rounded-xl" showText={false} />
                ))}
              </div>
            </div>
          ) : (
            <>
              {ROLES.map(role => (
                <RoleSection
                  key={role}
                  role={role}
                  slots={getSlotsByRole(role)}
                  unlockedSlots={unlockedSlots}
                  robotMap={robotMap}
                  onBattle={handleBattle}
                  onWorkshop={(id) => useInWorkshop(id)}
                />
              ))}
            </>
          )}
        </TabsContent>

        {/* Robots Tab - Original List View */}
        <TabsContent value="robots" className="mt-4">
          {loadingRobots ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <SystemSkeleton key={i} className="h-32 w-full rounded-xl" text="LOADING UNIT..." showText={false} />
              ))}
            </div>
          ) : robots.length === 0 ? (
            <div className="text-sm text-muted-foreground py-10 text-center border border-dashed rounded bg-black/10">
              まだロボットがありません。`/scan` から生成してください。
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {robots.map((r) => (
                <Interactive key={r.id} className="bg-black/30 border-white/10 rounded-xl">
                  <CardContent className="p-4 flex gap-4 h-full">
                    <div className="shrink-0 w-[96px] h-[96px] flex items-center justify-center rounded border border-white/10 bg-black/20">
                      {r.parts && r.colors ? <RobotSVG parts={r.parts} colors={r.colors} size={90} /> : <div className="text-xs text-muted-foreground">No preview</div>}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bold truncate">{r.name || "Unnamed"}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">ID: {shortId(r.id)}</div>
                          {r.parts && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {(() => {
                                const seed = getRobotSeed(r.parts);
                                const tier = getRarityTier(seed);
                                const motif = getMotif(seed);
                                return (
                                  <>
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] ${tier === "B_ACE"
                                        ? "border-neon-cyan/40 text-neon-cyan bg-neon-cyan/10"
                                        : "border-white/10 text-muted-foreground"
                                        }`}
                                    >
                                      {getRarityLabel(tier)}
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] ${motif === "EVA"
                                        ? "border-neon-pink/40 text-neon-pink bg-neon-pink/10"
                                        : "border-emerald-400/40 text-emerald-200 bg-emerald-400/10"
                                        }`}
                                    >
                                      {getMotifLabel(motif)}
                                    </Badge>
                                    {r.roleName && (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] border-amber-400/40 text-amber-300 bg-amber-400/10"
                                      >
                                        {r.roleName}
                                      </Badge>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">{statsLine(r)}</div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button size="sm" variant="default" onClick={() => handleBattle(r.id)}>
                          <Swords className="h-4 w-4 mr-2" />
                          Battle with this
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => useInWorkshop(r.id)}>
                          <Factory className="h-4 w-4 mr-2" />
                          Use in workshop
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Interactive>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="variants" className="mt-4">
          {loadingVariants ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(3)].map((_, i) => (
                <SystemSkeleton key={i} className="h-32 w-full rounded-xl" text="LOADING VARIANT..." showText={false} />
              ))}
            </div>
          ) : variantsEmpty ? (
            <div className="text-sm text-muted-foreground py-10 text-center border border-dashed rounded bg-black/10">
              まだバリアントがありません。`/workshop` で作成できます。
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {variants.map((v) => (
                <Interactive key={v.id} className="bg-black/30 border-white/10 rounded-xl">
                  <CardContent className="p-4 flex gap-4 h-full">
                    <div className="shrink-0 w-[96px] h-[96px] flex items-center justify-center rounded border border-white/10 bg-black/20">
                      {v.parts && v.colors ? <RobotSVG parts={v.parts} colors={v.colors} size={90} /> : <div className="text-xs text-muted-foreground">No preview</div>}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="min-w-0">
                        <div className="font-bold truncate">{v.name || `Variant ${shortId(v.id)}`}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">ID: {shortId(v.id)}</div>
                        {v.parts && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {(() => {
                              const seed = getRobotSeed(v.parts);
                              const tier = getRarityTier(seed);
                              const motif = getMotif(seed);
                              return (
                                <>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] ${tier === "B_ACE"
                                      ? "border-neon-cyan/40 text-neon-cyan bg-neon-cyan/10"
                                      : "border-white/10 text-muted-foreground"
                                      }`}
                                  >
                                    {getRarityLabel(tier)}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] ${motif === "EVA"
                                      ? "border-neon-pink/40 text-neon-pink bg-neon-pink/10"
                                      : "border-emerald-400/40 text-emerald-200 bg-emerald-400/10"
                                      }`}
                                  >
                                    {getMotifLabel(motif)}
                                  </Badge>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        Parents: {shortId(v.parentRobotIds?.[0])} + {shortId(v.parentRobotIds?.[1])}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button size="sm" variant="default" onClick={() => setLocation(`/battle?selected=${encodeURIComponent(v.id || "")}`)} disabled={!v.id}>
                          <Swords className="h-4 w-4 mr-2" />
                          Battle with this
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => useInWorkshop(v.parentRobotIds?.[0], v.parentRobotIds?.[1])}
                          disabled={!v.parentRobotIds?.[0] || !v.parentRobotIds?.[1]}
                          title={!v.parentRobotIds?.[0] || !v.parentRobotIds?.[1] ? "親ロボットが未登録です" : undefined}
                        >
                          <Factory className="h-4 w-4 mr-2" />
                          Use in workshop
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Interactive>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      <AdBanner />
    </div>
  );
}
