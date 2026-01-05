import { memo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface SpecialCutInProps {
    show: boolean;
    robotName?: string;
    // Overdrive
    overdriveTriggered?: boolean;
    overdriveMessage?: string;
    // Special
    specialTriggered?: boolean;
    specialName?: string;
    specialRoleName?: string;
    specialImpact?: string;
    specialHits?: number;
    onComplete: () => void;
}

/**
 * SpecialCutIn - Full-screen overlay for Overdrive/Special skill activation
 * 
 * Trigger conditions:
 * - overdriveTriggered: true → Shows "OVERDRIVE!" or overdriveMessage
 * - specialTriggered: true → Shows specialRoleName + specialName + specialImpact
 */
const SpecialCutIn = memo(({
    show,
    robotName,
    overdriveTriggered,
    overdriveMessage,
    specialTriggered,
    specialName,
    specialRoleName,
    specialImpact,
    specialHits,
    onComplete
}: SpecialCutInProps) => {
    const prefersReducedMotion = useReducedMotion();
    const { t } = useLanguage();

    // Determine display text
    const isOverdrive = overdriveTriggered;
    const isSpecial = specialTriggered && !overdriveTriggered;

    // Role badge (《アサルト》 style)
    const roleBadge = isSpecial && specialRoleName ? `《${specialRoleName}》` : "";

    // Main move name
    const mainText = isOverdrive
        ? (overdriveMessage || t('label_overdrive'))
        : isSpecial
            ? (specialName || t('label_special'))
            : "";

    // Impact description (【大ダメージ】 style)
    const subText = isSpecial && specialImpact ? `【${specialImpact}】` : "";
    const hitsText = isSpecial && specialHits && specialHits > 1 ? `×${specialHits}` : "";

    const colorClass = isOverdrive
        ? "text-orange-400 drop-shadow-[0_0_20px_rgba(251,146,60,0.8)]"
        : "text-cyan-400 drop-shadow-[0_0_20px_rgba(0,255,255,0.8)]";

    const bgGradient = isOverdrive
        ? "bg-gradient-to-r from-orange-900/80 via-black/90 to-orange-900/80"
        : "bg-gradient-to-r from-cyan-900/80 via-black/90 to-cyan-900/80";

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: prefersReducedMotion ? 0.1 : 0.15 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
                    onAnimationComplete={onComplete}
                >
                    {/* Background Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.85 }}
                        exit={{ opacity: 0 }}
                        className={`absolute inset-0 ${bgGradient}`}
                    />

                    {/* Scan Lines Effect */}
                    {!prefersReducedMotion && (
                        <div className="absolute inset-0 opacity-20 pointer-events-none">
                            <div className="absolute inset-0 bg-[url('/grid.svg')] animate-pulse" />
                            <motion.div
                                initial={{ y: "-100%" }}
                                animate={{ y: "100%" }}
                                transition={{ duration: 0.4, ease: "linear" }}
                                className="absolute inset-x-0 h-2 bg-gradient-to-b from-transparent via-white/40 to-transparent"
                            />
                        </div>
                    )}

                    {/* Main Content */}
                    <motion.div
                        initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0.8, opacity: 0, y: 20 }}
                        animate={prefersReducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { scale: 1.1, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="relative z-10 text-center px-4"
                    >
                        {/* Role Badge (《アサルト》) */}
                        {roleBadge && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 }}
                                className="text-lg sm:text-xl text-cyan-300/90 mb-1 tracking-[0.3em]"
                            >
                                {roleBadge}
                            </motion.div>
                        )}

                        {/* Robot Name */}
                        {robotName && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-sm font-mono text-white/60 mb-2 tracking-widest uppercase"
                            >
                                {robotName}
                            </motion.div>
                        )}

                        {/* Main Text */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.05, type: "spring", stiffness: 200 }}
                            className={`text-4xl sm:text-6xl md:text-7xl font-black italic tracking-tighter ${colorClass}`}
                            style={{ textShadow: "0 0 40px currentColor" }}
                        >
                            {mainText}
                            {hitsText && (
                                <span className="ml-3 text-2xl sm:text-3xl text-yellow-400">
                                    {hitsText}
                                </span>
                            )}
                        </motion.div>

                        {/* Sub Text (Impact) - 【大ダメージ】 */}
                        {subText && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-lg sm:text-2xl text-yellow-400 mt-3 font-bold tracking-wide"
                            >
                                {subText}
                            </motion.div>
                        )}

                        {/* Decorative Lines */}
                        {!prefersReducedMotion && (
                            <>
                                <motion.div
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: 1 }}
                                    transition={{ delay: 0.1, duration: 0.3 }}
                                    className="absolute -left-20 right-1/2 h-px bg-gradient-to-r from-transparent to-current top-1/2 origin-right"
                                    style={{ color: isOverdrive ? "#f97316" : "#00f3ff" }}
                                />
                                <motion.div
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: 1 }}
                                    transition={{ delay: 0.1, duration: 0.3 }}
                                    className="absolute -right-20 left-1/2 h-px bg-gradient-to-l from-transparent to-current top-1/2 origin-left"
                                    style={{ color: isOverdrive ? "#f97316" : "#00f3ff" }}
                                />
                            </>
                        )}
                    </motion.div>

                    {/* Corner Decorations */}
                    {!prefersReducedMotion && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute top-4 left-4 text-xs font-mono text-white/30 tracking-widest"
                            >
                                {isOverdrive ? "OVERDRIVE_SYSTEM" : "SPECIAL_ATTACK"}
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute bottom-4 right-4 text-xs font-mono text-white/30 tracking-widest"
                            >
                                EXECUTING...
                            </motion.div>
                        </>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
});

SpecialCutIn.displayName = 'SpecialCutIn';

export default SpecialCutIn;
