import { motion, LazyMotion, domAnimation } from "framer-motion";
import { ReactNode, useMemo } from "react";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
    children: ReactNode;
    className?: string;
}

/**
 * PageTransition component - Performance Optimized
 * 
 * Uses LazyMotion with domAnimation for smaller bundle.
 * Respects prefers-reduced-motion for accessibility and performance.
 */
export default function PageTransition({ children, className = "" }: PageTransitionProps) {
    // Check for reduced motion preference
    const prefersReducedMotion = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }, []);

    // Simple fade for reduced motion or lightweight transition
    if (prefersReducedMotion) {
        return (
            <div className={cn("min-h-screen w-full relative", className)}>
                {children}
            </div>
        );
    }

    return (
        <LazyMotion features={domAnimation}>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={cn("min-h-screen w-full relative", className)}
            >
                {children}
            </motion.div>
        </LazyMotion>
    );
}
