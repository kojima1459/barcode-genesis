import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

interface SkillBannerProps {
    skillName: string;
    isPlayer: boolean;
    onComplete: () => void;
}

export default function SkillBanner({ skillName, isPlayer, onComplete }: SkillBannerProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onComplete();
        }, 1100);

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <motion.div
            initial={{
                x: isPlayer ? -300 : 300,
                opacity: 0,
                scale: 0.8
            }}
            animate={{
                x: 0,
                opacity: 1,
                scale: 1
            }}
            exit={{
                x: isPlayer ? -300 : 300,
                opacity: 0,
                scale: 0.8
            }}
            transition={{
                duration: 0.3,
                type: 'spring',
                stiffness: 150
            }}
            className={`fixed top-1/3 z-[90] ${isPlayer ? 'left-4' : 'right-4'} pointer-events-none`}
        >
            <div className={`
                px-6 py-3 rounded-xl border-2 
                bg-black/90 backdrop-blur-md
                shadow-[0_0_30px_rgba(255,200,0,0.6)]
                ${isPlayer
                    ? 'border-neon-cyan text-neon-cyan'
                    : 'border-neon-pink text-neon-pink'
                }
            `}>
                <div className="flex items-center gap-3">
                    <Zap className={`w-5 h-5 ${isPlayer ? 'text-neon-cyan' : 'text-neon-pink'} animate-pulse`} fill="currentColor" />
                    <div>
                        <div className="text-[10px] font-mono text-white/60 uppercase tracking-wider">
                            Skill Activated
                        </div>
                        <div className="text-lg font-black italic font-orbitron tracking-wide">
                            {skillName}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
