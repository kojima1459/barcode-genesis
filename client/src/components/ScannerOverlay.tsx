import { motion } from "framer-motion";

interface ScannerOverlayProps {
    isScanning: boolean;
    status: 'idle' | 'searching' | 'detected' | 'success';
}

export default function ScannerOverlay({ isScanning, status }: ScannerOverlayProps) {
    if (!isScanning) return null;

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-5">
            {/* Digital Grid Background */}
            <div
                className="absolute inset-0 opacity-30"
                style={{
                    backgroundImage: `
            linear-gradient(to right, rgba(0, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
          `,
                    backgroundSize: '20px 20px',
                }}
            />

            {/* Scanline Effect - moving line from top to bottom */}
            <motion.div
                className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80"
                animate={{
                    top: ['0%', '100%'],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'linear',
                }}
            />

            {/* Corner Brackets */}
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-cyan-400 opacity-70" />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-cyan-400 opacity-70" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-cyan-400 opacity-70" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-cyan-400 opacity-70" />

            {/* Targeting Reticle in Center */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <motion.div
                    className="w-24 h-24 border-2 border-cyan-400 rounded-lg opacity-50"
                    animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.3, 0.7, 0.3],
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                    }}
                />
                <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-cyan-400 opacity-50" />
                <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-cyan-400 opacity-50" />
            </div>

            {/* Data Analysis Text Overlay */}
            <div className="absolute top-20 left-4 text-xs font-mono text-cyan-400 opacity-70 space-y-1">
                <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                >
                    &gt; SCANNING_PROTOCOL: ACTIVE
                </motion.div>
                <div className="text-green-400">
                    &gt; BARCODE_DETECTION: {status === 'searching' ? 'SEARCHING...' : status === 'detected' ? 'LOCKED' : status === 'success' ? 'COMPLETE' : 'STANDBY'}
                </div>
                <div>
                    &gt; RESOLUTION: 1080p
                </div>
            </div>

            {/* Status indicator bottom right */}
            <div className="absolute bottom-20 right-4 text-right">
                <motion.div
                    className="text-xs font-mono text-cyan-400"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                >
                    ● REC
                </motion.div>
                <div className="text-[10px] text-muted-foreground font-mono">
                    DATA_STREAM_ACTIVE
                </div>
            </div>

            {/* Digital Noise Overlay */}
            <div
                className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                }}
            />
        </div>
    );
}
