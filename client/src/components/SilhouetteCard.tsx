/**
 * SilhouetteCard - Placeholder card for uncollected dex entries
 *
 * Displays a silhouetted robot preview with limited info,
 * encouraging players to collect it.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import RobotSVG from "@/components/RobotSVG";
import {
    DexSlot,
    ROLE_LABELS,
    RARITY_LABELS,
    getPlaceholderVisuals,
    getPlaceholderColors,
} from "@/lib/dexRegistry";

interface SilhouetteCardProps {
    slot: DexSlot;
    /** Optional language for labels */
    lang?: "ja" | "en";
}

export default function SilhouetteCard({ slot, lang = "ja" }: SilhouetteCardProps) {
    const { parts, variantKey } = getPlaceholderVisuals(slot);
    const colors = getPlaceholderColors();
    const roleLabel = ROLE_LABELS[slot.role][lang];
    const rarityLabel = RARITY_LABELS[slot.rarity]?.[lang] ?? "???";

    // Rarity-based styling (dimmed for locked entries)
    const rarityStyles: Record<number, string> = {
        1: "border-white/5 text-white/30",
        2: "border-blue-400/20 text-blue-400/40",
        3: "border-purple-400/20 text-purple-400/40",
        4: "border-amber-400/20 text-amber-400/40",
        5: "border-neon-pink/20 text-neon-pink/40",
    };

    return (
        <Card
            className="bg-black/40 border-white/5 opacity-70 hover:opacity-90 transition-opacity cursor-default"
            data-testid="silhouette-card"
            data-slot-id={slot.id}
        >
            <CardContent className="p-3 flex gap-3">
                {/* Silhouetted robot preview */}
                <div className="shrink-0 w-[72px] h-[72px] flex items-center justify-center rounded border border-white/5 bg-black/30">
                    <RobotSVG
                        parts={parts}
                        colors={colors}
                        size={68}
                        animate={false}
                        silhouette={true}
                        variantKey={variantKey}
                        isRareVariant={slot.rarity >= 3}
                    />
                </div>

                {/* Info section */}
                <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1">
                    {/* Mystery name */}
                    <div className="font-bold text-white/40 text-sm">???</div>

                    {/* Badges: Role (visible) + Rarity (dimmed) */}
                    <div className="flex flex-wrap gap-1">
                        <Badge
                            variant="outline"
                            className="text-[9px] border-amber-400/30 text-amber-300/60 bg-amber-400/5"
                        >
                            {roleLabel}
                        </Badge>
                        <Badge
                            variant="outline"
                            className={`text-[9px] ${rarityStyles[slot.rarity] ?? rarityStyles[1]}`}
                        >
                            {rarityLabel}
                        </Badge>
                    </div>

                    {/* Hint text */}
                    <div className="text-[10px] text-muted-foreground/60">
                        {lang === "ja" ? "スキャンで入手" : "Scan to unlock"}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
