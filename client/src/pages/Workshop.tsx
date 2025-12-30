import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { ArrowLeft, Loader2, Plus, RefreshCw, AlertCircle } from "lucide-react";
import RobotSVG from "@/components/RobotSVG";
import { Link } from "wouter";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { RobotData, VariantData } from "@/types/shared";
import SEO from "@/components/SEO";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import FusionAnimation from "@/components/FusionAnimation";

export default function Workshop() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [robots, setRobots] = useState<RobotData[]>([]);
    const [variants, setVariants] = useState<VariantData[]>([]);
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<any>(null);

    // Create Mode
    const [robotAId, setRobotAId] = useState("");
    const [robotBId, setRobotBId] = useState("");
    const [creating, setCreating] = useState(false);

    // Limits
    const [userLimit, setUserLimit] = useState(1);

    // Animation
    const [fusionResult, setFusionResult] = useState<VariantData | null>(null);
    const [showAnimation, setShowAnimation] = useState(false);

    // Renaming
    const [variantName, setVariantName] = useState("");

    // Preview preset (client-side only)
    const [previewPreset, setPreviewPreset] = useState<"A_DOMINANT" | "B_DOMINANT" | "HALF" | "ALT">("HALF");

    const [loadingUser, setLoadingUser] = useState(true);
    const [loadingRobots, setLoadingRobots] = useState(true);
    const [loadingVariants, setLoadingVariants] = useState(true);

    useEffect(() => {
        if (!user) return;

        setLoadingUser(true);
        setLoadingRobots(true);
        setLoadingVariants(true);

        const unsubUser = onSnapshot(
            doc(db, "users", user.uid),
            (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    setUserProfile(data);
                    setUserLimit(data.workshopLines || 0);
                }
                setLoadingUser(false);
            },
            (error) => {
                console.error(error);
                toast.error("Failed to load workshop data");
                setLoadingUser(false);
            }
        );

        const robotsQuery = query(collection(db, "users", user.uid, "robots"), orderBy("createdAt", "desc"));
        const unsubRobots = onSnapshot(
            robotsQuery,
            (snapshot) => {
                const rList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RobotData));
                setRobots(rList);
                setLoadingRobots(false);
            },
            (error) => {
                console.error(error);
                toast.error("Failed to load workshop data");
                setLoadingRobots(false);
            }
        );

        const variantsQuery = query(collection(db, "users", user.uid, "variants"), orderBy("createdAt", "desc"));
        const unsubVariants = onSnapshot(
            variantsQuery,
            (snapshot) => {
                const vList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as VariantData));
                setVariants(vList);
                setLoadingVariants(false);
            },
            (error) => {
                console.error(error);
                toast.error("Failed to load workshop data");
                setLoadingVariants(false);
            }
        );

        return () => {
            unsubUser();
            unsubRobots();
            unsubVariants();
        };
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
            toast.message("親Aに指定されたIDはロボットではありません（無視しました）", { duration: 2000 });
            setRobotAId("");
        }
        if (robotBId && !robots.some(r => r.id === robotBId)) {
            toast.message("親Bに指定されたIDはロボットではありません（無視しました）", { duration: 2000 });
            setRobotBId("");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [robots.length]);

    const mapCreateVariantError = (e: any) => {
        const code = e?.code || e?.details?.code;
        const message = String(e?.message || "");
        if (code === "already-exists") return "その組み合わせのバリアントは既に存在します";
        if (code === "resource-exhausted" || message.includes("Workshop full") || message.includes("WORKSHOP_LIMIT_REACHED")) {
            return "製造ラインが満杯です（上限を解放してください）";
        }
        if (code === "failed-precondition" || message.includes("Insufficient credits")) return "クレジットが不足しています";
        if (code === "not-found") return "親ロボットが見つかりません";
        return "製造に失敗しました。時間をおいて再度お試しください。";
    };

    const handleCreate = async () => {
        if (!robotAId || !robotBId) return;
        if (robotAId === robotBId) {
            toast.error("Choose two different robots");
            return;
        }
        if (variants.length >= userLimit) {
            toast.error("製造ラインが満杯です (Workshop Full)");
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
            } as any);

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

    // Derived State
    const VARIANT_COST = 5;
    const nowJST = new Date().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
    const dailyFreeKnown = !!userProfile && userProfile.lastFreeVariantDate != null;
    const isFreeToday = dailyFreeKnown ? userProfile.lastFreeVariantDate !== nowJST : null;
    const userCredits = typeof userProfile?.credits === "number" ? userProfile.credits : null;
    const canAfford = isFreeToday === true || userCredits == null || userCredits >= VARIANT_COST;
    const isFull = userLimit > 0 ? variants.length >= userLimit : false;

    if (loading && !robots.length) {
        return <div className="min-h-screen flex items-center justify-center bg-dark-bg"><Loader2 className="animate-spin text-neon-cyan" /></div>;
    }

    return (
        <div className="min-h-screen bg-dark-bg text-foreground p-4 pb-24 relative overflow-hidden">
            <SEO title="Workshop | Barcode Genesis" description="Combine robots to create cosmetic variants." />
            {/* Backgrounds */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none" />

            {/* Header */}
            <header className="flex items-center mb-8 max-w-4xl mx-auto w-full z-10 relative">
                <Link href="/profile">
                    <Button variant="ghost" className="mr-4"><ArrowLeft className="mr-2 h-5 w-5" /> {t('back') || 'Back'}</Button>
                </Link>
                <h1 className="text-2xl font-bold text-primary">Fusion Workshop</h1>
            </header>

            <main className="max-w-4xl mx-auto w-full space-y-8 z-10 relative">

                {/* Create Section */}
                <Card className="border-primary/20 bg-black/40 backdrop-blur relative overflow-hidden">
                    {/* Status Banner */}
                    <div className="absolute top-0 right-0 p-4 text-xs font-mono text-right space-y-1 bg-black/50 rounded-bl-xl border-b border-l border-white/10">
                        <div className={isFull ? "text-red-400" : "text-neon-cyan"}>
                            CAPACITY: {variants.length} / {userLimit} <span className="text-[10px] text-muted-foreground">{isFull ? '(FULL)' : ''}</span>
                        </div>
                        <div className={canAfford ? "text-green-400" : "text-red-400"}>
                            CREDITS: {userCredits == null ? "…" : userCredits}
                        </div>
                    </div>

                    <CardHeader>
                        <CardTitle className="flex flex-col gap-1">
                            <span>Create Variant</span>
                            <span className="text-sm font-normal text-muted-foreground">Select two units to fuse their appearance.</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* Cost Box */}
                        <div className="bg-secondary/10 border border-white/5 rounded-lg p-3 flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2">
                                <RefreshCw className="w-4 h-4 text-primary" />
                                製造コスト (Cost):
                            </span>
                            <span className={`font-bold ${isFreeToday ? "text-green-400" : "text-amber-400"}`}>
                                {isFreeToday === true ? "0 (Daily Free!)" : isFreeToday === null ? "…" : `${VARIANT_COST} Credits`}
                            </span>
                        </div>

                        {/* Error Alert if blocked */}
                        {isFull && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>製造ラインが満杯です。レベルを上げて上限を解放してください。 (Workshop Full)</AlertDescription>
                            </Alert>
                        )}
                        {!isFull && !canAfford && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>クレジットが不足しています。 (Insufficient Credits)</AlertDescription>
                            </Alert>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                            {/* Input A */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Source Unit A</label>
                                <Select value={robotAId} onValueChange={setRobotAId}>
                                    <SelectTrigger><SelectValue placeholder="Select Robot" /></SelectTrigger>
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
                                    <label className="text-xs font-medium mb-1 block text-center">Preview Preset</label>
                                    <Select value={previewPreset} onValueChange={(v) => setPreviewPreset(v as any)}>
                                        <SelectTrigger><SelectValue placeholder="Select preset" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="HALF">Half (A/B mix)</SelectItem>
                                            <SelectItem value="ALT">Alternate</SelectItem>
                                            <SelectItem value="A_DOMINANT">A Dominant</SelectItem>
                                            <SelectItem value="B_DOMINANT">B Dominant</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {previewRobot && (
                                        <div className="h-32 flex justify-center border border-dashed border-white/10 rounded bg-black/20 p-2">
                                            <RobotSVG parts={previewRobot.parts} colors={previewRobot.colors} size={120} animate={false} />
                                        </div>
                                    )}
                                </div>
                                <div className="w-full">
                                    <label className="text-xs font-medium mb-1 block text-center">Custom Name (Optional)</label>
                                    <Input
                                        placeholder="Naming..."
                                        value={variantName}
                                        onChange={(e) => setVariantName(e.target.value)}
                                        className="bg-black/20 text-center"
                                        maxLength={20}
                                    />
                                </div>
                            </div>

                            {/* Input B */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Source Unit B</label>
                                <Select value={robotBId} onValueChange={setRobotBId}>
                                    <SelectTrigger><SelectValue placeholder="Select Robot" /></SelectTrigger>
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
                            Fuse Appearance ({isFreeToday === true ? "Free" : isFreeToday === null ? "…" : `${VARIANT_COST} Cr`})
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                            Variants are cosmetic only. Stats are averaged from current parents.
                        </p>
                    </CardContent>
                </Card>

                {/* List Section */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold">Your Variants ({variants.length})</h2>
                    {variants.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground border border-dashed rounded bg-black/20">
                            No variants created yet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {variants.map(v => (
                                <Card key={v.id} className="overflow-hidden bg-black/40 border-white/10 transition-colors relative group">
                                    {/* Read-only list in client. */} {/* REF: A2 */}
                                    <CardContent className="p-4 flex flex-col items-center space-y-2">
                                        {v.parts && (
                                            <RobotSVG parts={v.parts} colors={v.colors} size={140} />
                                        )}
                                        <div className="text-sm font-bold truncate w-full text-center px-1">{v.name || `Variant ${v.id?.slice(0, 4)}`}</div>
                                        <div className="flex gap-2 text-xs text-muted-foreground w-full justify-center">
                                            <span className="bg-secondary/20 px-1 rounded">Fusion</span>
                                        </div>
                                    </CardContent>
                                </Card>
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
                        // Live listeners refresh data. // REF: A4
                        toast.success("Variant added to collection!");
                    }}
                />
            )}
        </div>
    );
}
