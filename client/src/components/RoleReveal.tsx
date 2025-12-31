import { useEffect, useState } from 'react';

interface RoleRevealProps {
    roleName: string;
    roleTitle: string;
    isRare: boolean;
    onComplete: () => void;
}

export default function RoleReveal({ roleName, roleTitle, isRare, onComplete, onRevealMoment }: RoleRevealProps & { onRevealMoment?: () => void }) {
    const [phase, setPhase] = useState<'scan' | 'flash' | 'role' | 'done'>('scan');

    useEffect(() => {
        // Scan phase: 400ms (sweep)
        const scanTimer = setTimeout(() => setPhase('flash'), 400);

        // Flash phase: 100ms
        const flashTimer = setTimeout(() => {
            setPhase('role');
            onRevealMoment?.();
        }, 500);

        // Role display: 1000ms, then complete
        const completeTimer = setTimeout(() => {
            setPhase('done');
            onComplete();
        }, 1500);

        return () => {
            clearTimeout(scanTimer);
            clearTimeout(flashTimer);
            clearTimeout(completeTimer);
        };
    }, [onComplete, onRevealMoment]);

    if (phase === 'done') return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            {/* Scan Sweep overlay */}
            {phase === 'scan' && (
                <div className="absolute inset-x-0 h-2 bg-neon-cyan/80 shadow-[0_0_20px_#00f3ff] animate-[scanSweep_400ms_linear_forwards]" />
            )}

            {/* Flash overlay */}
            {phase === 'flash' && (
                <div
                    className="absolute inset-0 bg-white animate-[flashOut_300ms_ease-out_forwards]"
                    aria-hidden="true"
                />
            )}

            {/* Role reveal */}
            {phase === 'role' && (
                <div className="flex flex-col items-center gap-4 animate-[popIn_400ms_ease-out]">
                    {/* RARE badge */}
                    {isRare && (
                        <div className="px-6 py-2 bg-linear-to-r from-yellow-500 to-amber-400 rounded-full 
                          text-black font-bold text-xl tracking-widest
                          shadow-[0_0_30px_rgba(255,215,0,0.8)] animate-pulse">
                            ★ RARE ★
                        </div>
                    )}

                    {/* Role title */}
                    <div
                        className={`text-6xl md:text-8xl font-orbitron font-black tracking-wider
                       ${isRare
                                ? 'text-transparent bg-clip-text bg-linear-to-r from-yellow-300 via-amber-400 to-yellow-500 drop-shadow-[0_0_30px_gold]'
                                : 'text-neon-cyan drop-shadow-[0_0_20px_rgba(62,208,240,0.8)]'
                            }`}
                    >
                        {roleTitle}
                    </div>

                    {/* Role name */}
                    <div className={`text-2xl md:text-3xl font-bold tracking-wide
                          ${isRare ? 'text-yellow-200' : 'text-white/80'}`}>
                        {roleName}
                    </div>
                </div>
            )}

            {/* Background glow for rare */}
            {isRare && phase === 'role' && (
                <div
                    className="absolute inset-0 bg-gradient-radial from-yellow-500/30 via-transparent to-transparent"
                    aria-hidden="true"
                />
            )}
            <style>{`
                @keyframes scanSweep {
                    0% { top: -10%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 110%; opacity: 0; }
                }
            `}</style>
        </div>
    );
}
