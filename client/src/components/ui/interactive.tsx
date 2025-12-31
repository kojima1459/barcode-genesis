import { motion } from "framer-motion";
import { useHaptic } from "@/contexts/HapticContext";
import { useSound } from "@/contexts/SoundContext";
import { cn } from "@/lib/utils";

interface InteractiveProps {
    children: React.ReactNode;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
    haptic?: 'light' | 'medium' | 'heavy' | 'success';
    /** If true, only children will be rendered without the motion wrapper (useful for disabling the effect) */
    disabled?: boolean;
}

export const Interactive = ({
    children,
    className,
    onClick,
    haptic = 'light',
    disabled = false
}: InteractiveProps) => {
    const { triggerHaptic } = useHaptic();
    const { playSE } = useSound();

    if (disabled) return <div className={className} onClick={onClick}>{children}</div>;

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            onClick={(e) => {
                triggerHaptic(haptic);
                playSE('se_click');
                onClick?.(e);
            }}
            className={cn(
                "cursor-pointer interactive-glow",
                className
            )}
        >
            {children}
        </motion.div>
    );
};
