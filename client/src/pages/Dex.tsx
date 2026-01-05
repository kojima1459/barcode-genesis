import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { collection, getDocs, orderBy, query, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Loader2, Swords, Factory, ChevronDown, ChevronRight, ScanBarcode, Star, HelpCircle, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

import { useAuth } from "@/contexts/AuthContext";
import { useUserData } from "@/hooks/useUserData";
import { useLanguage } from "@/contexts/LanguageContext";
import { getDb } from "@/lib/firebase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import RobotSVG from "@/components/RobotSVG";
import SilhouetteCard from "@/components/SilhouetteCard";
import CollectionSlot from "@/components/CollectionSlot";
import SEO from "@/components/SEO";
import { Interactive } from "@/components/ui/interactive";
import { SystemSkeleton } from "@/components/ui/SystemSkeleton";
import { RobotData, VariantData } from "@/types/shared";
import { getMotif, getMotifLabel, getRarityLabel, getRarityTier, getRobotSeed } from "@/lib/rarity";
import { LOGIN_BADGES, getBadgeLabel } from "@/lib/badges";
import {
  ROLES,
  ROLE_LABELS,
  ROLE_COLORS,
  generateDexSlots,
  getSlotsByRole,
  getDexSlotId,
  getUnlockedSlots,
  calculateDexProgress,
  getPlaceholderParts, // Added
  getPlaceholderColors, // Added
  type RobotRole,
  type DexSlot,
} from "@/lib/dexRegistry";
import AdBanner from "@/components/AdBanner";
import LazyRender from "@/components/LazyRender";

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
  const { t } = useLanguage();
  return (
    <Card className="bg-linear-to-r from-neon-cyan/5 to-neon-pink/5 border-white/10">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-bold text-lg flex items-center gap-2">
            <span className="text-neon-cyan">{unlocked}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-white">{total}</span>
            <span className="text-xs text-muted-foreground ml-1">{t('units_suffix') || "ユニット"}</span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-neon-cyan">{percent}%</span>
            <div className="text-xs text-muted-foreground">
              {t('remaining_count').replace('{count}', remaining.toString())}
            </div>
          </div>
        </div>
        <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-linear-to-r from-neon-cyan to-neon-pink"
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
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(true);
  const roleLabel = ROLE_LABELS[role].ja;
  const unlockedCount = slots.filter(s => unlockedSlots.has(s.id)).length;

  return (
    <div className="space-y-2" data-testid={`role-section-${role}`}>
      {/* Section Header */}
      <Interactive
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/10 hover:bg-black/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`${ROLE_COLORS[role]} text-sm px-3 py-1`}>
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
                    <LazyRender key={slot.id} minHeight="120px" className="h-full">
                      <Interactive
                        className="bg-black/30 border-white/10 hover:border-neon-cyan/40 transition-colors h-auto overflow-hidden rounded-xl"
                        data-testid="owned-robot-card"
                      >
                        <CardContent className="p-3 flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <div className="shrink-0 w-[56px] h-[56px] flex items-center justify-center rounded border border-white/10 bg-black/20">
                              <RobotSVG parts={robot.parts} colors={robot.colors} size={52} simplified={true} renderQuality="list" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-xs truncate">{robot.name || t('label_unnamed')}</div>
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
                              {t('battle_btn') || "バトル"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="flex-1 h-7 text-[10px] px-2"
                              onClick={() => onWorkshop(robot.id)}
                            >
                              <Factory className="h-3 w-3 mr-1" />
                              {t('workshop_short')}
                            </Button>
                          </div>
                        </CardContent>
                      </Interactive>
                    </LazyRender>
                  );
                } else {
                  // Silhouette placeholder
                  return (
                    <LazyRender key={slot.id} minHeight="120px" className="h-full">
                      <SilhouetteCard slot={slot} lang="ja" />
                    </LazyRender>
                  );
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
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  const [robots, setRobots] = useState<RobotData[]>([]);
  const [variants, setVariants] = useState<VariantData[]>([]);
  const [loadingRobots, setLoadingRobots] = useState(true);
  const [loadingVariants, setLoadingVariants] = useState(true);

  // Use centralized user data
  const { badgeIds, titleId, activeUnitId } = useUserData();

  // Filters
  const [filterRole, setFilterRole] = useState<string>("ALL");
  const [filterRarity, setFilterRarity] = useState<string>("ALL");

  const [hintSlot, setHintSlot] = useState<DexSlot | null>(null);

  const filteredRobots = useMemo(() => {
    if (filterRole === "ALL" && filterRarity === "ALL") return robots;

    return robots.filter((r) => {
      // Role Filter
      if (filterRole !== "ALL") {
        const rRole = String(r.role || "").toUpperCase();
        if (filterRole === "ATTACKER") {
          if (rRole !== "ATTACKER" && rRole !== "STRIKER") return false;
        } else if (filterRole === "TANK") {
          if (rRole !== "TANK") return false;
        } else if (filterRole === "SPEED") {
          if (rRole !== "SPEED") return false;
        } else if (filterRole === "SUPPORT") {
          if (rRole !== "SUPPORT" && rRole !== "BALANCE" && rRole !== "BALANCED" && rRole !== "TRICKY") return false;
        } else if (filterRole === "BALANCE") {
          if (rRole !== "BALANCE" && rRole !== "BALANCED") return false;
        } else {
          // For generic match if strict
          if (rRole !== filterRole) return false;
        }
      }

      // Rarity Filter
      if (filterRarity !== "ALL") {
        const tier = r.rarityTier || (r.rarity && r.rarity >= 4 ? 'legendary' : r.rarity && r.rarity >= 2 ? 'rare' : 'common');
        if (tier !== filterRarity) return false;
      }
      return true;
    });
  }, [robots, filterRole, filterRarity]);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      // Load robots
      setLoadingRobots(true);
      try {
        const qRobots = query(collection(getDb(), "users", user.uid, "robots"), orderBy("createdAt", "desc"));
        const robotSnap = await getDocs(qRobots);
        setRobots(robotSnap.docs.map((d) => ({ id: d.id, ...d.data() } as RobotData)));
      } catch (err) {
        console.error("Failed to load robots:", err);
      } finally {
        setLoadingRobots(false);
      }

      // Load variants
      setLoadingVariants(true);
      try {
        const qVariants = query(collection(getDb(), "users", user.uid, "variants"), orderBy("createdAt", "desc"));
        const variantSnap = await getDocs(qVariants);
        setVariants(variantSnap.docs.map((d) => ({ id: d.id, ...d.data() } as VariantData)));
      } catch (err) {
        console.error("Failed to load variants:", err);
      } finally {
        setLoadingVariants(false);
      }
    };

    loadData();
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

  const goToWorkshop = (id?: string, idB?: string) => {
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

  const handleSetActiveUnit = async (robotId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(getDb(), "users", user.uid), {
        activeUnitId: robotId,
        updatedAt: serverTimestamp(),
      });
      toast.success(t("active_unit_updated"));
    } catch (e) {
      console.error("Set active unit error:", e);
      toast.error(t("active_unit_update_failed"));
    }
  };

  const statsLine = useMemo(
    () => (r: RobotData) => (
      <span className="tabular-nums">
        Lv.{r.level ?? 1}  HP {r.baseHp ?? 0}  ATK {r.baseAttack ?? 0}  DEF {r.baseDefense ?? 0}  SPD {r.baseSpeed ?? 0}
      </span>
    ),
    [],
  );

  // Collection Progress Calculation
  const progress = useMemo(() => {
    return calculateDexProgress(robots);
  }, [robots]);

  const dexSlots = useMemo(() => {
    return generateDexSlots();
  }, []);

  // Memoize placeholder generation (B2 optimization)
  const slotPlaceholders = useMemo(() => {
    const map = new Map<string, { parts: any; colors: any }>();
    dexSlots.forEach((slot) => {
      map.set(slot.id, {
        parts: getPlaceholderParts(slot),
        colors: getPlaceholderColors(),
      });
    });
    return map;
  }, [dexSlots]);

  // Map slots to unlocked robots (if any)
  const getRobotForSlot = (slotId: string): RobotData | undefined => {
    // Find the first robot that matches the slot criteria
    return robots.find(r => getDexSlotId(r) === slotId);
  };

  return (
    <div className="flex-1 flex flex-col relative pb-32 md:pb-8 bg-background text-foreground overflow-hidden">

      <main className="mx-auto w-full max-w-6xl px-4 py-6 space-y-4 relative z-10">
        <SEO title="Dex | Barcode Genesis" description="Your robots and variants." />

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">DEX</h1>
          <Link href="/how-to">
            <Button variant="ghost" size="icon">
              <HelpCircle className="w-5 h-5 text-muted-foreground" />
            </Button>
          </Link>
        </div>

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
              <div className="font-bold">{t('titles_badges')}</div>
              <div className="text-xs text-muted-foreground">
                {t('current_title')}: {getBadgeLabel(titleId) ?? t('rookie')}
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
                    <div className="font-bold">{owned ? badge.name : t('locked')}</div>
                    <div className="text-[10px]">
                      {owned ? badge.description : t('unlock_at_streak').replace('{days}', badge.threshold.toString())}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="collection">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="collection">{t('tab_collection')}</TabsTrigger>
            <TabsTrigger value="robots">{t('tab_robots')} ({robots.length})</TabsTrigger>
            <TabsTrigger value="variants">{t('tab_variants')} ({variants.length})</TabsTrigger>
          </TabsList>

          {/* Collection Tab - New! */}
          <TabsContent value="collection" className="mt-6 space-y-8">
            {loadingRobots ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-neon-cyan" />
              </div>
            ) : (
              <>
                {/* Progress Overview */}
                <div className="grid gap-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="text-neon-cyan">{t('collection_progress')}</span>
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                          {t('complete_remaining').replace('{count}', progress.remaining.toString())}
                        </span>
                      </h3>
                      <div className="h-2 w-64 bg-black/40 rounded-full overflow-hidden border border-white/10">
                        <div
                          className="h-full bg-gradient-to-r from-neon-cyan to-neon-blue transition-all duration-500"
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-orbitron text-neon-cyan">{progress.percent}%</div>
                      <div className="text-xs text-muted-foreground">{progress.unlocked} / {progress.total} {t('unlocked_status')}</div>
                    </div>
                  </div>
                </div>

                {/* Role Sections */}
                {ROLES.map(role => {
                  const roleSlots = getSlotsByRole(role);
                  const roleProgress = progress.byRole[role];
                  const roleLabel = ROLE_LABELS[role];
                  const roleColorClass = ROLE_COLORS[role]?.split(" ")[0] || "border-white/20";

                  return (
                    <div key={role} className="space-y-4">
                      <div className={`flex items-center justify-between border-l-4 pl-3 py-1 ${roleColorClass}`}>
                        <div>
                          <h4 className="font-bold text-lg text-white">{roleLabel.en} <span className="text-xs opacity-60 ml-2">{roleLabel.ja}</span></h4>
                        </div>
                        <div className="text-sm font-orbitron">
                          {roleProgress.unlocked} / {roleProgress.total}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                        {roleSlots.map(slot => {
                          const robot = getRobotForSlot(slot.id);
                          const unlocked = !!robot;

                          const placeholders = slotPlaceholders.get(slot.id);

                          return (
                            <Interactive
                              key={slot.id}
                              className="rounded-xl overflow-hidden h-full"
                              onClick={() => !unlocked && setHintSlot(slot)}
                            >
                              <CollectionSlot
                                role={slot.role}
                                rarity={slot.rarity}
                                robot={robot}
                                unlocked={unlocked}
                                placeholderParts={placeholders?.parts}
                                placeholderColors={placeholders?.colors}
                              />
                            </Interactive>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </TabsContent>

          {/* Robots Tab - Original List View */}
          <TabsContent value="robots" className="mt-4">

            {/* Phase B: Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-4 bg-black/20 p-2 rounded-lg border border-white/5">
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[130px] h-8 text-xs bg-black/40 border-white/10 font-orbitron">
                  <SelectValue placeholder="ROLE" />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-white/20">
                  <SelectItem value="ALL">{t('filter_all_roles')}</SelectItem>
                  <SelectItem value="ATTACKER">{t('filter_striker')}</SelectItem>
                  <SelectItem value="TANK">{t('filter_tank')}</SelectItem>
                  <SelectItem value="SPEED">{t('filter_speed')}</SelectItem>
                  <SelectItem value="SUPPORT">{t('filter_support')}</SelectItem>
                  <SelectItem value="BALANCE">{t('filter_balance')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterRarity} onValueChange={setFilterRarity}>
                <SelectTrigger className="w-[130px] h-8 text-xs bg-black/40 border-white/10 font-orbitron">
                  <SelectValue placeholder="RARITY" />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-white/20">
                  <SelectItem value="ALL">{t('filter_all_rarities')}</SelectItem>
                  <SelectItem value="legendary">{t('filter_legendary')}</SelectItem>
                  <SelectItem value="rare">{t('filter_rare')}</SelectItem>
                  <SelectItem value="common">{t('filter_common')}</SelectItem>
                </SelectContent>
              </Select>

              <div className="ml-auto text-xs text-white/50 font-orbitron mr-2">
                {t('units_count').replace('{count}', filteredRobots.length.toString())}
              </div>
            </div>

            {loadingRobots ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => (
                  <SystemSkeleton key={i} className="h-32 w-full rounded-xl" text="LOADING UNIT..." showText={false} />
                ))}
              </div>
            ) : robots.length === 0 ? (
              <EmptyState
                title={t('no_robots_msg')}
                description={t('dex_empty_desc')}
                icon={ScanBarcode}
                action={{ label: t('dex_empty_action'), onClick: () => setLocation("/") }}
              />
            ) : filteredRobots.length === 0 ? (
              <EmptyState
                title={t('no_filtered_robots')}
                description={t('dex_empty_filtered_desc')}
                icon={Filter}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredRobots.map((r) => (
                  <LazyRender key={r.id} minHeight="120px">
                    <Interactive className="bg-black/30 border-white/10 rounded-xl">
                      <CardContent className="p-4 flex gap-4 h-full">
                        <div className="shrink-0 w-[96px] h-[96px] flex items-center justify-center rounded border border-white/10 bg-black/20" data-testid="owned-robot-card">
                          {r.parts && r.colors ? (
                            <RobotSVG
                              parts={r.parts}
                              colors={r.colors}
                              size={90}
                              simplified={true}
                              role={typeof r.role === 'string' ? r.role : undefined}
                              rarityEffect={r.rarityTier === 'legendary' ? 'legendary' : (r.rarityTier === 'rare' ? 'rare' : undefined)}
                              renderQuality="list"
                            />
                          ) : <div className="text-xs text-muted-foreground">{t('no_preview')}</div>}
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-bold truncate">{r.name || t('label_unnamed')}</div>
                              <div className="text-[11px] text-muted-foreground font-mono" data-testid={`robot-id-${r.id}`} title={`ID: ${r.id}`}>ID: {shortId(r.id)}</div>
                              {r.parts && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {(() => {
                                    // Extract numeric seed from ID if possible, or simple hash
                                    const seed = parseInt(r.id.slice(-4), 16) || 0;
                                    const tier = getRarityTier(seed);
                                    const motif = getMotif(seed);
                                    return (
                                      <>
                                        <Badge
                                          variant="outline"
                                          className={`text-[10px] ${tier === "B_ACE"
                                            ? "neon-border-cyan text-neon-cyan bg-neon-cyan/10"
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
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button
                              size="sm"
                              variant={activeUnitId === r.id ? "default" : "outline"}
                              className="h-8 text-[11px]"
                              onClick={() => handleSetActiveUnit(r.id)}
                            >
                              {activeUnitId === r.id ? (
                                <>
                                  <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                                  {t("active_unit_current")}
                                </>
                              ) : (
                                <Star className="w-3 h-3 mr-1" />
                              )}
                              {activeUnitId !== r.id && t("set_active_unit")}
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => handleBattle(r.id)}>
                              {t('battle_with_this')}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-[11px]"
                              onClick={() => goToWorkshop(r.id)}
                            >
                              {t('use_in_workshop')}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Interactive>
                  </LazyRender>
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
              <EmptyState
                title={t('no_variants_msg')}
                description={t('variants_empty_desc')}
                icon={Swords}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {variants.map((v) => (
                  <LazyRender key={v.id} minHeight="120px">
                    <Interactive className="bg-black/30 border-white/10 rounded-xl">
                      <CardContent className="p-4 flex gap-4 h-full">
                        <div className="shrink-0 w-[96px] h-[96px] flex items-center justify-center rounded border border-white/10 bg-black/20" data-testid="owned-robot-card">
                          {v.parts && v.colors ? <RobotSVG parts={v.parts} colors={v.colors} size={90} simplified={true} renderQuality="list" /> : <div className="text-xs text-muted-foreground">{t('no_preview')}</div>}
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
                                          ? "neon-border-cyan text-neon-cyan bg-neon-cyan/10"
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
                            {t('parents_label')} {shortId(v.parentRobotIds?.[0])} + {shortId(v.parentRobotIds?.[1])}
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => setLocation(`/battle?selected=${encodeURIComponent(v.id || "")}`)} disabled={!v.id}>
                              {t('battle_with_this')}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-[11px]"
                              onClick={() => goToWorkshop(v.parentRobotIds?.[0], v.parentRobotIds?.[1])}
                              disabled={!v.parentRobotIds?.[0] || !v.parentRobotIds?.[1]}
                              title={!v.parentRobotIds?.[0] || !v.parentRobotIds?.[1] ? t('parents_missing') : undefined}
                            >
                              {t('use_in_workshop')}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Interactive>
                  </LazyRender>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        <AdBanner />

        {/* Hint Dialog */}
        <Dialog open={!!hintSlot} onOpenChange={(open) => !open && setHintSlot(null)}>
          <DialogContent className="bg-card border-neon-cyan text-foreground max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-neon-cyan flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                {t('dex_hint_title') || "未発見のユニット"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground pt-2">
                {hintSlot && (hintSlot.rarity <= 2
                  ? (t('dex_hint_scan') || "このロボットはスキャンで発見できるかも！？\n色々なバーコードを試してみよう！")
                  : (t('dex_hint_workshop') || "このレアなロボットはワークショップで\n合体してゲットできるかも！？")
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
              {hintSlot && (
                <Button
                  className="w-full bg-neon-cyan text-black hover:bg-neon-cyan/80 font-bold"
                  onClick={() => {
                    setLocation(hintSlot.rarity <= 2 ? '/scan' : '/workshop');
                    setHintSlot(null);
                  }}
                >
                  {hintSlot.rarity <= 2
                    ? (t('dex_btn_scan') || "スキャンへ移動")
                    : (t('dex_btn_workshop') || "ワークショップへ移動")}
                </Button>
              )}
              <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setHintSlot(null)}>
                {t('close') || "閉じる"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
