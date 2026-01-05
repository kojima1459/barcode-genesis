import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSound } from '@/contexts/SoundContext';

interface BattleIntroProps {
    onComplete: () => void;
}

export default function BattleIntro({ onComplete }: BattleIntroProps) {
    const [phase, setPhase] = useState<'ready' | 'fight' | 'done'>('ready');
    const { playSE } = useSound();

    useEffect(() => {
        // READY phase
        playSE('se_rare');
        const readyTimer = setTimeout(() => {
            setPhase('fight');
            playSE('se_start');
        }, 1000);

        // FIGHT phase
        const fightTimer = setTimeout(() => {
            setPhase('done');
        }, 2000);

        // Complete
        const completeTimer = setTimeout(() => {
            onComplete();
        }, 2500);

        return () => {
            clearTimeout(readyTimer);
            clearTimeout(fightTimer);
            clearTimeout(completeTimer);
        };
    }, [onComplete, playSE]);

    if (phase === 'done') return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-none">
            <AnimatePresence mode="wait">
                {phase === 'ready' && (
                    <motion.div
                        key="ready"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.5 }}
                        transition={{ duration: 0.3 }}
                        className="text-center"
                    >
                        <div className="text-7xl md:text-9xl font-black italic text-neon-cyan drop-shadow-[0_0_30px_rgba(0,243,255,0.8)] font-orbitron tracking-wider">
                            READY
                        </div>
                        <div className="text-2xl md:text-3xl text-white/60 mt-4 font-mono animate-pulse">
                            システム起動中...
                        </div>
                    </motion.div>
                )}

                {phase === 'fight' && (
                    <motion.div
                        key="fight"
                        initial={{ opacity: 0, scale: 0.3, rotate: -10 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 1.2 }}
                        transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
                        className="text-center"
                    >
                        <div className="text-8xl md:text-[12rem] font-black italic text-neon-pink drop-shadow-[0_0_40px_rgba(255,0,85,1)] font-orbitron tracking-widest animate-pulse">
                            FIGHT!
                        </div>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 0.5 }}
                            className="h-1 bg-linear-to-r from-transparent via-neon-cyan to-transparent mt-6"
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
