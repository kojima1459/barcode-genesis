import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface EnhancedDamageNumberProps {
    value: number;
    isCritical?: boolean;
    isDodge?: boolean;
    isHeal?: boolean;
    cheerApplied?: boolean;
    x: number;
    y: number;
    onComplete?: () => void;
}

export function EnhancedDamageNumber({
    value,
    isCritical = false,
    isDodge = false,
    isHeal = false,
    cheerApplied = false,
    x,
    y,
    onComplete
}: EnhancedDamageNumberProps) {
    const prefersReducedMotion = useReducedMotion();

    const getColor = () => {
        if (isDodge) return "text-blue-400";
        if (isHeal) return "text-green-400";
        if (isCritical) return "text-yellow-300";
        return "text-white";
    };

    const getSize = () => {
        if (isCritical) return "text-4xl";
        if (isDodge || isHeal) return "text-2xl";
        return "text-3xl";
    };

    const getText = () => {
        if (isDodge) return "MISS";
        if (isHeal) return `+${value}`;
        return value.toString();
    };

    return (
        <motion.div
            className="absolute pointer-events-none"
            style={{ left: x, top: y }}
            initial={{
                opacity: 1,
                y: 0,
                scale: prefersReducedMotion ? 1 : 0.5,
                rotate: 0
            }}
            animate={{
                opacity: 0,
                y: prefersReducedMotion ? -20 : -80,
                scale: 1,
                rotate: prefersReducedMotion ? 0 : (isCritical ? [-5, 5, -5, 0] : 0)
            }}
            transition={{
                duration: prefersReducedMotion ? 0.5 : 1.2,
                ease: "easeOut",
                rotate: { duration: 0.3, times: [0, 0.3, 0.6, 1] }
            }}
            onAnimationComplete={onComplete}
        >
            <div className="relative">
                {/* Glow effect for critical hits */}
                {isCritical && !prefersReducedMotion && (
                    <motion.div
                        className="absolute inset-0 blur-xl bg-yellow-500/50 rounded-full"
                        animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.8, 0, 0.8]
                        }}
                        transition={{
                            duration: 0.6,
                            repeat: Infinity
                        }}
                    />
                )}

                {/* Main damage text */}
                <div
                    className={`font-bold ${getSize()} ${getColor()} drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] relative z-10`}
                    style={{
                        textShadow: isCritical
                            ? "0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.4)"
                            : "0 2px 8px rgba(0, 0, 0, 0.8)"
                    }}
                >
                    {getText()}

                    {/* Critical indicator */}
                    {isCritical && (
                        <motion.span
                            className="ml-1 text-yellow-400"
                            initial={{ scale: 0 }}
                            animate={{ scale: [0, 1.3, 1] }}
                            transition={{ duration: 0.3 }}
                        >
                            !!
                        </motion.span>
                    )}
                </div>

                {/* Cheer boost indicator */}
                {cheerApplied && !prefersReducedMotion && (
                    <motion.div
                        className="absolute -top-2 -right-2"
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{
                            scale: [0, 1.2, 1],
                            rotate: [0, 10, -10, 0]
                        }}
                        transition={{ duration: 0.4 }}
                    >
                        <Sparkles className="w-4 h-4 text-pink-400 fill-pink-400" />
                    </motion.div>
                )}

                {/* Impact particles for critical */}
                {isCritical && !prefersReducedMotion && (
                    <>
                        {[...Array(6)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                                style={{
                                    left: "50%",
                                    top: "50%"
                                }}
                                initial={{ scale: 0, x: 0, y: 0 }}
                                animate={{
                                    scale: [0, 1, 0],
                                    x: Math.cos((i / 6) * Math.PI * 2) * 30,
                                    y: Math.sin((i / 6) * Math.PI * 2) * 30
                                }}
                                transition={{
                                    duration: 0.6,
                                    ease: "easeOut"
                                }}
                            />
                        ))}
                    </>
                )}
            </div>
        </motion.div>
    );
}
