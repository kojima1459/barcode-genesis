import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { Loader2, Swords, Factory } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RobotSVG from "@/components/RobotSVG";
import SEO from "@/components/SEO";
import { RobotData, VariantData } from "@/types/shared";
import { getMotif, getMotifLabel, getRarityLabel, getRarityTier, getRobotSeed } from "@/lib/rarity";
import { LOGIN_BADGES, getBadgeLabel } from "@/lib/badges";

function shortId(id?: string) {
  if (!id) return "—";
  return id.length <= 8 ? id : `${id.slice(0, 4)}…${id.slice(-3)}`;
}

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

  const robotsEmpty = !loadingRobots && robots.length === 0;
  const variantsEmpty = !loadingVariants && variants.length === 0;

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

    setLocation(`/workshop?a=${encodeURIComponent(nextA)}${nextB ? `&b=${encodeURIComponent(nextB)}` : ""}`); // REF: A3
  };

  const statsLine = useMemo(
    () => (r: RobotData) => `Lv.${r.level ?? 1}  HP ${r.baseHp ?? 0}  ATK ${r.baseAttack ?? 0}  DEF ${r.baseDefense ?? 0}  SPD ${r.baseSpeed ?? 0}`,
    [],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-4">
      <SEO title="Dex | Barcode Genesis" description="Your robots and variants." />

      <h1 className="text-2xl font-bold text-primary">Dex</h1>

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
                  className={`rounded border px-3 py-2 text-xs ${
                    owned ? "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan" : "border-white/10 bg-black/20 text-muted-foreground"
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

      <Tabs defaultValue="robots">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="robots">Robots ({robots.length})</TabsTrigger>
          <TabsTrigger value="variants">Variants ({variants.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="robots" className="mt-4">
          {loadingRobots ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-neon-cyan" />
            </div>
          ) : robotsEmpty ? (
            <div className="text-sm text-muted-foreground py-10 text-center border border-dashed rounded bg-black/10">
              まだロボットがありません。`/scan` から生成してください。
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {robots.map((r) => (
                <Card key={r.id} className="bg-black/30 border-white/10">
                  <CardContent className="p-4 flex gap-4">
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
                                      className={`text-[10px] ${
                                        tier === "B_ACE"
                                          ? "border-neon-cyan/40 text-neon-cyan bg-neon-cyan/10"
                                          : "border-white/10 text-muted-foreground"
                                      }`}
                                    >
                                      {getRarityLabel(tier)}
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className={`text-[10px] ${
                                        motif === "EVA"
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
                      <div className="text-[11px] text-muted-foreground font-mono">{statsLine(r)}</div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button size="sm" variant="default" onClick={() => setLocation(`/battle?selected=${encodeURIComponent(r.id)}`)}>
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
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="variants" className="mt-4">
          {loadingVariants ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-neon-cyan" />
            </div>
          ) : variantsEmpty ? (
            <div className="text-sm text-muted-foreground py-10 text-center border border-dashed rounded bg-black/10">
              まだバリアントがありません。`/workshop` で作成できます。
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {variants.map((v) => (
                <Card key={v.id} className="bg-black/30 border-white/10">
                  <CardContent className="p-4 flex gap-4">
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
                                    className={`text-[10px] ${
                                      tier === "B_ACE"
                                        ? "border-neon-cyan/40 text-neon-cyan bg-neon-cyan/10"
                                        : "border-white/10 text-muted-foreground"
                                    }`}
                                  >
                                    {getRarityLabel(tier)}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] ${
                                      motif === "EVA"
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
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
