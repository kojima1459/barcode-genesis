import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ScrambleTextProps {
    text: string;
    /** Duration in ms for the entire scramble effect */
    duration?: number;
    /** Minimum interval between character shuffles in ms (throttling) */
    shuffleSpeed?: number;
    /** Delay before starting the effect */
    delay?: number;
    className?: string;
    /** Render as this HTML tag */
    as?: React.ElementType;
    /** Character set to use for scrambling */
    scrambleChars?: string;
    /** If true, runs the effect on every text change. */
    triggerOnTextChange?: boolean;
    /** If true, shows text immediately without scrambling */
    instant?: boolean;
    /** Optional callback when animation finishes */
    onComplete?: () => void;
}

const MATRIX_CHARS = "ｦｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ23456789X*+-<>[]{}";

export function ScrambleText({
    text,
    duration = 800,
    shuffleSpeed = 40,
    delay = 0,
    className,
    as: Component = "span",
    scrambleChars = MATRIX_CHARS,
    triggerOnTextChange = true,
    instant = false,
    onComplete
}: ScrambleTextProps) {
    const [displayText, setDisplayText] = useState(instant ? text : "");
    const [isAnimating, setIsAnimating] = useState(false);

    const prevTextRef = useRef(text);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const animationRef = useRef<number | null>(null);
    const lastShuffleTimeRef = useRef(0);

    const startAnimation = useCallback(() => {
        if (instant) {
            setDisplayText(text);
            return;
        }

        setIsAnimating(true);
        const startTime = Date.now();
        const length = text.length;

        const update = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Determine if we should shuffle characters this frame
            const shouldShuffle = now - lastShuffleTimeRef.current >= shuffleSpeed;

            if (shouldShuffle || progress === 1) {
                if (shouldShuffle) lastShuffleTimeRef.current = now;

                // Determine how many characters are "fixed"
                const fixedCount = Math.floor(progress * length);

                let result = "";
                for (let i = 0; i < length; i++) {
                    if (i < fixedCount) {
                        result += text[i];
                    } else if (text[i] === " ") {
                        result += " ";
                    } else {
                        result += scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
                    }
                }
                setDisplayText(result);
            }

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(update);
            } else {
                setDisplayText(text);
                setIsAnimating(false);
                if (onComplete) onComplete();
            }
        };

        animationRef.current = requestAnimationFrame(update);
    }, [text, duration, shuffleSpeed, scrambleChars, instant, onComplete]);

    useEffect(() => {
        if (instant) {
            setDisplayText(text);
            return;
        }

        // Trigger logic
        if (!triggerOnTextChange && prevTextRef.current === text && displayText !== "") return;

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (animationRef.current) cancelAnimationFrame(animationRef.current);

        if (delay > 0) {
            timeoutRef.current = setTimeout(startAnimation, delay);
        } else {
            startAnimation();
        }

        prevTextRef.current = text;

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [text, delay, instant, triggerOnTextChange, startAnimation]);

    return (
        <Component className={cn("font-mono", className)}>
            {displayText}
        </Component>
    );
}
