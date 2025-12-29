import { useEffect, useState, useRef } from 'react';
import { useTutorial, TutorialStep } from '@/contexts/TutorialContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Fingerprint } from 'lucide-react';

// Map steps to target element IDs and messages
const TUTORIAL_Config: Record<TutorialStep, { targetId: string; message: string; position: 'top' | 'bottom' | 'center' }> = {
    'HOME_GENERATE': {
        targetId: 'tutorial-generate-btn',
        message: "司令官、ユニットが不足しています。\nまずはスキャンを開始して、\n最初の仲間を製造してください。",
        position: 'bottom'
    },
    'SCAN_BARCODE': {
        targetId: 'tutorial-scanner-area',
        message: "スキャナー起動。\n身近な商品のバーコードをカメラに向けてください。",
        position: 'top'
    },
    'SCAN_RESULT': {
        targetId: 'tutorial-scan-result',
        message: "製造完了！\nこれがあなたの最初のパートナーです。\nさあ、共に戦いましょう。",
        position: 'bottom'
    },
    'COMPLETED': {
        targetId: '',
        message: '',
        position: 'center'
    }
};

export default function TutorialOverlay() {
    const { activeStep, isTutorialActive, nextStep } = useTutorial();
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        if (!isTutorialActive || activeStep === 'COMPLETED') return;

        const config = TUTORIAL_Config[activeStep];
        if (!config?.targetId) return;

        let intervalId: NodeJS.Timeout;

        const updateRect = () => {
            const element = document.getElementById(config.targetId);
            if (element) {
                setTargetRect(element.getBoundingClientRect());
            } else {
                // Keep retrying until found
                // This handles the case where Scan Result appears after animation
                setTargetRect(null);
            }
        };

        // Initial check
        updateRect();

        // Poll for element existence/position changes
        intervalId = setInterval(updateRect, 500);

        window.addEventListener('resize', updateRect);
        window.addEventListener('scroll', updateRect);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener('resize', updateRect);
            window.removeEventListener('scroll', updateRect);
        };
    }, [activeStep, isTutorialActive]);

    if (!isTutorialActive || activeStep === 'COMPLETED') return null;

    const config = TUTORIAL_Config[activeStep];

    return (
        <div className='fixed inset-0 z-50 pointer-events-none'>
            {/* Dark overlay with hole using massive box-shadow */}
            {targetRect && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className='absolute rounded-lg transition-all duration-300 ease-out border-2 border-neon-cyan shadow-[0_0_0_9999px_rgba(0,0,0,0.85)]'
                    style={{
                        left: targetRect.left - 4,
                        top: targetRect.top - 4,
                        width: targetRect.width + 8,
                        height: targetRect.height + 8,
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.85)'
                    }}
                />
            )}

            {/* Message Panel */}
            <AnimatePresence mode='wait'>
                {targetRect && (
                    <motion.div
                        key={activeStep}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className='absolute pointer-events-auto max-w-[90vw] w-80'
                        style={{
                            left: '50%',
                            top: config.position === 'bottom'
                                ? targetRect.bottom + 24
                                : targetRect.top - 160, // approximate height of card
                            transform: 'translateX(-50%)',
                        }}
                    >
                        <div
                            className='bg-black/90 border border-neon-cyan p-4 rounded-xl shadow-[0_0_20px_rgba(0,243,255,0.3)] relative'
                            onClick={activeStep === 'SCAN_RESULT' ? nextStep : undefined} // Only result step is clickable to dismiss
                        >
                            {/* Pointer Arrow */}
                            <div
                                className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-black border-l border-t border-neon-cyan transform rotate-45 ${config.position === 'bottom' ? '-top-2.5' : '-bottom-2.5 rotate-[225deg]'
                                    }`}
                            />

                            <div className='flex gap-3'>
                                <div className='mt-1'>
                                    <div className='w-10 h-10 rounded-full bg-neon-cyan/20 flex items-center justify-center border border-neon-cyan'>
                                        <Fingerprint className='w-6 h-6 text-neon-cyan animate-pulse' />
                                    </div>
                                </div>
                                <div>
                                    <h3 className='font-orbitron text-neon-cyan text-sm mb-1'>SYSTEM MESSAGE</h3>
                                    <p className='text-white text-sm whitespace-pre-line leading-relaxed'>
                                        {config.message}
                                    </p>
                                    {activeStep === 'SCAN_RESULT' && (
                                        <p className='text-xs text-muted-foreground mt-2 animate-pulse'>タップして終了</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
