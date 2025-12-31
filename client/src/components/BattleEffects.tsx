import { motion, AnimatePresence } from "framer-motion";
import { Zap, Droplets, Flame, Snowflake, Wind } from "lucide-react";
import RobotSVG from "./RobotSVG";
import { RobotData } from "@/types/shared";

// Shared Types if not imported, for self-containment in this snippet context
// In real usage, import from @/types/shared

interface ElementalBurstProps {
    element?: string; // "Fire", "Water", "Thunder", "Wind", "Ice" etc.
    x: number;
    y: number;
}

const getElementColor = (element?: string) => {
    switch (element?.toLowerCase()) {
        case 'fire': return '#ef4444'; // red-500
        case 'water': return '#3b82f6'; // blue-500
        case 'thunder': return '#eab308'; // yellow-500
        case 'wind': return '#22c55e'; // green-500
        case 'ice': return '#06b6d4'; // cyan-500
        default: return '#ffffff';
    }
};

const getElementIcon = (element?: string) => {
    switch (element?.toLowerCase()) {
        case 'fire': return <Flame className="w-8 h-8 text-red-500" />;
        case 'water': return <Droplets className="w-8 h-8 text-blue-500" />;
        case 'thunder': return <Zap className="w-8 h-8 text-yellow-500" />;
        case 'wind': return <Wind className="w-8 h-8 text-green-500" />;
        case 'ice': return <Snowflake className="w-8 h-8 text-cyan-500" />;
        default: return <Zap className="w-8 h-8 text-white" />;
    }
};

export function ElementalBurst({ element, x, y }: ElementalBurstProps) {
    const color = getElementColor(element);

    return (
        <div className="absolute pointer-events-none z-50" style={{ left: x, top: y }}>
            {/* Central Burst */}
            <motion.div
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full blur-md"
                style={{ backgroundColor: color }}
            />

            {/* Particles */}
            {[...Array(8)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                        x: Math.cos(i * 45 * (Math.PI / 180)) * 60,
                        y: Math.sin(i * 45 * (Math.PI / 180)) * 60,
                        opacity: 0,
                        scale: 0
                    }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                    style={{ backgroundColor: color }}
                />
            ))}
        </div>
    );
}

interface SkillCutInProps {
    skillName: string;
    robot: RobotData; // We need robot data to show the avatar
    onComplete: () => void;
}

export function SkillCutIn({ skillName, robot, onComplete }: SkillCutInProps) {
    return (
        <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
            onAnimationComplete={() => setTimeout(onComplete, 1000)} // Auto-close logic handled here or via parent timeout
            className="absolute inset-x-0 top-1/4 z-[60] flex items-center justify-center pointer-events-none overflow-hidden h-40 bg-black/60 backdrop-blur-sm border-y-2 border-neon-cyan/50"
        >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neon-cyan/20 to-transparent animate-pulse" />

            <div className="container max-w-4xl mx-auto flex items-center gap-8 px-4 relative z-10">
                {/* Robot Avatar Cut-in */}
                <motion.div
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex-shrink-0 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                >
                    <RobotSVG parts={robot.parts} colors={robot.colors} size={120} />
                </motion.div>

                <div className="flex-1">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-neon-cyan font-orbitron text-sm tracking-widest mb-1"
                    >
                        SKILL ACTIVATION
                    </motion.div>
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1.2, opacity: 1 }}
                        transition={{ delay: 0.4, type: "spring" }}
                        className="text-white text-5xl font-black italic tracking-tighter text-shadow-glow"
                        style={{ textShadow: "0 0 20px #0ff" }}
                    >
                        {skillName}
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}
