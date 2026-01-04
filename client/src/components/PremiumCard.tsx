import { Link } from "wouter";
import { Crown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface PremiumCardProps {
    className?: string;
}

export function PremiumCard({ className }: PremiumCardProps) {
    const { t } = useLanguage();

    return (
        <Link href="/premium">
            <div className={`relative overflow-hidden rounded-xl border border-yellow-500/50 bg-black/40 backdrop-blur-sm group hover:border-yellow-400 transition-all cursor-pointer h-24 flex items-center px-6 shadow-[0_0_15px_rgba(234,179,8,0.2)] ${className}`}>
                <div className="absolute inset-0 bg-linear-to-r from-yellow-900/40 via-yellow-900/10 to-transparent" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-30" />
                <Crown className="absolute -right-4 -bottom-4 w-32 h-32 text-yellow-500/10 rotate-[-15deg] group-hover:scale-110 group-hover:text-yellow-500/20 transition-all duration-700" />

                <div className="relative z-10 flex items-center gap-4 w-full">
                    <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center border border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.4)] group-hover:shadow-[0_0_25px_rgba(234,179,8,0.6)] transition-all">
                        <Crown className="w-6 h-6 text-yellow-400 group-hover:text-white transition-colors animate-pulse" />
                    </div>
                    <div>
                        <div className="text-xl font-black italic tracking-tighter text-transparent bg-clip-text bg-linear-to-r from-yellow-200 via-yellow-400 to-yellow-200 group-hover:text-white transition-colors uppercase font-orbitron drop-shadow-sm">
                            {t('premium_subscription')}
                        </div>
                        <div className="text-[10px] text-yellow-200/80 font-mono tracking-wider flex items-center gap-2">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 animate-ping" />
                            {t('view_premium')}
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
