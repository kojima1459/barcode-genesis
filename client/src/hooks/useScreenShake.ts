import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

interface UseScreenShakeOptions {
    intensity?: "light" | "medium" | "heavy";
    duration?: number;
}

export function useScreenShake() {
    const [isShaking, setIsShaking] = useState(false);
    const [shakeStyle, setShakeStyle] = useState({});
    const prefersReducedMotion = useReducedMotion();

    const shake = ({ intensity = "medium", duration = 300 }: UseScreenShakeOptions = {}) => {
        if (prefersReducedMotion) return;

        const intensityMap = {
            light: 2,
            medium: 4,
            heavy: 8
        };

        const amount = intensityMap[intensity];

        setIsShaking(true);

        // Generate random shake values
        const frames = 10;
        const interval = duration / frames;
        let frame = 0;

        const shakeInterval = setInterval(() => {
            if (frame >= frames) {
                setShakeStyle({});
                setIsShaking(false);
                clearInterval(shakeInterval);
                return;
            }

            const x = (Math.random() - 0.5) * amount;
            const y = (Math.random() - 0.5) * amount;

            setShakeStyle({
                transform: `translate(${x}px, ${y}px)`
            });

            frame++;
        }, interval);
    };

    return { shake, isShaking, shakeStyle };
}
