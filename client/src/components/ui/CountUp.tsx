import { useEffect, useRef } from "react";
import { useMotionValue, useSpring, useTransform, motion, animate } from "framer-motion";
import { useSound } from "@/contexts/SoundContext";
import { cn } from "@/lib/utils";

interface CountUpProps {
    value: number;
    duration?: number;
    className?: string;
    prefix?: string;
    suffix?: string;
}

export function CountUp({ value, duration = 1, className, prefix = "", suffix = "" }: CountUpProps) {
    const { playSE } = useSound();
    const motionValue = useMotionValue(0);
    const springValue = useSpring(motionValue, { stiffness: 50, damping: 20 }); // Smooth spring effect
    const displayValue = useTransform(springValue, (current) => Math.round(current).toLocaleString());
    const prevValueRef = useRef(0);
    const lastSoundTimeRef = useRef(0);

    useEffect(() => {
        const controls = animate(motionValue, value, { duration });

        return controls.stop;
    }, [value, duration, motionValue]);

    // Monitor value changes for sound effect
    useEffect(() => {
        const unsubscribe = springValue.on("change", (latest) => {
            const current = Math.round(latest);

            // Only play sound if value changed by at least 1
            if (current !== prevValueRef.current) {
                const now = Date.now();
                // Throttle sound to max 15 per second (approx every 66ms)
                if (now - lastSoundTimeRef.current > 75) {
                    playSE("se_click");
                    lastSoundTimeRef.current = now;
                }
                prevValueRef.current = current;
            }
        });

        return unsubscribe;
    }, [springValue, playSE]);

    return (
        <span className={cn("font-mono font-bold inline-flex", className)}>
            {prefix}
            <motion.span>{displayValue}</motion.span>
            {suffix}
        </span>
    );
}
