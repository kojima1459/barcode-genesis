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
import AdBanner from "@/components/AdBanner";
import RoleReveal from "@/components/RoleReveal";
import { isSpecialRare } from "@/lib/rarity";
import { Interactive } from "@/components/ui/interactive";
import { ScrambleText } from "@/components/ui/ScrambleText";
import { ROLE_COLORS, ROLE_LABELS } from "@/lib/dexRegistry";
import { normalizeToEan13, type BarcodeKind } from "@/lib/barcodeNormalize"; // REF: EAN8

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
    const [barcodeKind, setBarcodeKind] = useState<BarcodeKind | null>(null); // REF: EAN8

    const { triggerHaptic } = useHaptic();

    const { completeStep } = useTutorial();
    const { fx, trigger } = useRobotFx();

    const handleScan = async (rawBarcode: string) => {
        // REF: EAN8 - Normalize barcode to EAN-13
        const normalized = normalizeToEan13(rawBarcode);
        if (!normalized.ok) {
            toast.error(normalized.reason);
            return;
        }
        const barcode = normalized.ean13;
        setBarcodeKind(normalized.kind);

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
                const [{ httpsCallable }, { getFunctions }] = await Promise.all([
                    import("firebase/functions"),
                    import("@/lib/firebase"),
                ]);
                await awardScanToken({ barcode, source: "camera" });
                toast.success(t('scan_chip_gained'));
            } catch (error: any) {
                const code = getCallableErrorCode(error);
                if (code === "already-exists") {
                    toast(t('scan_barcode_already'));
                } else if (code === "invalid-argument") {
                    toast.error(t('scan_invalid_barcode'));
                    shouldAbort = true;
                } else if (code === "unauthenticated") {
                    toast.error(t('scan_auth_error'));
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
                // Phase B: Check rarityTier for legendary/rare status
                const isLegendary = data.robot.rarityTier === 'legendary' ||
                    (data.robot.rarity && data.robot.rarity >= 4) ||
                    isSpecialRare(barcode);
                setIsRare(isLegendary);
                setMode('revealing');
                // Sound and haptic handled in reveal phase
            } else {
                toast.error(t('scan_failed') || "生成に失敗しました");
                setMode('scan');
            }
        } catch (error: any) {
            // Detailed error logging for debugging
            console.error('[Scan] generateRobot error:', {
                name: error?.name,
                message: error?.message,
                code: error?.code,
                httpStatus: error?.httpStatus,
                details: error?.details,
                rawBody: error?.rawBody?.slice?.(0, 500),
                stack: error?.stack,
            });
            // Even if error, we waited for animation. 
            // UX decision: show error after animation or interrupt?
            // Current code waits. So error appears after "Reveal" phase which might be weird if "Reveal" shows nothing.
            // But GenerationAnimation onComplete calls are internal.
            // Actually, we are relying on waiting 6.5s. 

            const code = error?.code;
            const message = error?.message || 'Unknown error';
            const httpStatus = error?.httpStatus;

            if (code === 'resource-exhausted') {
                setLimitMessage(message);
                setShowLimitModal(true);
                setMode('scan');
                return;
            }

            let userMessage = "Error: " + message;
            if (code === 'internal') {
                userMessage = t('scan_server_error');
            } else if (code === 'invalid-argument') {
                userMessage = t('scan_invalid_barcode');
            } else if (code === 'unauthenticated') {
                userMessage = t('scan_auth_error');
            } else if (code === 'already-exists') {
                userMessage = t('scan_robot_exists');
            }

            // Add technical details for debugging (visible to user)
            const techDetails = httpStatus ? ` [${httpStatus}${code ? '/' + code : ''}]` : (code ? ` [${code}]` : '');
            toast.error(userMessage + techDetails, { duration: 5000 });
            setMode('scan');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 flex flex-col pb-24 relative overflow-hidden text-foreground">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 pointer-events-none" />
            <div className="absolute inset-0 bg-linear-to-b from-transparent to-bg/90 pointer-events-none" />

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
                            <h2 className="text-xl font-bold mb-2">{t('scan_title')}</h2>
                            <p className="text-muted-foreground text-sm">
                                {t('scan_instruction')}
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
                                <RobotSVG
                                    parts={robot.parts}
                                    colors={robot.colors}
                                    size={200}
                                    animate={false}
                                    role={typeof robot.role === 'string' ? robot.role : undefined}
                                    rarityEffect={robot.rarityTier === 'legendary' ? 'legendary' : (robot.rarityTier === 'rare' ? 'rare' : undefined)}
                                />
                            </div>
                        </div>
                    </>
                )}

                {mode === 'result' && robot && (
                    <div className="flex flex-col items-center gap-8 py-8 w-full pop-in" id="tutorial-scan-result">
                        <div className="glass-panel p-8 rounded-2xl border-neon-cyan shadow-[0_0_20px_rgba(62,208,240,0.3)] pop-glow">
                            <RobotSVG
                                parts={robot.parts}
                                colors={robot.colors}
                                size={200}
                                animate={true}
                                fx={fx}
                                role={typeof robot.role === 'string' ? robot.role : undefined}
                                rarityEffect={robot.rarityTier === 'legendary' ? 'legendary' : (robot.rarityTier === 'rare' ? 'rare' : undefined)}
                            />
                        </div>

                        <div className="text-center space-y-4 pop-in">
                            <h2 className="text-3xl font-semibold font-orbitron text-white">
                                <ScrambleText text={robot.name} duration={1200} />
                            </h2>
                            <div className="flex gap-3 justify-center">
                                {/* Role Badge */}
                                {robot.role && (
                                    <span className={`px-3 py-1 rounded-full text-sm font-bold border ${(() => {
                                        const r = String(robot.role).toUpperCase();
                                        if (r === 'STRIKER') return ROLE_COLORS.ATTACKER;
                                        if (r === 'SUPPORT') return ROLE_COLORS.TRICKY;
                                        if (r === 'BALANCED') return ROLE_COLORS.BALANCE;
                                        // Fallback for legacy or direct match
                                        return ROLE_COLORS[r as keyof typeof ROLE_COLORS] || ROLE_COLORS.BALANCE;
                                    })().replace('/10', '/20')
                                        }`}>
                                        <ScrambleText text={robot.roleName || (typeof robot.role === 'string' ? robot.role.toUpperCase() : '')} delay={200} />
                                    </span>
                                )}
                                <span className="px-3 py-1 rounded-full bg-neon-cyan/20 text-neon-cyan text-sm font-bold border border-neon-cyan/50">
                                    <ScrambleText text={robot.rarityName} delay={400} />
                                </span>
                                <span className="px-3 py-1 rounded-full bg-neon-purple/20 text-neon-purple text-sm font-bold border border-neon-purple/50">
                                    <ScrambleText text={robot.elementName || t('label_unknown')} delay={600} />
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
                                {t('scan_again')}
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
                                {t('scan_limit_title')}
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground pt-4">
                                {limitMessage}
                                <br /><br />
                                {t('scan_limit_upgrade')}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="flex-col gap-2 sm:flex-row">
                            <Link href="/premium">
                                <Button className="w-full sm:w-auto bg-neon-yellow text-black hover:bg-neon-yellow/80 font-bold" onClick={() => setShowLimitModal(false)}>
                                    {t('view_premium')}
                                </Button>
                            </Link>
                            <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setShowLimitModal(false)}>
                                {t('close')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}
