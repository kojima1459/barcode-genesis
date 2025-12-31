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
                className="relative h-6 bg-black/40 rounded-full overflow-hidden border border-white/10"
                animate={isShaking && !prefersReducedMotion ? {
                    x: [-2, 2, -2, 2, 0],
                    transition: { duration: 0.3 }
                } : {}}
            >
                {/* Background glow for low HP */}
                {hpPercent <= 30 && (
                    <motion.div
                        className="absolute inset-0 bg-red-500/20"
                        animate={!prefersReducedMotion ? {
                            opacity: [0.2, 0.4, 0.2],
                            transition: { duration: 1.5, repeat: Infinity }
                        } : { opacity: 0.2 }}
                    />
                )}

                {/* Main HP bar */}
                <motion.div
                    className={`absolute inset-y-0 left-0 bg-linear-to-r ${getHPColor(hpPercent)} rounded-full`}
                    style={{
                        width: `${hpPercent}%`,
                    }}
                    initial={false}
                    animate={{
                        ...getPulseAnimation(hpPercent)
                    }}
                >
                    {/* Shine effect */}
                    <motion.div
                        className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent"
                        animate={!prefersReducedMotion ? {
                            x: ["-100%", "200%"],
                            transition: {
                                duration: 2,
                                repeat: Infinity,
                                ease: "linear",
                                repeatDelay: 1
                            }
                        } : {}}
                    />
                </motion.div>

                {/* Tick marks */}
                <div className="absolute inset-0 flex items-center">
                    {[25, 50, 75].map((tick) => (
                        <div
                            key={tick}
                            className="absolute h-full w-px bg-white/20"
                            style={{ left: `${tick}%` }}
                        />
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
