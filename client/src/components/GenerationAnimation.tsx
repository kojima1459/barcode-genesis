import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useHaptic } from "@/contexts/HapticContext";
import { useSound } from "@/contexts/SoundContext";
import { Loader2, ScanBarcode, Binary, Fingerprint, Zap } from "lucide-react";

interface GenerationAnimationProps {
    onComplete: () => void;
}

type Phase = 'scanning' | 'decrypting' | 'constructing' | 'reveal';

export default function GenerationAnimation({ onComplete }: GenerationAnimationProps) {
    const [phase, setPhase] = useState<Phase>('scanning');
    const { triggerHaptic } = useHaptic();
    const { playSE } = useSound();

    useEffect(() => {
        // Phase 1: Scanning (0-2s)
        playSE('se_scan'); // Assuming we have these or similar
        triggerHaptic('light');

        const t1 = setTimeout(() => {
            setPhase('decrypting');
            triggerHaptic('medium');
        }, 2000);

        // Phase 2: Decrypting (2-4s)
        const t2 = setTimeout(() => {
            setPhase('constructing');
            triggerHaptic('medium');
        }, 4000);

        // Phase 3: Constructing (4-6s)
        const t3 = setTimeout(() => {
            setPhase('reveal');
            triggerHaptic('heavy');
            playSE('se_levelup'); // Boom sound
        }, 6000);

        // Phase 4: Reveal (Complete)
        const t4 = setTimeout(() => {
            onComplete();
        }, 6500);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            clearTimeout(t4);
        };
    }, []);

    return (
        <div className="flex flex-col items-center justify-center w-full h-64 relative overflow-hidden bg-black/50 rounded-xl border border-neon-cyan/30 backdrop-blur-sm">
            <AnimatePresence mode="wait">
                {phase === 'scanning' && (
                    <motion.div
                        key="scanning"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="flex flex-col items-center gap-4"
                    >
                        <div className="relative">
                            <ScanBarcode className="w-16 h-16 text-neon-cyan" />
                            <motion.div
                                className="absolute inset-0 bg-neon-cyan/20"
                                animate={{ top: ["0%", "100%", "0%"] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                style={{ height: "4px", boxShadow: "0 0 10px #0ff" }}
                            />
                        </div>
                        <p className="font-orbitron text-neon-cyan animate-pulse">Scanning Barcode...</p>
                    </motion.div>
                )}

                {phase === 'decrypting' && (
                    <motion.div
                        key="decrypting"
                        initial={{ opacity: 0, scale: 1.2 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, filter: "blur(10px)" }}
                        className="flex flex-col items-center gap-4"
                    >
                        <div className="grid grid-cols-4 gap-2">
                            {/* Matrix rain effect simplified */}
                            {[...Array(4)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    animate={{ opacity: [0.2, 1, 0.2] }}
                                    transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                                >
                                    <Binary className="w-8 h-8 text-neon-green" />
                                </motion.div>
                            ))}
                        </div>
                        <p className="font-orbitron text-neon-green">Decrypting DNA Sequence...</p>
                        <div className="w-48 h-2 bg-gray-800 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-neon-green"
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 2 }}
                            />
                        </div>
                    </motion.div>
                )}

                {phase === 'constructing' && (
                    <motion.div
                        key="constructing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, scale: 1.5 }}
                        className="flex flex-col items-center gap-4"
                    >
                        <div className="relative w-20 h-20">
                            <motion.div
                                className="absolute inset-0 border-4 border-neon-purple rounded-full"
                                animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                                style={{ borderTopColor: "transparent" }}
                            />
                            <Zap className="absolute inset-0 m-auto w-8 h-8 text-neon-purple animate-pulse" />
                        </div>
                        <p className="font-orbitron text-neon-purple">Constructing Framework...</p>
                    </motion.div>
                )}

                {phase === 'reveal' && (
                    <motion.div
                        key="reveal"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 bg-white flex items-center justify-center"
                    >
                        {/* Flashbang effect */}
                        <motion.div
                            animate={{ opacity: [1, 0] }}
                            transition={{ duration: 0.5 }}
                            className="absolute inset-0 bg-white z-50"
                        />
                        <div className="text-black font-black text-2xl font-orbitron z-40">
                            COMPLETE
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
