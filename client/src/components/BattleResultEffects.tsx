import { motion, useReducedMotion } from "framer-motion";
import { Trophy, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { playGenerated } from "@/lib/sound";

interface VictoryEffectProps {
    onComplete?: () => void;
}

export function VictoryEffect({ onComplete }: VictoryEffectProps) {
    const prefersReducedMotion = useReducedMotion();
    const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

    useEffect(() => {
        // Play victory sound
        playGenerated('win');

        if (prefersReducedMotion) {
            onComplete?.();
            return;
        }

        // Generate confetti particles
        const particleCount = 50;
        const newParticles = Array.from({ length: particleCount }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: -10,
            delay: Math.random() * 0.5
        }));
        setParticles(newParticles);

        const timer = setTimeout(() => {
            onComplete?.();
        }, 3000);

        return () => clearTimeout(timer);
    }, [prefersReducedMotion, onComplete]);

    if (prefersReducedMotion) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {/* Background Flash */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.4, 0] }}
                transition={{ duration: 1 }}
                className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-64 bg-yellow-400/20 blur-[100px]"
            />

            {/* Victory banner */}
            <motion.div
                className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2"
                initial={{ scale: 0.5, opacity: 0, y: -50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
                <div className="flex flex-col items-center gap-6">
                    <motion.div
                        animate={{
                            rotate: [0, 15, -15, 15, 0],
                            scale: [1, 1.2, 1, 1.2, 1],
                            filter: ["drop-shadow(0 0 10px rgba(250,204,21,0.5))", "drop-shadow(0 0 30px rgba(250,204,21,0.8))", "drop-shadow(0 0 10px rgba(250,204,21,0.5))"]
                        }}
                        transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            repeatDelay: 0.5
                        }}
                        className="relative"
                    >
                        <Trophy className="w-28 h-28 text-yellow-400" />
                        <motion.div
                            className="absolute inset-0 bg-yellow-400 blur-2xl opacity-20"
                            animate={{ opacity: [0.2, 0.5, 0.2] }}
                            transition={{ duration: 1, repeat: Infinity }}
                        />
                    </motion.div>

                    <div className="relative">
                        <motion.div
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="absolute -inset-x-12 top-1/2 h-px bg-linear-to-r from-transparent via-yellow-400 to-transparent"
                        />
                        <motion.div
                            className="text-7xl font-black italic tracking-tighter text-white font-orbitron"
                            animate={{
                                scale: [1, 1.02, 1],
                                textShadow: [
                                    "0 0 10px rgba(250, 204, 21, 0.5)",
                                    "0 0 30px rgba(250, 204, 21, 0.8)",
                                    "0 0 10px rgba(250, 204, 21, 0.5)"
                                ]
                            }}
                            transition={{ duration: 0.5, repeat: Infinity }}
                        >
                            VICTORY
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1 }}
                        className="text-[10px] font-black italic tracking-[0.4em] text-yellow-400/60 uppercase"
                    >
                        Objective_Complete
                    </motion.div>
                </div>
            </motion.div>

            {/* Confetti particles */}
            {particles.map((particle) => (
                <motion.div
                    key={particle.id}
                    className="absolute"
                    style={{
                        left: `${particle.x}%`,
                        top: `${particle.y}%`
                    }}
                    initial={{ y: -20, opacity: 1, rotate: 0 }}
                    animate={{
                        y: window.innerHeight + 20,
                        opacity: [1, 1, 0],
                        rotate: Math.random() * 1080 - 540
                    }}
                    transition={{
                        duration: 1.5 + Math.random(),
                        delay: particle.delay,
                        ease: [0.22, 1, 0.36, 1]
                    }}
                >
                    <div
                        className="w-2.5 h-2.5 rounded-[1px] shadow-sm"
                        style={{
                            backgroundColor: [
                                "#FFD700", // Gold
                                "#FFFFFF", // White
                                "#00F3FF", // Cyan
                                "#FF0055", // Pink
                                "#F7DC6F", // Yellow
                                "#BB8FCE"  // Purple
                            ][Math.floor(Math.random() * 6)]
                        }}
                    />
                </motion.div>
            ))}

            {/* Sparkle effects */}
            {[...Array(24)].map((_, i) => (
                <motion.div
                    key={`sparkle-${i}`}
                    className="absolute"
                    style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                        scale: [0, 1.5, 0],
                        opacity: [0, 1, 0]
                    }}
                    transition={{
                        duration: 1,
                        delay: Math.random() * 2,
                        repeat: Infinity,
                        repeatDelay: Math.random() * 1
                    }}
                >
                    <Sparkles className="w-4 h-4 text-yellow-200" />
                </motion.div>
            ))}
        </div>
    );
}

interface DefeatEffectProps {
    onComplete?: () => void;
}

export function DefeatEffect({ onComplete }: DefeatEffectProps) {
    const prefersReducedMotion = useReducedMotion();

    useEffect(() => {
        // Play defeat sound
        playGenerated('lose');

        if (prefersReducedMotion) {
            onComplete?.();
            return;
        }

        const timer = setTimeout(() => {
            onComplete?.();
        }, 2000);

        return () => clearTimeout(timer);
    }, [prefersReducedMotion, onComplete]);

    if (prefersReducedMotion) return null;

    return (
        <motion.div
            className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Dark overlay with vignette */}
            <motion.div
                className="absolute inset-0 bg-black/80"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
                style={{
                    boxShadow: "inset 0 0 200px 100px rgba(0,0,0,1)"
                }}
            />

            {/* Error Scanline */}
            <motion.div
                className="absolute inset-0 bg-red-500/5 mix-blend-overlay"
                animate={{ opacity: [0, 0.1, 0] }}
                transition={{ duration: 0.1, repeat: Infinity }}
            />

            {/* Defeat text */}
            <motion.div
                className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2"
                initial={{ opacity: 0, scale: 2 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
            >
                <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                        <motion.div
                            className="text-7xl font-black italic tracking-tighter text-red-500 font-orbitron"
                            animate={{
                                x: [0, -4, 4, -2, 2, 0],
                                textShadow: [
                                    "2px 0 #00ffff, -2px 0 #ff00ff",
                                    "-2px 0 #00ffff, 2px 0 #ff00ff",
                                    "0px 0 #00ffff, 0px 0 #ff00ff"
                                ]
                            }}
                            transition={{ duration: 0.2, repeat: Infinity }}
                        >
                            DEFEAT
                        </motion.div>
                        <motion.div
                            className="absolute inset-0 text-7xl font-black italic tracking-tighter text-red-500 font-orbitron opacity-50 blur-sm"
                            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
                            transition={{ duration: 0.1, repeat: Infinity }}
                        >
                            DEFEAT
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-[10px] font-black italic tracking-[0.4em] text-red-500/40 uppercase"
                    >
                        System_Failure_Critical
                    </motion.div>
                </div>
            </motion.div>

            {/* Glitch effect lines */}
            {[...Array(12)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute h-[1px] bg-red-500/20 w-full"
                    style={{ top: `${Math.random() * 100}%` }}
                    animate={{
                        x: ["-100%", "100%"],
                        opacity: [0, 0.3, 0]
                    }}
                    transition={{
                        duration: 0.2 + Math.random() * 0.5,
                        delay: Math.random() * 2,
                        repeat: Infinity
                    }}
                />
            ))}
        </motion.div>
    );
}
