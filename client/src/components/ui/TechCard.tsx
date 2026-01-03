import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TechCardProps {
    children: ReactNode;
    className?: string;
    header?: ReactNode;
    footer?: ReactNode;
    variant?: string;
    intensity?: string;
}

export function TechCard({ children, className, header, footer, variant: _variant, intensity: _intensity }: TechCardProps) {
    return (
        <div className={cn(
            "glass-panel border-white/10 overflow-hidden relative group transition-all duration-300",
            "hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]",
            className
        )}>
            {/* Scanning Line Effect */}
            <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-primary/20 to-transparent transform -translate-y-full group-hover:translate-y-[400px] transition-transform duration-1000 ease-in-out pointer-events-none" />

            {header && (
                <div className="px-5 py-3 border-b border-white/10 bg-white/5 font-orbitron text-sm font-bold tracking-wider">
                    {header}
                </div>
            )}

            <div className="p-5 relative z-10">
                {children}
            </div>

            {footer && (
                <div className="px-5 py-3 border-t border-white/10 bg-white/5 mt-auto">
                    {footer}
                </div>
            )}
        </div>
    );
}
