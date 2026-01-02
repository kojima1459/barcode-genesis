import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { collection, orderBy, query, getDocs } from "firebase/firestore";
import { ArrowLeft, Loader2, Plus, RefreshCw, AlertCircle, Trash2 } from "lucide-react";
import RobotSVG from "@/components/RobotSVG";
import { Link } from "wouter";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { RobotData, VariantData, RobotParts } from "@/types/shared";
import SEO from "@/components/SEO";
import { useUserData } from "@/hooks/useUserData";
import { Interactive } from "@/components/ui/interactive";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import FusionAnimation from "@/components/FusionAnimation";
import { SystemSkeleton } from "@/components/ui/SystemSkeleton";

export default function Workshop() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [robots, setRobots] = useState<RobotData[]>([]);
    const [variants, setVariants] = useState<VariantData[]>([]);
    const [loading, setLoading] = useState(true);

    // Centralized User Data
    const { userData: userProfile, workshopLines: userLimit, loading: loadingUser } = useUserData();

    // Create Mode
    const [robotAId, setRobotAId] = useState("");
    const [robotBId, setRobotBId] = useState("");
    const [creating, setCreating] = useState(false);

    // Limits
    // const [userLimit, setUserLimit] = useState(1); // Now from hook

    // Animation
    const [fusionResult, setFusionResult] = useState<VariantData | null>(null);
    const [showAnimation, setShowAnimation] = useState(false);

    // Renaming
    const [variantName, setVariantName] = useState("");

    // Deleting
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Preview preset (client-side only)
    const [previewPreset, setPreviewPreset] = useState<"A_DOMINANT" | "B_DOMINANT" | "HALF" | "ALT">("HALF");

    // const [loadingUser, setLoadingUser] = useState(true); // Now from hook
    const [loadingRobots, setLoadingRobots] = useState(true);
    const [loadingVariants, setLoadingVariants] = useState(true);

    // Load data function (reusable for refresh)
    const loadData = async () => {
        if (!user) return;

        setLoadingRobots(true);
        setLoadingVariants(true);

        try {
            const robotsQuery = query(collection(db, "users", user.uid, "robots"), orderBy("createdAt", "desc"));
            const robotSnap = await getDocs(robotsQuery);
            setRobots(robotSnap.docs.map(d => ({ id: d.id, ...d.data() } as RobotData)));
        } catch (error) {
            console.error(error);
            toast.error("Failed to load workshop data");
        } finally {
            setLoadingRobots(false);
        }

        try {
            const variantsQuery = query(collection(db, "users", user.uid, "variants"), orderBy("createdAt", "desc"));
            const variantSnap = await getDocs(variantsQuery);
            setVariants(variantSnap.docs.map(d => ({ id: d.id, ...d.data() } as VariantData)));
        } catch (error) {
            console.error(error);
            toast.error(t('workshop_error_load'));
        } finally {
            setLoadingVariants(false);
        }
    };

    useEffect(() => {
        if (!user) return;
        loadData();
    }, [user]);

    useEffect(() => {
        setLoading(loadingUser || loadingRobots || loadingVariants); // REF: A4
    }, [loadingUser, loadingRobots, loadingVariants]);

    // Preselect parents from Dex navigation (?a=...&b=...)
    useEffect(() => {
        if (!user) return;
        const params = new URLSearchParams(window.location.search);
        const a = params.get("a") ?? sessionStorage.getItem("workshopParentA");
        const b = params.get("b") ?? sessionStorage.getItem("workshopParentB");
        if (a) setRobotAId(a);
        if (b) setRobotBId(b);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // Keep Dex navigation state in sync
    useEffect(() => {
        if (robotAId) sessionStorage.setItem("workshopParentA", robotAId);
        else sessionStorage.removeItem("workshopParentA");
        if (robotBId) sessionStorage.setItem("workshopParentB", robotBId);
        else sessionStorage.removeItem("workshopParentB");
    }, [robotAId, robotBId]);

    // Validate preselected IDs after robots load
    useEffect(() => {
        if (!robots.length) return;
        if (robotAId && !robots.some(r => r.id === robotAId)) {
            toast.message(t('workshop_error_parent_invalid_a'), { duration: 2000 });
            setRobotAId("");
        }
        if (robotBId && !robots.some(r => r.id === robotBId)) {
            toast.message(t('workshop_error_parent_invalid_b'), { duration: 2000 });
            setRobotBId("");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [robots.length]);

    const mapCreateVariantError = (e: any) => {
        const code = e?.code || e?.details?.code;
        const message = String(e?.message || "");
        if (code === "already-exists") return t('workshop_error_exists');
        if (code === "resource-exhausted" || message.includes("Workshop full") || message.includes("WORKSHOP_LIMIT_REACHED")) {
            return t('workshop_error_limit');
        }
        if (code === "failed-precondition" || message.includes("Insufficient credits")) return t('workshop_error_no_credits');
        if (code === "not-found") return t('workshop_error_not_found');
        return t('workshop_error_generic');
    };

    const handleCreate = async () => {
        if (!robotAId || !robotBId) return;
        if (robotAId === robotBId) {
            toast.error(t('workshop_error_same_robot'));
            return;
        }
        if (variants.length >= userLimit) {
            toast.error(t('workshop_error_full'));
            return;
        }

        setCreating(true);
        try {
            const createFn = httpsCallable(functions, 'createVariant');
            const res = await createFn({ robotIdA: robotAId, robotIdB: robotBId, name: variantName });
            const data = res.data as { variant: VariantData }; // CreateVariant returns { variantId, variant, ... }

            // Trigger Animation
            setFusionResult(data.variant);
            setShowAnimation(true);

            // Cleanup form immediately
            setRobotAId("");
            setRobotBId("");
            setVariantName("");
            // Data refresh happens after animation closes
        } catch (e: any) {
            console.error(e);
            toast.error(mapCreateVariantError(e));
        } finally {
            setCreating(false);
        }
    };

    // Variants are read-only from client in this flow. // REF: A2

    // Helper to find robot details
    const getRobot = (id: string) => robots.find(r => r.id === id);

    const previewRobot = useMemo(() => {
        const a = getRobot(robotAId);
        const b = getRobot(robotBId);
        if (!a || !b) return null;

        const takeParts = (source: "A" | "B") => (source === "A" ? a.parts : b.parts);
        const baseParts = previewPreset === "A_DOMINANT" ? takeParts("A") : previewPreset === "B_DOMINANT" ? takeParts("B") : null;

        const parts =
            baseParts ??
            ({
                ...a.parts,
                ...(previewPreset === "ALT"
                    ? {
                        head: a.parts.head,
                        face: a.parts.face,
                        body: b.parts.body,
                        armLeft: a.parts.armLeft,
                        armRight: a.parts.armRight,
                        legLeft: b.parts.legLeft,
                        legRight: b.parts.legRight,
                        backpack: b.parts.backpack,
                        weapon: a.parts.weapon,
                        accessory: b.parts.accessory,
                    }
                    : {
                        head: a.parts.head,
                        face: a.parts.face,
                        body: b.parts.body,
                        armLeft: a.parts.armLeft,
                        armRight: a.parts.armRight,
                        legLeft: b.parts.legLeft,
                        legRight: b.parts.legRight,
                        backpack: a.parts.backpack,
                        weapon: b.parts.weapon,
                        accessory: a.parts.accessory,
                    }),
            } as RobotParts);

        const colors =
            previewPreset === "A_DOMINANT"
                ? a.colors
                : previewPreset === "B_DOMINANT"
                    ? b.colors
                    : {
                        primary: a.colors.primary,
                        secondary: b.colors.secondary,
                        accent: a.colors.accent,
                        glow: b.colors.glow,
                    };

        return { parts, colors };
    }, [previewPreset, robotAId, robotBId, robots]);

    // Self-healing: detect ghost capacity issues
    // If variants array is empty but we're showing FULL, something is wrong
    useEffect(() => {
        if (!loading && variants.length === 0 && userLimit > 0) {
            // Clear any sessionStorage workshop-related keys that might cause issues
            const keysToCheck = ['workshopParentA', 'workshopParentB'];
            keysToCheck.forEach(key => {
                const val = sessionStorage.getItem(key);
                if (val && !robots.some(r => r.id === val)) {
                    sessionStorage.removeItem(key);
                    console.log(`[Workshop] Cleared orphan session key: ${key}`);
                }
            });
        }
    }, [loading, variants.length, userLimit, robots]);

    // Derived State
    const VARIANT_COST = 5;
    const nowJST = new Date().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
    const dailyFreeKnown = !!userProfile && userProfile.lastFreeVariantDate != null;
    const isFreeToday = dailyFreeKnown ? userProfile.lastFreeVariantDate !== nowJST : null;
    const userCredits = typeof userProfile?.credits === "number" ? userProfile.credits : null;
    // Fix: Allow creation when loading (isFreeToday === null) if user has credits
    const canAfford = isFreeToday === true || (isFreeToday === null && (userCredits == null || userCredits >= VARIANT_COST)) || (isFreeToday === false && userCredits != null && userCredits >= VARIANT_COST);
    // FIXED: Only consider FULL when loading is complete AND variants actually exist
    // If variants.length is 0, never show as FULL (prevents ghost capacity bug)
    const isFull = !loading && userLimit > 0 && variants.length > 0 && variants.length >= userLimit;

    // Calculate next capacity level threshold
    const getNextCapacityLevel = (currentLimit: number): number | null => {
        if (currentLimit < 1) return 5;
        if (currentLimit < 2) return 5;
        if (currentLimit < 3) return 10;
        if (currentLimit < 4) return 15;
        if (currentLimit < 5) return 20;
        if (currentLimit < 6) return 25;
        if (currentLimit < 7) return 30;
        return null; // Max capacity reached
    };
    const nextCapacityLevel = getNextCapacityLevel(userLimit);

    // Handle variant deletion
    const handleDeleteVariant = async (variantId: string) => {
        if (!confirm(t('workshop_confirm_delete'))) return;

        setDeletingId(variantId);
        try {
            const deleteVariantFn = httpsCallable(functions, 'deleteVariant');
            await deleteVariantFn({ variantId });
            toast.success(t('workshop_variant_deleted'));
            // Refresh data since we no longer have real-time subscription
            loadData();
        } catch (e: any) {
            console.error('Delete variant error:', e);
            toast.error(t('workshop_delete_failed'));
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-dark-bg p-6">
                <SystemSkeleton
                    className="w-full max-w-2xl aspect-video rounded-3xl"
                    text={t('workshop_loading_text')}
                    subtext={t('workshop_loading_subtext')}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20 pt-[env(safe-area-inset-top)]"
            style={{ paddingBottom: "calc(var(--bottom-nav-height) + 2rem)" }}>
            <SEO title={t('workshop')} description={t('workshop_desc')} />
            {/* Backgrounds */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none" />

            {/* Header */}
            <header className="flex items-center mb-8 max-w-4xl mx-auto w-full z-10 relative">
                <Link href="/profile">
                    <Button variant="ghost" className="mr-4"><ArrowLeft className="mr-2 h-5 w-5" /> {t('button_back')}</Button>
                </Link>
                <h1 className="text-2xl font-bold text-primary">{t('workshop_title')}</h1>
            </header>

            <main className="max-w-4xl mx-auto w-full space-y-8 z-10 relative">

                {/* Create Section */}
                <Card className="border-primary/20 bg-black/40 backdrop-blur relative overflow-hidden">
                    {/* Status Banner */}
                    <div className="absolute top-0 right-0 p-4 text-xs font-mono text-right space-y-1 bg-black/50 rounded-bl-xl border-b border-l border-white/10">
                        <div className={isFull ? "text-red-400" : "text-neon-cyan"}>
                            {t('workshop_variant_holdings')} {variants.length} / {userLimit}
                            {isFull && <span className="text-[10px] ml-1">({t('workshop_full')})</span>}
                        </div>
                        {isFull && nextCapacityLevel && (
                            <div className="text-[10px] text-yellow-400">
                                {t('workshop_level_up_hint').replace('{level}', String(nextCapacityLevel))}
                            </div>
                        )}
                        <div className={canAfford ? "text-green-400" : "text-red-400"}>
                            {t('label_credits_label')} {userCredits == null ? "…" : userCredits}
                        </div>
                    </div>

                    <CardHeader>
                        <CardTitle className="flex flex-col gap-1">
                            <span>{t('workshop_create_variant')}</span>
                            <span className="text-sm font-normal text-muted-foreground">{t('workshop_create_desc')}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* Cost Box */}
                        <div className="bg-secondary/10 border border-white/5 rounded-lg p-3 flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2">
                                <RefreshCw className="w-4 h-4 text-primary" />
                                {t('workshop_craft_cost')}
                            </span>
                            <span className={`font-bold ${isFreeToday ? "text-green-400" : "text-amber-400"}`}>
                                {isFreeToday === true ? t('workshop_free_daily') : isFreeToday === null ? "…" : t('workshop_cost_credits').replace('{cost}', String(VARIANT_COST))}
                            </span>
                        </div>

                        {/* Error Alert if blocked */}
                        {isFull && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{t('workshop_error_full')}</AlertDescription>
                            </Alert>
                        )}
                        {!isFull && !canAfford && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{t('workshop_error_insufficient_credits')}</AlertDescription>
                            </Alert>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                            {/* Input A */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('workshop_material_a')}</label>
                                <Select value={robotAId} onValueChange={setRobotAId}>
                                    <SelectTrigger><SelectValue placeholder={t('workshop_select_robot')} /></SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {robots.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {robotAId && (
                                    <div className="h-32 flex justify-center border border-dashed border-white/10 rounded bg-black/20 p-2">
                                        <RobotSVG parts={getRobot(robotAId)!.parts} colors={getRobot(robotAId)!.colors} size={120} animate={false} />
                                    </div>
                                )}
                            </div>

                            {/* Plus */}
                            <div className="flex flex-col justify-center items-center gap-4">
                                <Plus className="h-8 w-8 text-muted-foreground" />
                                <div className="w-full space-y-2">
                                    <label className="text-xs font-medium mb-1 block text-center">{t('workshop_fusion_preset')}</label>
                                    <Select value={previewPreset} onValueChange={(v) => setPreviewPreset(v as "A_DOMINANT" | "B_DOMINANT" | "HALF" | "ALT")}>
                                        <SelectTrigger><SelectValue placeholder={t('workshop_fusion_preset')} /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="HALF">{t('workshop_preset_half')}</SelectItem>
                                            <SelectItem value="ALT">{t('workshop_preset_alt')}</SelectItem>
                                            <SelectItem value="A_DOMINANT">{t('workshop_preset_a_dominant')}</SelectItem>
                                            <SelectItem value="B_DOMINANT">{t('workshop_preset_b_dominant')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {previewRobot && (
                                        <div className="h-32 flex justify-center border border-dashed border-white/10 rounded bg-black/20 p-2">
                                            <RobotSVG parts={previewRobot.parts} colors={previewRobot.colors} size={120} animate={false} />
                                        </div>
                                    )}
                                </div>
                                <div className="w-full">
                                    <label className="text-xs font-medium mb-1 block text-center">{t('workshop_variant_name')}</label>
                                    <Input
                                        placeholder={t('workshop_name_placeholder')}
                                        value={variantName}
                                        onChange={(e) => setVariantName(e.target.value)}
                                        className="bg-black/20 text-center"
                                        maxLength={20}
                                    />
                                </div>
                            </div>

                            {/* Input B */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t('workshop_material_b')}</label>
                                <Select value={robotBId} onValueChange={setRobotBId}>
                                    <SelectTrigger><SelectValue placeholder={t('workshop_select_robot')} /></SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {robots.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {robotBId && (
                                    <div className="h-32 flex justify-center border border-dashed border-white/10 rounded bg-black/20 p-2">
                                        <RobotSVG parts={getRobot(robotBId)!.parts} colors={getRobot(robotBId)!.colors} size={120} animate={false} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <Button
                            className="w-full"
                            size="lg"
                            disabled={!robotAId || !robotBId || creating || isFull || !canAfford || robotAId === robotBId}
                            onClick={handleCreate}
                        >
                            {creating ? <Loader2 className="animate-spin mr-2" /> : <RefreshCw className="mr-2" />}
                            {t('workshop_start_fusion')} ({isFreeToday === true ? t('label_free') : isFreeToday === null ? "…" : `${VARIANT_COST} ${t('label_credits_short')}`})
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                            {t('workshop_fusion_note')}
                        </p>
                    </CardContent>
                </Card>

                {/* List Section */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold">{t('workshop_owned_variants').replace('{count}', String(variants.length))}</h2>
                    {variants.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground border border-dashed rounded bg-black/20">
                            {t('workshop_no_variants')}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {variants.map(v => (
                                <Interactive key={v.id} className="overflow-hidden bg-black/40 border-white/10 relative group h-auto rounded-xl">
                                    {/* Delete button - visible on hover */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteVariant(v.id);
                                        }}
                                        disabled={deletingId === v.id}
                                        className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-red-500/20 border border-red-500/30 opacity-0 group-hover:opacity-100 hover:bg-red-500/40 transition-all disabled:opacity-50"
                                        title={t('workshop_scrap_btn')}
                                    >
                                        {deletingId === v.id ? (
                                            <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4 text-red-400" />
                                        )}
                                    </button>
                                    <CardContent className="p-4 flex flex-col items-center space-y-2">
                                        {v.parts && (
                                            <RobotSVG parts={v.parts} colors={v.colors} size={140} />
                                        )}
                                        <div className="text-sm font-bold truncate w-full text-center px-1">{v.name || `Variant ${v.id?.slice(0, 4)}`}</div>
                                        <div className="flex gap-2 text-xs text-muted-foreground w-full justify-center">
                                            <span className="bg-secondary/20 px-1 rounded">{t('workshop_label_fusion')}</span>
                                        </div>
                                    </CardContent>
                                </Interactive>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Fusion Animation Overlay */}
            {showAnimation && fusionResult && (
                <FusionAnimation
                    parentA={getRobot(fusionResult.parentRobotIds[0])!}
                    parentB={getRobot(fusionResult.parentRobotIds[1])!}
                    result={fusionResult}
                    onClose={() => {
                        setShowAnimation(false);
                        setFusionResult(null);
                        // Refresh data since we no longer have real-time subscription
                        loadData();
                        toast.success(t('workshop_success_variant'));
                    }}
                />
            )}
        </div>
    );
}
