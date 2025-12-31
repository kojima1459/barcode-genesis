import React from "react";
import { cn } from "@/lib/utils";

interface TechCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    variant?: "default" | "glow" | "outline";
    intensity?: "low" | "medium" | "high";
    className?: string;
    cornerSize?: number;
}

export function TechCard({
    children,
    variant = "default",
    intensity = "medium",
    className,
    cornerSize = 12,
    ...props
}: TechCardProps) {
    // Intensity map for background opacity
    const intensityMap = {
        low: "bg-surface/40 backdrop-blur-sm",
        medium: "bg-surface/60 backdrop-blur-md",
        high: "bg-surface/80 backdrop-blur-lg",
    };

    return (
        <div
            className={cn(
                "relative rounded-lg border border-white/10 overflow-hidden transition-all duration-300",
                intensityMap[intensity],
                // Inner Glow Logic
                variant === "glow" && "shadow-[inset_0_0_20px_rgba(var(--accent),0.1)] border-accent/30",
                variant === "outline" && "bg-transparent border-white/20 hover:border-accent/50",
                // Hover effect for all
                "hover:shadow-[0_0_15px_rgba(0,0,0,0.3)] hover:border-white/20",
                className
            )}
            {...props}
        >
            {/* Tech Corners (Top Left) */}
            <svg
                className="absolute top-0 left-0 w-8 h-8 pointer-events-none opacity-50 text-accent"
                viewBox="0 0 32 32"
                fill="none"
            >
                <path d="M1 12V1H12" stroke="currentColor" strokeWidth="2" />
            </svg>

            {/* Tech Corners (Bottom Right) */}
            <svg
                className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none opacity-50 text-accent"
                viewBox="0 0 32 32"
                fill="none"
            >
                <path d="M31 20V31H20" stroke="currentColor" strokeWidth="2" />
            </svg>

            {/* Scanline overlay (optional subtle texture) */}
            <div className="absolute inset-0 bg-[url('/scanline.png')] opacity-[0.02] pointer-events-none mix-blend-overlay" />

            {/* Content */}
            <div className="relative z-10">{children}</div>
        </div>
    );
}
