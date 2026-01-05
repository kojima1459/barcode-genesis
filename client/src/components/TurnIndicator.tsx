import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSound } from '@/contexts/SoundContext';

interface TurnIndicatorProps {
    turn: number;
    onComplete?: () => void;
}

export default function TurnIndicator({ turn, onComplete }: TurnIndicatorProps) {
    const [show, setShow] = useState(true);
    const { playSE } = useSound();

    useEffect(() => {
        // Play turn change SE
        playSE('se_reveal');

        // Auto-hide after animation
        const timer = setTimeout(() => {
            setShow(false);
            onComplete?.();
        }, 1200);

        return () => clearTimeout(timer);
    }, [turn, onComplete, playSE]);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    key={`turn-${turn}`}
                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.2, y: -20 }}
                    transition={{
                        duration: 0.4,
                        type: 'spring',
                        stiffness: 200
                    }}
                    className="fixed inset-0 z-[80] flex items-center justify-center pointer-events-none"
                >
                    <div className="relative">
                        {/* Glow effect */}
                        <div className="absolute inset-0 blur-xl bg-neon-cyan/30 rounded-full scale-150" />

                        {/* Main text */}
                        <div className="relative">
                            <div className="text-[10px] font-mono text-white/60 uppercase tracking-[0.3em] text-center mb-1">
                                — PHASE —
                            </div>
                            <div className="text-7xl md:text-9xl font-black italic font-orbitron text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)] tracking-wider">
                                {turn}
                            </div>
                        </div>

                        {/* Decorative lines */}
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="h-0.5 bg-gradient-to-r from-transparent via-neon-cyan to-transparent mt-4"
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
