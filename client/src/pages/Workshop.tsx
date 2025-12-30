import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { collection, getDocs, doc, getDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { ArrowLeft, Loader2, Plus, RefreshCw, AlertCircle, Trash2, Pencil } from "lucide-react";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
    const [userLimit, setUserLimit] = useState(0);

    // Animation
    const [fusionResult, setFusionResult] = useState<VariantData | null>(null);
    const [showAnimation, setShowAnimation] = useState(false);

    // Deletion
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Renaming
    const [variantName, setVariantName] = useState("");
    const [renameTarget, setRenameTarget] = useState<{ id: string, name: string } | null>(null);

    const fetchAll = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Fetch User Data for Limit
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                setUserProfile(data);
                setUserLimit(data.workshopLines || 0);
            }

            // Fetch Robots
            const rSnap = await getDocs(collection(db, "users", user.uid, "robots"));
            const rList = rSnap.docs.map(d => ({ id: d.id, ...d.data() } as RobotData));
            setRobots(rList);

            // Fetch Variants
            const vSnap = await getDocs(collection(db, "users", user.uid, "variants"));
            const vList = vSnap.docs.map(d => ({ id: d.id, ...d.data() } as VariantData));
            setVariants(vList);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load workshop data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, [user]);

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
            let msg = "Manufacture failed";
            // Error Mapping
            if (e.code === 'resource-exhausted' || e.message?.includes('resource-exhausted')) {
                msg = "製造ラインが満杯です (Workshop Full)";
            } else if (e.code === 'failed-precondition' || e.message?.includes('Insufficient credits')) {
                msg = "クレジットが不足しています (Insufficient Credits)";
            } else if (e.code === 'already-exists') {
                msg = "既に存在します (Already Exists)";
            }
            toast.error(msg);
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingId || !user) return;
        try {
            await deleteDoc(doc(db, "users", user.uid, "variants", deletingId));
            toast.success("Variant scrapped (deleted)");
            setVariants(prev => prev.filter(v => v.id !== deletingId));
        } catch (e) {
            console.error(e);
            toast.error("Failed to delete");
        } finally {
            setDeletingId(null);
        }
    };

    const handleRename = async () => {
        if (!renameTarget || !user) return;
        try {
            await updateDoc(doc(db, "users", user.uid, "variants", renameTarget.id), {
                name: renameTarget.name
            });
            toast.success("Renamed successfully");
            setVariants(prev => prev.map(v => v.id === renameTarget.id ? { ...v, name: renameTarget.name } : v));
            setRenameTarget(null);
        } catch (e) {
            console.error(e);
            toast.error("Failed to rename");
        }
    };

    // Helper to find robot details
    const getRobot = (id: string) => robots.find(r => r.id === id);

    // Derived State
    const VARIANT_COST = 5;
    const nowJST = new Date().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
    const isFreeToday = userProfile && userProfile.lastFreeVariantDate !== nowJST;
    const userCredits = userProfile?.credits || 0;
    const canAfford = isFreeToday || userCredits >= VARIANT_COST;
    const isFull = variants.length >= userLimit;

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
                            CREDITS: {userCredits}
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
                                {isFreeToday ? "0 (Daily Free!)" : `${VARIANT_COST} Credits`}
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
                            Fuse Appearance ({isFreeToday ? "Free" : `${VARIANT_COST} Cr`})
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
                                    <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="secondary"
                                            size="icon"
                                            className="h-8 w-8 rounded-full bg-black/60 hover:bg-black/80"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setRenameTarget({ id: v.id || "", name: v.name || "" });
                                            }}
                                        >
                                            <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="h-8 w-8 rounded-full"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeletingId(v.id || "");
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
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

            <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Scrap Variant?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this variant. You can create it again later if you have the credits.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Scrap (Delete)
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Rename Dialog */}
            <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Variant</DialogTitle>
                        <DialogDescription>
                            Give your fusion unit a custom name.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        {renameTarget && (
                            <Input
                                value={renameTarget.name}
                                onChange={(e) => setRenameTarget({ ...renameTarget, name: e.target.value })}
                                maxLength={20}
                            />
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancel</Button>
                        <Button onClick={handleRename}>Save Name</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Fusion Animation Overlay */}
            {showAnimation && fusionResult && (
                <FusionAnimation
                    parentA={getRobot(fusionResult.parentRobotIds[0])!}
                    parentB={getRobot(fusionResult.parentRobotIds[1])!}
                    result={fusionResult}
                    onClose={() => {
                        setShowAnimation(false);
                        setFusionResult(null);
                        fetchAll();
                        toast.success("Variant added to collection!");
                    }}
                />
            )}
        </div>
    );
}
