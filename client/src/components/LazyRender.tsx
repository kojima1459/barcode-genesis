import React, { useRef, useState, useEffect } from "react";

interface LazyRenderProps {
    children: React.ReactNode;
    threshold?: number;
    rootMargin?: string;
    className?: string;
    minHeight?: string | number;
}

/**
 * LazyRender component
 * Renders children only when they come into view (with a margin).
 * Helps optimize performance for long lists of heavy components like RobotSVG.
 */
export default function LazyRender({
    children,
    threshold = 0.05, // Lower threshold for faster trigger
    rootMargin = "200px 0px", // Preload 200px before
    className,
    minHeight = "auto"
}: LazyRenderProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    useEffect(() => {
        if (hasLoaded) return; // Once loaded, stay loaded

        const element = ref.current;
        if (!element) return;

        // Check if IntersectionObserver is supported
        if (!("IntersectionObserver" in window)) {
            setHasLoaded(true);
            setIsVisible(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setHasLoaded(true);
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold, rootMargin }
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [hasLoaded, threshold, rootMargin]);

    return (
        <div ref={ref} className={className} style={{ minHeight: isVisible ? undefined : minHeight }}>
            {isVisible ? children : null}
        </div>
    );
}
