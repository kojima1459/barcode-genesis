import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Zap, HelpCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSound } from "@/contexts/SoundContext";
import { useHaptic } from "@/contexts/HapticContext";
import { useTutorial } from "@/contexts/TutorialContext";
import BarcodeScanner from "@/components/BarcodeScanner";
import RobotSVG from "@/components/RobotSVG";
import { callGenerateRobot } from "@/lib/functions";
import { RobotData } from "@/types/shared";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import GenerationAnimation from "@/components/GenerationAnimation";
import ShareCardModal from "@/components/ShareCardModal";
import { useRobotFx } from "@/hooks/useRobotFx";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import AdBanner from "@/components/AdBanner";
import RoleReveal from "@/components/RoleReveal";
import { isSpecialRare } from "@/lib/rarity";
import { Interactive } from "@/components/ui/interactive";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { ROLE_COLORS, ROLE_LABELS } from "@/lib/dexRegistry";

const getCallableErrorCode = (error: unknown) => {
    if (error && typeof error === "object" && "code" in error) {
        const raw = String((error as { code?: unknown }).code);
        return raw.replace("functions/", "");
    }
    return "";
};

export default function Scan() {
    const { t } = useLanguage();
    const { playSE } = useSound();
    const [, setLocation] = useLocation();
    const [mode, setMode] = useState<'scan' | 'generating' | 'revealing' | 'result'>('scan');
    const [robot, setRobot] = useState<RobotData | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [limitMessage, setLimitMessage] = useState("");
    const [isRare, setIsRare] = useState(false);
    const [scannedBarcode, setScannedBarcode] = useState("");

    const { triggerHaptic } = useHaptic();

    const { completeStep } = useTutorial();
    const { fx, trigger } = useRobotFx();

    const handleScan = async (barcode: string) => {
        triggerHaptic('medium');
        completeStep('SCAN_BARCODE');

        setIsGenerating(true);
        setMode('generating');
        // Reset robot state
        setRobot(null);

        // Minimum animation time promise (6.5s matched to GenerationAnimation)
        const animationPromise = new Promise(resolve => setTimeout(resolve, 6500));

        try {
            let shouldAbort = false;
            try {
                const awardScanToken = httpsCallable(functions, "awardScanToken");
                await awardScanToken({ barcode, source: "camera" });
            } catch (error: any) {
                const code = getCallableErrorCode(error);
                if (code === "already-exists") {
                    toast("今日はそのバーコードはもう素材化済みやで");
                } else if (code === "invalid-argument") {
                    toast.error("バーコード形式が不正です");
                    shouldAbort = true;
                } else if (code === "unauthenticated") {
                    toast.error("認証エラーです。再度ログインしてください。");
                    shouldAbort = true;
                } else {
                    console.warn("awardScanToken error:", error);
                }
            }

            if (shouldAbort) {
                await animationPromise;
                setMode('scan');
                return;
            }

            // Run API and Animation in parallel
            const [data] = await Promise.all([
                callGenerateRobot(barcode),
                animationPromise
            ]);

            if (data?.robot) {
                setRobot(data.robot);
                setScannedBarcode(barcode);
                setIsRare(isSpecialRare(barcode));
                setMode('revealing');
                // Sound and haptic handled in reveal phase
            } else {
                toast.error(t('scan_failed') || "生成に失敗しました");
                setMode('scan');
            }
        } catch (error: any) {
            console.error('generateRobot error:', error);
            // Even if error, we waited for animation. 
            // UX decision: show error after animation or interrupt?
            // Current code waits. So error appears after "Reveal" phase which might be weird if "Reveal" shows nothing.
            // But GenerationAnimation onComplete calls are internal.
            // Actually, we are relying on waiting 6.5s. 

            const code = error?.code;
            const message = error?.message || 'Unknown error';

            if (code === 'resource-exhausted') {
                setLimitMessage(message);
                setShowLimitModal(true);
                setMode('scan');
                return;
            }

            let userMessage = "Error: " + message;
            if (code === 'internal') {
                userMessage = 'サーバーエラーが発生しました。時間を置いて再度お試しください。';
            } else if (code === 'invalid-argument') {
                userMessage = 'バーコード形式が不正です。';
            } else if (code === 'unauthenticated') {
                userMessage = '認証エラーです。再度ログインしてください。';
            } else if (code === 'already-exists') {
                userMessage = 'このバーコードのロボットは既に持っています。';
            }

            toast.error(userMessage, { duration: 5000 });
            setMode('scan');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg p-4 flex flex-col pb-24 relative overflow-hidden text-text">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-bg/90 pointer-events-none" />

            <header className="flex items-center mb-8 max-w-4xl mx-auto w-full relative z-10">
                <Link href="/">
                    <Button variant="ghost" className="mr-4">
                        <ArrowLeft className="h-5 w-5 mr-2" />
                        {t('back') || "戻る"}
                    </Button>
                </Link>
                <h1 className="text-2xl font-semibold text-accent font-orbitron">GENERATE</h1>
                <Link href="/how-to">
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <HelpCircle className="w-6 h-6 text-accent" />
                    </Button>
                </Link>
            </header>

            <main className="flex-1 max-w-4xl mx-auto w-full flex flex-col items-center justify-center relative z-10">
                {mode === "generating" && (
                    <div className="build-overlay" data-testid="scan-build-overlay" aria-hidden="true" />
                )}
                {mode === 'scan' && (
                    <div className="w-full space-y-6" id="tutorial-scanner-area">
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold mb-2">バーコードをスキャン</h2>
                            <p className="text-muted-foreground text-sm">
                                商品のバーコードをカメラに映してください
                            </p>
                        </div>
                        <BarcodeScanner onScanSuccess={handleScan} />
                    </div>
                )}

                {mode === 'generating' && (
                    <div className="w-full max-w-md px-4">
                        <GenerationAnimation onComplete={() => { }} />
                    </div>
                )}

                {mode === 'revealing' && robot && (
                    <>
                        <RoleReveal
                            roleName={robot.roleName || ''}
                            roleTitle={robot.roleTitle || ''}
                            isRare={isRare}
                            onRevealMoment={() => {
                                if (isRare) {
                                    playSE('se_rare');
                                } else {
                                    playSE('se_reveal');
                                }
                                triggerHaptic('heavy');
                            }}
                            onComplete={() => {
                                trigger("scan");
                                toast.success(t('scan_success') || "ロボット生成成功！");
                                setMode('result');
                            }}
                        />
                        {/* Show robot preview behind reveal */}
                        <div className="w-full max-w-md px-4 opacity-20">
                            <div className="glass-panel p-8 rounded-2xl">
                                <RobotSVG parts={robot.parts} colors={robot.colors} size={200} animate={false} />
                            </div>
                        </div>
                    </>
                )}

                {mode === 'result' && robot && (
                    <div className="flex flex-col items-center gap-8 py-8 w-full pop-in" id="tutorial-scan-result">
                        <div className="glass-panel p-8 rounded-2xl border-neon-cyan shadow-[0_0_20px_rgba(62,208,240,0.3)] pop-glow">
                            <RobotSVG parts={robot.parts} colors={robot.colors} size={200} animate={true} fx={fx} />
                        </div>

                        <div className="text-center space-y-4 pop-in">
                            <h2 className="text-3xl font-semibold font-orbitron text-white">
                                <ScrambleText text={robot.name} duration={1200} />
                            </h2>
                            <div className="flex gap-3 justify-center">
                                {/* Role Badge */}
                                {robot.role && (
                                    <span className={`px-3 py-1 rounded-full text-sm font-bold border ${ROLE_COLORS[robot.role].replace('/10', '/20')}`}>
                                        <ScrambleText text={robot.roleName || ROLE_LABELS[robot.role].ja} delay={200} />
                                    </span>
                                )}
                                <span className="px-3 py-1 rounded-full bg-neon-cyan/20 text-neon-cyan text-sm font-bold border border-neon-cyan/50">
                                    <ScrambleText text={robot.rarityName} delay={400} />
                                </span>
                                <span className="px-3 py-1 rounded-full bg-neon-purple/20 text-neon-purple text-sm font-bold border border-neon-purple/50">
                                    <ScrambleText text={robot.elementName || "Unknown"} delay={600} />
                                </span>
                            </div>

                            <div className="grid grid-cols-4 gap-4 mt-6 text-center">
                                <Interactive className="h-auto">
                                    <div className="text-2xl font-bold text-white">
                                        <ScrambleText text={String(robot.baseHp)} delay={400} />
                                    </div>
                                    <div className="text-xs text-muted-foreground">HP</div>
                                </Interactive>
                                <Interactive className="h-auto">
                                    <div className="text-2xl font-bold text-red-400">
                                        <ScrambleText text={String(robot.baseAttack)} delay={500} />
                                    </div>
                                    <div className="text-xs text-muted-foreground">ATK</div>
                                </Interactive>
                                <Interactive className="h-auto">
                                    <div className="text-2xl font-bold text-blue-400">
                                        <ScrambleText text={String(robot.baseDefense)} delay={600} />
                                    </div>
                                    <div className="text-xs text-muted-foreground">DEF</div>
                                </Interactive>
                                <Interactive className="h-auto">
                                    <div className="text-2xl font-bold text-yellow-400">
                                        <ScrambleText text={String(robot.baseSpeed)} delay={700} />
                                    </div>
                                    <div className="text-xs text-muted-foreground">SPD</div>
                                </Interactive>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-6">
                            <Button
                                variant="outline"
                                onClick={() => setMode('scan')}
                                className="border-white/20"
                            >
                                もう一度スキャン
                            </Button>
                            <div className="flex flex-col w-full gap-3">
                                <ShareCardModal robot={robot} />

                                <Button className="w-full h-12 text-lg font-bold bg-neon-cyan text-black hover:bg-neon-cyan/80" onClick={() => setMode('scan')}>
                                    GENERATE ANOTHER
                                </Button>

                                <Link href={"/robots/" + robot.id}>
                                    <Button variant="outline" className="w-full border-white/20">
                                        VIEW DETAILS
                                    </Button>
                                </Link>
                            </div>
                        </div>
                        <AdBanner />
                    </div>
                )}

                {/* Limit Modal */}
                <Dialog open={showLimitModal} onOpenChange={setShowLimitModal}>
                    <DialogContent className="bg-card border-neon-cyan text-foreground">
                        <DialogHeader>
                            <DialogTitle className="text-neon-cyan flex items-center gap-2">
                                <Zap className="h-5 w-5" />
                                GENERATION LIMIT REACHED
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground pt-4">
                                {limitMessage}
                                <br /><br />
                                アップグレードして制限を解除しませんか？
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="flex-col gap-2 sm:flex-row">
                            <Link href="/premium">
                                <Button className="w-full sm:w-auto bg-neon-yellow text-black hover:bg-neon-yellow/80 font-bold" onClick={() => setShowLimitModal(false)}>
                                    プレミアムプランを見る
                                </Button>
                            </Link>
                            <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setShowLimitModal(false)}>
                                閉じる
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}
