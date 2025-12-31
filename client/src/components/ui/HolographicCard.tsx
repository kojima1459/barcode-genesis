import React, { useRef, MouseEvent } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/contexts/HapticContext';

// Types
interface HolographicCardProps {
    children: React.ReactNode;
    className?: string;
    /** Intensity of the 3D effect (1 = Standard) */
    intensity?: number;
    /** Main glow color */
    glowColor?: string;
}

export function HolographicCard({
    children,
    className,
    intensity = 1,
    glowColor = "#00ccff"
}: HolographicCardProps) {
    const ref = useRef<HTMLDivElement>(null);

    // Motion Values for Mouse Position (0.5 = center)
    const x = useMotionValue(0.5);
    const y = useMotionValue(0.5);

    // Smooth Spring Physics for Rotation
    const springConfig = { damping: 20, stiffness: 200, mass: 0.5 };
    const rotateX = useSpring(useTransform(y, [0, 1], [10 * intensity, -10 * intensity]), springConfig);
    const rotateY = useSpring(useTransform(x, [0, 1], [-10 * intensity, 10 * intensity]), springConfig);

    // Sheen / Glare Position
    // Moves opposite to mouse to simulate light source reflection
    const sheenX = useSpring(useTransform(x, [0, 1], [100, 0]), springConfig);
    const sheenY = useSpring(useTransform(y, [0, 1], [100, 0]), springConfig);

    // Event Handlers
    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();

        // Calculate normalized position (0 to 1)
        const clientX = e.clientX;
        const clientY = e.clientY;

        const newX = (clientX - rect.left) / rect.width;
        const newY = (clientY - rect.top) / rect.height;

        x.set(newX);
        y.set(newY);
    };

    const handleMouseLeave = () => {
        // Reset to center
        x.set(0.5);
        y.set(0.5);
    };

    const { triggerHaptic } = useHaptic();

    return (
        <motion.div
            ref={ref}
            className={cn("relative preserve-3d perspective-1000", className)}
            style={{
                perspective: 1000,
                transformStyle: "preserve-3d",
                rotateX,
                rotateY,
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTap={() => triggerHaptic('light')}
        >
            {/* Content Layer */}
            <div style={{ transform: "translateZ(20px)" }}>
                {children}
            </div>

            {/* Holographic Sheen Overlay */}
            <motion.div
                className="absolute inset-0 pointer-events-none z-50 mix-blend-overlay rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300"
                style={{
                    background: `linear-gradient(
                        115deg, 
                        transparent 20%, 
                        ${glowColor}30 40%, 
                        ${glowColor}60 50%, 
                        ${glowColor}30 60%, 
                        transparent 80%
                    )`,
                    // We translate background position to simulate light movement
                    backgroundSize: "200% 200%",
                    backgroundPositionX: useTransform(sheenX, val => `${val}%`),
                    backgroundPositionY: useTransform(sheenY, val => `${val}%`),
                }}
            />

            {/* Specular Highlight (Corners) */}
            <motion.div
                className="absolute inset-0 pointer-events-none z-40 mix-blend-color-dodge rounded-xl opacity-0 hover:opacity-50 transition-opacity"
                style={{
                    background: `radial-gradient(
                        circle at ${useTransform(x, val => val * 100)}% ${useTransform(y, val => val * 100)}%, 
                        rgba(255,255,255,0.4) 0%, 
                        transparent 50%
                    )`
                }}
            />

        </motion.div>
    );
}
