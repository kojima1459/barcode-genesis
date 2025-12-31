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
            {/* Victory banner */}
            <motion.div
                className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                initial={{ scale: 0, rotate: -180, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
                <div className="flex flex-col items-center gap-4">
                    <motion.div
                        animate={{
                            rotate: [0, 10, -10, 10, 0],
                            scale: [1, 1.1, 1, 1.1, 1]
                        }}
                        transition={{
                            duration: 0.5,
                            repeat: Infinity,
                            repeatDelay: 1
                        }}
                    >
                        <Trophy className="w-24 h-24 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]" />
                    </motion.div>

                    <motion.div
                        className="text-6xl font-bold bg-linear-to-r from-yellow-400 via-yellow-300 to-yellow-400 bg-clip-text text-transparent"
                        style={{
                            textShadow: "0 0 30px rgba(250, 204, 21, 0.5)"
                        }}
                        animate={{
                            scale: [1, 1.05, 1],
                        }}
                        transition={{
                            duration: 1,
                            repeat: Infinity
                        }}
                    >
                        VICTORY
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
                        rotate: Math.random() * 720 - 360
                    }}
                    transition={{
                        duration: 2 + Math.random(),
                        delay: particle.delay,
                        ease: "linear"
                    }}
                >
                    <div
                        className="w-3 h-3 rounded-sm"
                        style={{
                            backgroundColor: [
                                "#FFD700",
                                "#FF6B6B",
                                "#4ECDC4",
                                "#45B7D1",
                                "#F7DC6F",
                                "#BB8FCE"
                            ][Math.floor(Math.random() * 6)]
                        }}
                    />
                </motion.div>
            ))}

            {/* Sparkle effects */}
            {[...Array(20)].map((_, i) => (
                <motion.div
                    key={`sparkle-${i}`}
                    className="absolute"
                    style={{
                        left: `${10 + Math.random() * 80}%`,
                        top: `${20 + Math.random() * 60}%`
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                        scale: [0, 1, 0],
                        opacity: [0, 1, 0]
                    }}
                    transition={{
                        duration: 1.5,
                        delay: i * 0.1,
                        repeat: Infinity,
                        repeatDelay: 1
                    }}
                >
                    <Sparkles className="w-4 h-4 text-yellow-300" />
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
            className="fixed inset-0 pointer-events-none z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            {/* Dark overlay with vignette */}
            <motion.div
                className="absolute inset-0 bg-black"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ duration: 0.5 }}
                style={{
                    boxShadow: "inset 0 0 200px 100px rgba(0,0,0,0.9)"
                }}
            />

            {/* Defeat text */}
            <motion.div
                className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
            >
                <div className="text-6xl font-bold text-red-400 text-center drop-shadow-[0_0_30px_rgba(248,113,113,0.8)]">
                    DEFEAT
                </div>
            </motion.div>

            {/* Glitch effect lines */}
            {[...Array(5)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute h-px bg-red-500/50"
                    style={{
                        width: "100%",
                        top: `${20 * i + 10}%`
                    }}
                    animate={{
                        x: ["-100%", "100%"],
                        opacity: [0, 0.5, 0]
                    }}
                    transition={{
                        duration: 0.8,
                        delay: i * 0.1,
                        repeat: 1
                    }}
                />
            ))}
        </motion.div>
    );
}
