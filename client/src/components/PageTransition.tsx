import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
    children: ReactNode;
    className?: string;
}

/**
 * PageTransition component that applies a futuristic "Cyber Wipe" and "Glitch" effect.
 */
export default function PageTransition({ children, className = "" }: PageTransitionProps) {
    return (
        <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={{
                initial: {
                    opacity: 0,
                    scale: 0.95,
                    filter: "blur(10px) brightness(0.5)",
                },
                animate: {
                    opacity: 1,
                    scale: 1,
                    filter: "blur(0px) brightness(1)",
                    transition: {
                        duration: 0.5,
                        delay: 0.2, // Wait for shutter to start opening
                        ease: [0.22, 1, 0.36, 1],
                    },
                },
                exit: {
                    opacity: 0,
                    scale: 1.05,
                    filter: "blur(10px) brightness(1.5)",
                    transition: {
                        duration: 0.4,
                        ease: [0.64, 0, 0.78, 0],
                    },
                },
            }}
            className={cn("transition-content-wrapper min-h-screen w-full relative", className)}
        >
            {/* Cyber Shutter (Managed by child variants) */}
            <div className="fixed inset-0 z-[9999] pointer-events-none flex flex-col">
                <motion.div
                    className="cyber-shutter-half bg-background border-b-2 border-accent shadow-[0_0_30px_rgba(0,255,255,0.2)]"
                    variants={{
                        initial: { translateY: "0%" },
                        animate: { translateY: "-100%" },
                        exit: { translateY: "0%" }
                    }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    style={{ flex: 1 }}
                />
                <motion.div
                    className="cyber-shutter-half bg-background border-t-2 border-accent shadow-[0_0_30px_rgba(0,255,255,0.2)]"
                    variants={{
                        initial: { translateY: "0%" },
                        animate: { translateY: "100%" },
                        exit: { translateY: "0%" }
                    }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    style={{ flex: 1 }}
                />
            </div>

            {/* Glitch Overlay */}
            <motion.div
                className="glitch-overlay fixed inset-0 z-[10000] pointer-events-none mix-blend-exclusion"
                variants={{
                    initial: { opacity: 0, x: 0 },
                    animate: { opacity: 0, x: 0 },
                    exit: {
                        opacity: [0, 0.8, 0.4, 0.9, 0],
                        x: [0, -10, 10, -5, 0],
                        skewX: [0, 10, -10, 5, 0],
                        backgroundColor: ["rgba(0,0,0,0)", "rgba(0,255,255,0.5)", "rgba(255,0,255,0.5)", "rgba(0,0,0,0)"],
                        transition: { duration: 0.3, ease: "linear" }
                    }
                }}
            />

            <div className="relative z-0">
                {children}
            </div>
        </motion.div>
    );
}
