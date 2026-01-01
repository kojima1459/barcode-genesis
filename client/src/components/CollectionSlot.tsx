import { memo } from "react";
import { motion } from "framer-motion";
import RobotSVG from "@/components/RobotSVG";
import { RobotData, RobotRole } from "@/types/shared";
import { Badge } from "@/components/ui/badge";
import { getRarityLabel } from "@/lib/rarity";

interface CollectionSlotProps {
    role: RobotRole;
    rarity: number; // 1-5
    robot?: RobotData;
    unlocked: boolean;
}

const PLACEHOLDER_PARTS = {
    head: 1,
    face: 1,
    body: 1,
    armLeft: 1,
    armRight: 1,
    legLeft: 1,
    legRight: 1,
    backpack: 1,
    weapon: 1,
    accessory: 1,
};

const PLACEHOLDER_COLORS = {
    primary: "#888888",
    secondary: "#666666",
    accent: "#aaaaaa",
    glow: "#ffffff",
};

const CollectionSlot = memo(function CollectionSlot({ role, rarity, robot, unlocked }: CollectionSlotProps) {
    const rarityLabel = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"][rarity - 1] || "COMMON";
    const rarityColor = [
        "border-white/20 bg-white/5 text-white/60", // Common
        "border-green-400/30 bg-green-400/5 text-green-400", // Uncommon
        "border-blue-400/30 bg-blue-400/5 text-blue-400", // Rare
        "border-purple-400/30 bg-purple-400/5 text-purple-400", // Epic
        "border-yellow-400/30 bg-yellow-400/5 text-yellow-400", // Legendary
    ][rarity - 1];

    return (
        <div className={`relative aspect-square rounded-xl border ${unlocked ? "border-neon-cyan/30 bg-black/40" : "border-white/5 bg-black/20"} overflow-hidden group`}>
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none" />

            {/* Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                <div className="relative w-full h-full flex items-center justify-center">
                    {unlocked && robot ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            className="w-full h-full flex items-center justify-center"
                        >
                            <RobotSVG parts={robot.parts} colors={robot.colors} size={100} />
                        </motion.div>
                    ) : (
                        <div className="relative w-full h-full flex items-center justify-center">
                            {/* Silhouette */}
                            <div className="opacity-20 filter brightness-0">
                                <RobotSVG parts={PLACEHOLDER_PARTS} colors={PLACEHOLDER_COLORS} size={80} />
                            </div>
                            {/* Question Mark */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-3xl font-bold text-white/20">?</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Labels */}
                <div className="absolute top-2 right-2">
                    <Badge variant="outline" className={`text-[9px] h-4 px-1 ${rarityColor}`}>
                        {rarityLabel}
                    </Badge>
                </div>

                {/* Name if unlocked */}
                {unlocked && robot && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-sm p-1 text-center">
                        <div className="text-[10px] font-bold text-white truncate px-1">
                            {robot.name}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

export default CollectionSlot;
