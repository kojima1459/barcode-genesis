import React from 'react';
import { cn } from '@/lib/utils';

interface SystemSkeletonProps {
    className?: string;
    showText?: boolean;
    text?: string;
    subtext?: string;
}

/**
 * A thematic skeleton loader representing a system booting or scanning state.
 * Uses CSS scanlines and blinking SF text.
 */
export const SystemSkeleton: React.FC<SystemSkeletonProps> = ({
    className,
    showText = true,
    text = "SYSTEM CHECKING...",
    subtext = "INITIALIZING ARCHIVE DATA"
}) => {
    return (
        <div className={cn("system-skeleton-frame flex flex-col items-center justify-center min-h-[100px]", className)}>
            {/* Scanline Overlay */}
            <div className="system-skeleton-scanline" />

            {/* Corner Brackets for that "Interface" feel */}
            <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-accent/30" />
            <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-accent/30" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-accent/30" />
            <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-accent/30" />

            {/* Decorative Binary/Noise Bits */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[8px] font-mono opacity-20 tracking-[1em] select-none pointer-events-none">
                1001011100101
            </div>

            {showText && (
                <div className="relative z-10 flex flex-col items-center gap-2">
                    <span className="system-boot-text text-sm font-bold tracking-[0.2em]">
                        {text}
                    </span>
                    {subtext && (
                        <span className="text-[10px] font-mono text-muted-foreground opacity-60 uppercase tracking-widest">
                            {subtext}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};
