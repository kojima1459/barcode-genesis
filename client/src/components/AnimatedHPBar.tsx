import { motion, useSpring, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

interface AnimatedHPBarProps {
    current: number;
    max: number;
    label?: string;
    showNumbers?: boolean;
    className?: string;
    onCriticalDamage?: () => void;
}

export function AnimatedHPBar({
    current,
    max,
    label,
    showNumbers = true,
    className = "",
    onCriticalDamage
}: AnimatedHPBarProps) {
    const prefersReducedMotion = useReducedMotion();
    const [prevHP, setPrevHP] = useState(current);
    const [isShaking, setIsShaking] = useState(false);

    // Smooth HP transition with spring physics
    const hpSpring = useSpring(current, {
        stiffness: 100,
        damping: 15,
        mass: 0.5
    });

    useEffect(() => {
        hpSpring.set(current);

        // Check for critical damage (>30% HP loss in one hit)
        const damage = prevHP - current;
        const damagePercent = (damage / max) * 100;

        if (damage > 0 && damagePercent > 30 && !prefersReducedMotion) {
            setIsShaking(true);
            onCriticalDamage?.();
            setTimeout(() => setIsShaking(false), 400);
        }

        setPrevHP(current);
    }, [current, max, prevHP, hpSpring, onCriticalDamage, prefersReducedMotion]);

    const hpPercent = Math.max(0, Math.min(100, (current / max) * 100));

    // Color gradient based on HP percentage
    const getHPColor = (percent: number) => {
        if (percent > 70) {
            return "from-green-500 to-emerald-400";
        } else if (percent > 30) {
            return "from-yellow-500 to-amber-400";
        } else {
            return "from-red-500 to-rose-400";
        }
    };

    const getPulseAnimation = (percent: number) => {
        if (percent <= 20 && !prefersReducedMotion) {
            return {
                scale: [1, 1.02, 1],
                transition: {
                    duration: 0.8,
                    repeat: Infinity,
                    ease: "easeInOut"
                }
            };
        }
        return {};
    };

    return (
        <div className={`relative ${className}`}>
            {label && (
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                        {label}
                    </span>
                    {showNumbers && (
                        <span className="text-xs font-mono font-bold">
                            <span className={hpPercent <= 20 ? "text-red-400 animate-pulse" : ""}>
                                {Math.max(0, Math.floor(current))}
                            </span>
                            <span className="text-muted-foreground"> / {max}</span>
                        </span>
                    )}
                </div>
            )}

            <motion.div
                className="relative h-6 bg-black/60 rounded border border-white/5 overflow-hidden group"
                animate={isShaking && !prefersReducedMotion ? {
                    x: [-3, 3, -3, 3, 0],
                    transition: { duration: 0.3 }
                } : {}}
            >
                {/* Background Scanlines */}
                <div className="absolute inset-0 bg-[url('/scanline.png')] opacity-[0.03] pointer-events-none" />

                {/* Energy Glow for Low HP */}
                {hpPercent <= 30 && (
                    <motion.div
                        className="absolute inset-0 bg-red-500/10 pointer-events-none"
                        animate={!prefersReducedMotion ? {
                            opacity: [0.1, 0.3, 0.1],
                            transition: { duration: 1, repeat: Infinity }
                        } : { opacity: 0.1 }}
                    />
                )}

                {/* Main HP bar */}
                <motion.div
                    className={`absolute inset-y-0 left-0 bg-linear-to-r ${getHPColor(hpPercent)} shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all duration-300`}
                    style={{
                        width: `${hpPercent}%`,
                    }}
                    initial={false}
                    animate={{
                        ...getPulseAnimation(hpPercent)
                    }}
                >
                    {/* Holographic Shine Effect */}
                    <motion.div
                        className="absolute inset-0 bg-linear-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg]"
                        animate={!prefersReducedMotion ? {
                            left: ["-100%", "200%"],
                            transition: {
                                duration: 1.5,
                                repeat: Infinity,
                                ease: "linear",
                                repeatDelay: 0.5
                            }
                        } : {}}
                    />

                    {/* Inner Shadow */}
                    <div className="absolute inset-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]" />
                </motion.div>

                {/* Tactical Grid Overlay */}
                <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none opacity-20">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                        <div key={i} className="h-full w-px bg-black/40" />
                    ))}
                </div>
            </motion.div>

            {/* Damage flash overlay */}
            {isShaking && (
                <motion.div
                    className="absolute inset-0 bg-red-500 rounded-full pointer-events-none"
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                />
            )}
        </div>
    );
}
