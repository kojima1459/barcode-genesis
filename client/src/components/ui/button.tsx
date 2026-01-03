import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, HTMLMotionProps } from "framer-motion";
import { useHaptic } from "@/contexts/HapticContext";
import { useSound } from "@/contexts/SoundContext";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive interactive-glow",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_10px_rgba(var(--primary),0.2)] hover:shadow-[0_0_20px_rgba(var(--primary),0.4)] [clip-path:polygon(12px_0,100%_0,100%_calc(100%_-12px),calc(100%_-12px)_100%,0_100%,0_12px)] relative overflow-hidden after:absolute after:inset-0 after:bg-white/10 after:opacity-0 hover:after:opacity-100 after:transition-opacity",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 [clip-path:polygon(8px_0,100%_0,100%_calc(100%_-8px),calc(100%_-8px)_100%,0_100%,0_8px)]",
        outline:
          "border bg-transparent shadow-xs hover:bg-accent dark:bg-transparent dark:border-input dark:hover:bg-input/50 border-white/20 hover:border-accent/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent dark:hover:bg-accent/50 hover:text-accent",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof HTMLMotionProps<"button">>,
  HTMLMotionProps<"button">,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onClick, ...props }, ref) => {
    // Use try-catch pattern to handle cases where Button is used outside providers
    let triggerHaptic: (type: string) => void = () => { };
    let playSE: (type: string) => void = () => { };

    try {
      const hapticContext = useHaptic();
      triggerHaptic = hapticContext.triggerHaptic;
    } catch {
      // No-op if HapticProvider is not available
    }

    try {
      const soundContext = useSound();
      playSE = soundContext.playSE;
    } catch {
      // No-op if SoundProvider is not available
    }

    const Comp = asChild ? Slot : motion.button

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      triggerHaptic('light'); // Centralized haptic
      playSE('se_click');
      onClick?.(e);
    }

    // framer-motion props
    const motionProps = {
      whileHover: { scale: 1.02 },
      whileTap: { scale: 0.95 },
      transition: { type: "spring", stiffness: 400, damping: 17 }
    };

    return (
      // @ts-ignore
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref as any}
        onClick={handleClick}
        {...(asChild ? {} : motionProps)}
        {...props}
      />
    )
  }
)

Button.displayName = "Button";

export { Button, buttonVariants };
