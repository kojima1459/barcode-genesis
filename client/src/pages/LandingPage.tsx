import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
    ArrowRight,
    ScanLine,
    Zap,
    Trophy,
    ShieldCheck,
    Lock,
    Wallet,
    ChevronRight,
    QrCode,
    Cpu,
    Target
} from "lucide-react";
import SEO from "@/components/SEO";

// ============================================
// Styles & Helpers
// ============================================
// Mech-style clip-path for corners
const mechClip = "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)";
const mechBtnClip = "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)";

const SectionTitle = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div className="text-center mb-16 px-4 relative z-10">
        <div className="inline-block relative">
            {/* Decorative brackets */}
            <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-3 h-8 border-l-2 border-t-2 border-b-2 border-cyan-500/30 rounded-l-sm" />
            <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-3 h-8 border-r-2 border-t-2 border-b-2 border-cyan-500/30 rounded-r-sm" />

            <h2 className="text-3xl font-bold text-white mb-4 tracking-tight font-display relative z-10 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                {title}
            </h2>
        </div>
        <p className="text-sm text-slate-400 font-body leading-relaxed max-w-md mx-auto tracking-wide">
            {subtitle}
        </p>
    </div>
);

// ============================================
// Hero Section
// ============================================
const Hero = () => {
    return (
        <section className="relative min-h-[100dvh] w-full flex flex-col items-center justify-center px-6 pt-[env(safe-area-inset-top)] pb-20 overflow-hidden bg-slate-950">
            {/* Background - Advanced Grid / Noise */}
            <div className="absolute inset-0 bg-slate-950">
                <div
                    className="absolute inset-0 opacity-[0.08]"
                    style={{
                        backgroundImage: `
                            linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)
                        `,
                        backgroundSize: '40px 40px',
                        maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 90%)'
                    }}
                />

                {/* Horizontal Scanlines */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[1] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20" />
            </div>

            {/* Glowing Orbs */}
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse-slow" />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 text-center w-full max-w-md mx-auto">
                {/* Badge - Mech Style */}
                <div
                    className="inline-flex items-center gap-3 mb-8 px-5 py-2 bg-cyan-950/40 border border-cyan-500/30 backdrop-blur-md relative overflow-hidden group hover:border-cyan-400/50 transition-colors"
                    style={{ clipPath: "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)" }}
                >
                    <div className="absolute inset-0 bg-cyan-500/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
                    </span>
                    <span className="text-[10px] font-bold text-cyan-300 tracking-[0.15em] font-orbitron uppercase">
                        System Online: v1.0
                    </span>
                </div>

                {/* Title */}
                <h1 className="relative text-[3rem] leading-[0.9] font-black tracking-tighter mb-6 text-white font-display uppercase italic">
                    <span className="block text-slate-500 text-sm font-mono tracking-[0.5em] mb-2 opacity-70 not-italic">PROJECT</span>
                    BARCODE
                    <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-200 to-blue-500 drop-shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                        GENESIS
                    </span>
                </h1>

                {/* Description */}
                <p className="text-base text-slate-300 mb-12 leading-relaxed font-body border-l-2 border-cyan-500/30 pl-4 text-left max-w-xs mx-auto">
                    あなたの日常が、戦場になる。<br />
                    バーコードをスキャンして、<br />
                    最強の相棒を見つけ出せ。
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col gap-4 w-full px-2" style={{ filter: 'drop-shadow(0 0 20px rgba(6, 182, 212, 0.15))' }}>
                    <Link href="/auth">
                        <Button
                            size="lg"
                            className="w-full h-14 text-base bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all active:scale-[0.98] group relative overflow-hidden"
                            style={{ clipPath: mechBtnClip }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                            <QrCode className="mr-2 w-5 h-5 opacity-80" />
                            無料でスキャン開始
                            <div className="absolute bottom-0 right-0 w-3 h-3 border-l border-t border-slate-900/30 opacity-50" />
                        </Button>
                    </Link>
                    <Button
                        variant="ghost"
                        size="lg"
                        onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                        className="w-full h-12 text-sm text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/30 font-medium border border-white/5 hover:border-cyan-500/30 transition-all"
                        style={{ clipPath: mechBtnClip }}
                    >
                        詳しく見る
                        <ChevronRight className="ml-1 w-4 h-4 opacity-70" />
                    </Button>
                </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50 animate-bounce">
                <span className="text-[10px] font-mono tracking-widest text-cyan-500/70">SCROLL</span>
                <ChevronRight className="w-4 h-4 rotate-90 text-cyan-500" />
            </div>
        </section>
    );
};

// ============================================
// Features Section
// ============================================
const Features = () => (
    <section id="features" className="py-24 px-4 bg-slate-950 border-t border-white/5 relative">
        <div className="max-w-lg mx-auto">
            <SectionTitle
                title="SYSTEM FEATURES"
                subtitle="シンプルで奥深い。3つのステップで広がる世界。"
            />

            <div className="space-y-5">
                {[
                    {
                        icon: ScanLine,
                        title: "スキャン",
                        desc: "商品のバーコードが、あなただけのロボットに変換されます。",
                        color: "text-cyan-400",
                        bg: "bg-cyan-500/10",
                        border: "border-cyan-500/20"
                    },
                    {
                        icon: Zap,
                        title: "育成・合成",
                        desc: "手に入れたロボットを強化。パーツを組み合わせて最強を目指そう。",
                        color: "text-yellow-400",
                        bg: "bg-yellow-500/10",
                        border: "border-yellow-500/20"
                    },
                    {
                        icon: Trophy,
                        title: "ランキングバトル",
                        desc: "育てた機体でライバルたちと競争。デイリー報酬を勝ち取れ。",
                        color: "text-purple-400",
                        bg: "bg-purple-500/10",
                        border: "border-purple-500/20"
                    }
                ].map((item, i) => (
                    <div key={i} className="group relative">
                        {/* Connecting Line Effect */}
                        {i !== 2 && <div className="absolute left-[29px] top-16 bottom-[-20px] w-[2px] bg-white/5 z-0" />}

                        <div
                            className={`relative z-10 flex items-start gap-5 p-6 bg-slate-900/50 border ${item.border} hover:bg-slate-800/80 transition-all duration-300 group-hover:translate-x-1`}
                            style={{ clipPath: mechClip }}
                        >
                            {/* Decorative Corner */}
                            <div className="absolute top-0 right-0 w-4 h-4 border-l border-b border-white/5 group-hover:border-white/20 transition-colors" />

                            <div className={`mt-0.5 w-12 h-12 shrink-0 rounded-none ${item.bg} flex items-center justify-center border border-white/5`} style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 10px 100%, 0 calc(100% - 10px))" }}>
                                <item.icon className={`w-6 h-6 ${item.color}`} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white mb-2 font-display tracking-wide group-hover:text-cyan-300 transition-colors uppercase italic">{item.title}</h3>
                                <p className="text-sm text-slate-400 leading-relaxed font-body">{item.desc}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

// ============================================
// How To Play Section
// ============================================
const HowToPlay = () => (
    <section className="py-24 px-4 bg-slate-900 relative overflow-hidden">
        {/* Background Details */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

        <div className="max-w-md mx-auto relative z-10">
            <SectionTitle
                title="INITIALIZE"
                subtitle="始めるのに必要なのはスマホと少しの好奇心だけ。"
            />

            <div className="relative space-y-10">
                {/* Connecting Data Line */}
                <div className="absolute left-[24px] top-8 bottom-8 w-[2px] bg-slate-800 pointer-events-none">
                    <div className="w-full h-full bg-gradient-to-b from-cyan-500/20 to-blue-500/20" />
                </div>

                {[
                    { step: "01", title: "アカウント登録", desc: "メールアドレスかGoogleアカウントで、30秒で完了。" },
                    { step: "02", title: "最初のスキャン", desc: "近くにあるお菓子や飲み物のバーコードを読み取ってみよう。" },
                    { step: "03", title: "デッキ編成", desc: "生成ロボットを編成して、バトルへ出撃！" },
                ].map((item, i) => (
                    <div key={i} className="relative flex items-start gap-6 group">
                        <div className="relative z-10 flex items-center justify-center w-12 h-12 shrink-0 bg-slate-950 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-transform group-hover:scale-110 duration-300"
                            style={{ clipPath: "polygon(30% 0, 100% 0, 100% 70%, 70% 100%, 0 100%, 0 30%)" }}>
                            <span className="text-lg font-bold text-cyan-400 font-mono tracking-tighter">{item.step}</span>
                        </div>
                        <div className="pt-2">
                            <h3 className="text-base font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors">{item.title}</h3>
                            <p className="text-sm text-slate-400 font-body leading-relaxed">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-16 text-center">
                <Link href="/auth">
                    <Button
                        size="lg"
                        className="w-full h-14 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 hover:border-cyan-400/80 transition-all font-bold tracking-widest relative group overflow-hidden shadow-lg"
                        style={{ clipPath: mechBtnClip }}
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            MISSION START
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                        {/* Button Scanline */}
                        <div className="absolute top-0 left-0 w-[5px] h-full bg-cyan-400/20 blur-[2px] animate-[scan_2s_linear_infinite]" />
                    </Button>
                </Link>
            </div>
        </div>
    </section>
);

// ============================================
// Trust & Safety Section
// ============================================
const Trust = () => (
    <section className="py-24 px-4 bg-slate-950 border-t border-white/5 relative">
        <div className="max-w-lg mx-auto">
            <div className="relative p-1">
                {/* Tech Border Container */}
                <div className="absolute inset-0 border border-white/10" style={{ clipPath: mechClip }} />
                <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-cyan-500/50" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-cyan-500/50" />

                <div
                    className="p-8 bg-slate-900/50 backdrop-blur-sm text-center relative z-10"
                    style={{ clipPath: mechClip }}
                >
                    <ShieldCheck className="w-12 h-12 text-cyan-500 mx-auto mb-6 opacity-80" />
                    <h2 className="text-xl font-bold text-white mb-8 font-display tracking-widest uppercase">Security Protocol</h2>

                    <div className="grid gap-4 sm:grid-cols-2 text-left">
                        <div className="p-4 bg-black/40 border-l-2 border-cyan-500/30 hover:border-cyan-500 transition-colors">
                            <div className="flex items-center gap-2 mb-2 text-cyan-400 font-bold text-sm font-mono uppercase">
                                <Wallet className="w-4 h-4" />
                                <span>Free to Play</span>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                ガチャ等の射幸心を煽る高額課金はありません。無料でも最後まで遊べます。
                            </p>
                        </div>
                        <div className="p-4 bg-black/40 border-l-2 border-cyan-500/30 hover:border-cyan-500 transition-colors">
                            <div className="flex items-center gap-2 mb-2 text-cyan-400 font-bold text-sm font-mono uppercase">
                                <Lock className="w-4 h-4" />
                                <span>Privacy Safe</span>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                カメラはバーコード認識のみに使用。画像は保存されません。
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
);

// ============================================
// Footer
// ============================================
const Footer = () => (
    <footer className="py-12 px-6 bg-slate-950 border-t border-white/5 text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />

        <div className="max-w-md mx-auto">
            <div className="mb-8">
                <div className="flex items-center justify-center gap-2 mb-2 opacity-50">
                    <Cpu className="w-4 h-4 text-cyan-500" />
                    <div className="h-[2px] w-8 bg-cyan-900" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-widest font-display mb-1">BARCODE GENESIS</h3>
                <p className="text-[10px] text-slate-500 font-mono tracking-widest">SYSTEM VER 1.1.0</p>
            </div>

            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-8 text-[11px] font-medium text-slate-500 font-mono uppercase">
                <Link href="/terms" className="hover:text-cyan-400 transition-colors border-b border-transparent hover:border-cyan-400 pb-0.5">Rules</Link>
                <Link href="/privacy" className="hover:text-cyan-400 transition-colors border-b border-transparent hover:border-cyan-400 pb-0.5">Privacy</Link>
                <Link href="/law" className="hover:text-cyan-400 transition-colors border-b border-transparent hover:border-cyan-400 pb-0.5">Legal</Link>
            </div>

            <div className="text-[10px] text-slate-600 font-body">
                &copy; 2025 Kojima Production. All rights reserved.
            </div>
        </div>
    </footer>
);

// ============================================
// Main Component
// ============================================
export default function LandingPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-cyan-500/30">
            <SEO
                title="BARCODE GENESIS | そのバーコードに、命が宿る"
                description="身の回りのバーコードから世界に一つだけのロボットを生成。集めて、育てて、バトルで競う。基本プレイ無料の次世代バーコードバトラー。"
            />
            <Hero />
            <Features />
            <HowToPlay />
            <Trust />
            <Footer />
        </div>
    );
}
