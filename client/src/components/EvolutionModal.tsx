import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Check, Zap } from "lucide-react";
import { functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { toast } from "sonner";
import { RobotData } from "@/types/shared";
import RobotSVG from "@/components/RobotSVG";

const FAMILY_NAMES = ["DRINK", "SNACK", "DAILY", "BEAUTY", "OTHER"];

// Helper to get family from barcode (backward compat)
const getFamilyFromBarcode = (barcode: string): number => {
    const d0 = parseInt(barcode[0], 10) || 0;
    const d1 = parseInt(barcode[1], 10) || 0;
    return ((d0 + d1) % 5) + 1;
};

interface EvolutionModalProps {
    isOpen: boolean;
    onClose: () => void;
    target: RobotData;
    allRobots: RobotData[];
    onSuccess: () => void;
}

export default function EvolutionModal({ isOpen, onClose, target, allRobots, onSuccess }: EvolutionModalProps) {
    const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
    const [isEvolving, setIsEvolving] = useState(false);

    // Get target's family
    const targetBarcode = target.sourceBarcode || target.id;
    const targetFamily = target.family ?? getFamilyFromBarcode(targetBarcode);
    const targetFamilyName = FAMILY_NAMES[targetFamily - 1] || "UNKNOWN";

    // Filter candidates: same family, exclude target
    const candidates = useMemo(() => {
        return allRobots.filter((r) => {
            if (r.id === target.id) return false;
            const barcode = r.sourceBarcode || r.id;
            const family = r.family ?? getFamilyFromBarcode(barcode);
            return family === targetFamily;
        });
    }, [allRobots, target.id, targetFamily]);

    const toggleMaterial = (id: string) => {
        setSelectedMaterials((prev) => {
            if (prev.includes(id)) {
                return prev.filter((x) => x !== id);
            }
            if (prev.length >= 2) {
                // Replace oldest
                return [prev[1], id];
            }
            return [...prev, id];
        });
    };

    const handleEvolve = async () => {
        if (selectedMaterials.length !== 2) {
            toast.error("素材を2体選択してください");
            return;
        }

        setIsEvolving(true);
        try {
            const evolveRobot = httpsCallable(functions, "evolveRobot");
            const result = await evolveRobot({
                targetBarcode,
                materialBarcodes: selectedMaterials,
            });

            const data = result.data as { success: boolean; evolutionLevel: number; newStats: any };
            toast.success(`進化成功！ Lv ${data.evolutionLevel} に進化しました`);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Evolution error:", error);
            const code = error?.code || "";
            const msg = error?.message || "進化に失敗しました";

            if (code.includes("unauthenticated")) {
                toast.error("ログインしてください");
            } else if (code.includes("invalid-argument")) {
                toast.error("入力が不正です");
            } else if (code.includes("not-found")) {
                toast.error("対象ロボが見つかりません");
            } else if (code.includes("failed-precondition")) {
                toast.error("同じカテゴリの素材を選んでください");
            } else if (code.includes("permission-denied")) {
                toast.error("権限がありません");
            } else {
                toast.error(msg);
            }
        } finally {
            setIsEvolving(false);
        }
    };

    const handleClose = () => {
        if (!isEvolving) {
            setSelectedMaterials([]);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-500" />
                        進化
                    </DialogTitle>
                    <DialogDescription>
                        同じカテゴリ（{targetFamilyName}）のロボットを2体選んで進化させましょう。
                        選んだロボットは消費されます。
                    </DialogDescription>
                </DialogHeader>

                {/* Target Robot */}
                <div className="flex items-center gap-4 p-3 bg-secondary/20 rounded-lg mb-4">
                    <div className="w-16 h-16 shrink-0">
                        <RobotSVG
                            parts={target.parts}
                            colors={target.colors}
                            size={64}
                            animate={false}
                        />
                    </div>
                    <div>
                        <div className="font-bold">{target.name}</div>
                        <div className="text-sm text-muted-foreground">
                            進化レベル: {target.evolutionLevel || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            ATK {target.baseAttack} / DEF {target.baseDefense} / HP {target.baseHp}
                        </div>
                    </div>
                </div>

                {/* Material Selection */}
                <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">
                        素材を選択 ({selectedMaterials.length}/2)
                    </h4>
                    {candidates.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            同じカテゴリのロボットがいません。
                        </p>
                    ) : (
                        <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                            {candidates.map((r) => {
                                const isSelected = selectedMaterials.includes(r.id);
                                return (
                                    <Card
                                        key={r.id}
                                        className={`cursor-pointer transition-all ${isSelected ? "ring-2 ring-primary border-primary" : "hover:border-primary/50"
                                            }`}
                                        onClick={() => toggleMaterial(r.id)}
                                    >
                                        <CardContent className="p-2 relative">
                                            {isSelected && (
                                                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                                    <Check className="w-3 h-3 text-primary-foreground" />
                                                </div>
                                            )}
                                            <div className="flex justify-center mb-1">
                                                <RobotSVG
                                                    parts={r.parts}
                                                    colors={r.colors}
                                                    size={40}
                                                    animate={false}
                                                />
                                            </div>
                                            <div className="text-[10px] truncate text-center">{r.name}</div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isEvolving}>
                        キャンセル
                    </Button>
                    <Button
                        onClick={handleEvolve}
                        disabled={selectedMaterials.length !== 2 || isEvolving}
                    >
                        {isEvolving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                進化中...
                            </>
                        ) : (
                            <>
                                <Zap className="w-4 h-4 mr-2" />
                                進化する
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
