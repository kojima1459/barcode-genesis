import { useState, useCallback, useRef, useEffect } from "react";
import { RobotVariant } from "@/components/RobotSVG";

export type RobotFxState = {
    variant: RobotVariant;
    nonce: number;
};

export const useRobotFx = () => {
    const [fx, setFx] = useState<RobotFxState>({ variant: "idle", nonce: 0 });
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const trigger = useCallback((variant: RobotVariant) => {
        // Determine duration based on variant
        let duration = 0;
        if (variant === "scan") duration = 400;
        else if (variant === "battle") duration = 600;
        else if (variant === "evolve") duration = 900;

        // Clear existing timer if any
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        // Set new active state with incremented nonce
        setFx(prev => ({ variant, nonce: prev.nonce + 1 }));

        // Set timer to revert to idle
        if (duration > 0) {
            timerRef.current = setTimeout(() => {
                setFx(prev => ({ variant: "idle", nonce: prev.nonce + 1 }));
            }, duration);
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    return { fx, trigger };
};
