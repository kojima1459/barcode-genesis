import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RobotSVG from './RobotSVG';
import { RobotData, VariantData } from '@/types/shared';
import { Button } from './ui/button';
import { Zap, Sparkles, X } from 'lucide-react';
import { useSound } from '@/contexts/SoundContext';

interface FusionAnimationProps {
    parentA: RobotData;
    parentB: RobotData;
    result: VariantData;
    onClose: () => void;
}

export default function FusionAnimation({ parentA, parentB, result, onClose }: FusionAnimationProps) {
    const [phase, setPhase] = useState<'intro' | 'merge' | 'flash' | 'reveal'>('intro');
    const { playSE } = useSound();

    useEffect(() => {
        // Sequence
        // 0ms: Intro (Parents appear)
        playSE('se_equip');

        const t1 = setTimeout(() => {
            setPhase('merge');
            playSE('se_attack'); // Whoosh sound?
        }, 1000);

        const t2 = setTimeout(() => {
            setPhase('flash');
            playSE('se_levelup'); // Boom/Tada
        }, 2000);

        const t3 = setTimeout(() => {
            setPhase('reveal');
        }, 2200);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, []);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            >
                {/* Intro & Merge Phase: Parents */}
                {phase !== 'reveal' && (
                    <div className="relative w-full max-w-lg h-64 flex items-center justify-center">
                        {/* Parent A */}
                        <motion.div
                            initial={{ x: -200, opacity: 0 }}
                            animate={
                                phase === 'intro' ? { x: -100, opacity: 1 } :
                                    phase === 'merge' ? { x: 0, opacity: 0.5, scale: 0.5 } :
                                        { opacity: 0 }
                            }
                            transition={{ duration: 0.8, type: "spring" }}
                            className="absolute"
                        >
                            <RobotSVG parts={parentA.parts} colors={parentA.colors} size={150} animate={true} />
                        </motion.div>

                        {/* Parent B */}
                        <motion.div
                            initial={{ x: 200, opacity: 0 }}
                            animate={
                                phase === 'intro' ? { x: 100, opacity: 1 } :
                                    phase === 'merge' ? { x: 0, opacity: 0.5, scale: 0.5 } :
                                        { opacity: 0 }
                            }
                            transition={{ duration: 0.8, type: "spring" }}
                            className="absolute"
                        >
                            <div className="transform scale-x-[-1]"> {/* Flip for symmetry */}
                                <RobotSVG parts={parentB.parts} colors={parentB.colors} size={150} animate={true} />
                            </div>
                        </motion.div>

                        {/* Energy Core */}
                        {phase === 'merge' && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: [1, 1.5, 0.1], opacity: 1, rotate: 360 }}
                                transition={{ duration: 1 }}
                                className="absolute z-10 p-8 rounded-full bg-white/20 blur-xl"
                            >
                                <Zap className="w-16 h-16 text-yellow-400 fill-yellow-400" />
                            </motion.div>
                        )}
                    </div>
                )}

                {/* Flash Phase */}
                {phase === 'flash' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 0.5 }}
                        className="fixed inset-0 bg-white z-[60]"
                    />
                )}

                {/* Reveal Phase: Result */}
                {phase === 'reveal' && (
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className="flex flex-col items-center space-y-8"
                    >
                        <div className="relative">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 bg-gradient-to-r from-cyan-500/30 to-purple-500/30 blur-3xl rounded-full"
                            />
                            <RobotSVG parts={result.parts} colors={result.colors} size={250} animate={true} />

                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.5 }}
                                className="absolute -top-4 -right-4"
                            >
                                <Sparkles className="w-12 h-12 text-yellow-400 animate-pulse" />
                            </motion.div>
                        </div>

                        <div className="text-center space-y-2">
                            <motion.h2
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400"
                            >
                                VARIANT FUSED!
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-muted-foreground font-mono"
                            >
                                ID: {result.id?.slice(0, 8)}
                            </motion.p>
                        </div>

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.8 }}
                        >
                            <Button onClick={onClose} size="lg" className="min-w-[200px] border-neon-cyan/50 hover:bg-neon-cyan/20">
                                Collect Unit
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
