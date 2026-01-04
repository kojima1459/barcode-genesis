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
    QrCode
} from "lucide-react";
import SEO from "@/components/SEO";

// ============================================
// Shared Components
// ============================================
const SectionTitle = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div className="text-center mb-10 px-4">
        <h2 className="text-2xl font-bold text-white mb-3 tracking-tight font-display">{title}</h2>
        <p className="text-sm text-slate-400 font-body leading-relaxed max-w-md mx-auto">{subtitle}</p>
    </div>
);

// ============================================
// Hero Section
// ============================================
const Hero = () => {
    return (
        <section className="relative min-h-[100dvh] w-full flex flex-col items-center justify-center px-6 pt-[env(safe-area-inset-top)] pb-20 overflow-hidden bg-slate-950">
            {/* Background - Lightweight Grid */}
            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                    maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)'
                }}
            />

            {/* Subtle Aurora Glow */}
            <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="relative z-10 text-center w-full max-w-md mx-auto">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full bg-cyan-950/30 border border-cyan-800/30 backdrop-blur-sm">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                    </span>
                    <span className="text-xs font-medium text-cyan-300 tracking-wide font-body">NEW GENERATION BARCODE BATTLES</span>
                </div>

                {/* Title */}
                <h1 className="text-[2.75rem] leading-[1.1] font-bold tracking-tighter mb-6 text-white font-display">
                    BARCODE
                    <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                        GENESIS
                    </span>
                </h1>

                {/* Description */}
                <p className="text-base text-slate-300 mb-10 leading-relaxed font-body">
                    あなたの日常が、戦場になる。<br />
                    バーコードをスキャンして、<br />
                    最強の相棒を見つけ出せ。
                </p>

                {/* CTA Buttons - Mobile Optimized Size */}
                <div className="flex flex-col gap-4 w-full px-2">
                    <Link href="/auth">
                        <Button
                            size="lg"
                            className="w-full h-14 text-base rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-lg shadow-cyan-500/20 active:scale-[0.98]"
                        >
                            <QrCode className="mr-2 w-5 h-5 opacity-80" />
                            無料でスキャン開始
                        </Button>
                    </Link>
                    <Button
                        variant="ghost"
                        size="lg"
                        onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                        className="w-full h-12 text-sm rounded-xl text-slate-400 hover:text-white hover:bg-white/5 font-medium"
                    >
                        詳しく見る
                        <ChevronRight className="ml-1 w-4 h-4 opacity-70" />
                    </Button>
                </div>
            </div>
        </section>
    );
};

// ============================================
// Features Section
// ============================================
const Features = () => (
    <section id="features" className="py-24 px-4 bg-slate-950 border-t border-white/5">
        <div className="max-w-lg mx-auto">
            <SectionTitle
                title="GAME FEATURES"
                subtitle="シンプルかつ奥深い。3つのステップで広がる世界。"
            />

            <div className="space-y-4">
                {[
                    {
                        icon: ScanLine,
                        title: "スキャン",
                        desc: "商品のバーコードが、あなただけのロボットに変換されます。",
                        color: "text-cyan-400",
                        bg: "bg-cyan-500/10"
                    },
                    {
                        icon: Zap,
                        title: "育成・合成",
                        desc: "手に入れたロボットを強化。パーツを組み合わせて最強を目指そう。",
                        color: "text-yellow-400",
                        bg: "bg-yellow-500/10"
                    },
                    {
                        icon: Trophy,
                        title: "ランキングバトル",
                        desc: "育てた機体でライバルたちと競争。デイリー報酬を勝ち取れ。",
                        color: "text-purple-400",
                        bg: "bg-purple-500/10"
                    }
                ].map((item, i) => (
                    <div key={i} className="flex items-start gap-5 p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-colors">
                        <div className={`mt-1 w-10 h-10 shrink-0 rounded-lg ${item.bg} flex items-center justify-center`}>
                            <item.icon className={`w-5 h-5 ${item.color}`} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white mb-1.5 font-display">{item.title}</h3>
                            <p className="text-sm text-slate-400 leading-relaxed font-body">{item.desc}</p>
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
    <section className="py-24 px-4 bg-slate-900 border-t border-white/5">
        <div className="max-w-md mx-auto">
            <SectionTitle
                title="HOW TO START"
                subtitle="始めるのに必要なのは、スマホと少しの好奇心だけ。"
            />

            <div className="relative space-y-8">
                {/* Connecting Line */}
                <div className="absolute left-[27px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-cyan-500/50 to-transparent pointer-events-none" />

                {[
                    { step: "01", title: "アカウント登録", desc: "メールアドレスかGoogleアカウントで、30秒で完了。" },
                    { step: "02", title: "最初のスキャン", desc: "近くにあるお菓子や飲み物のバーコードを読み取ってみよう。" },
                    { step: "03", title: "デッキ編成", desc: "生まれたロボットを編成して、バトルへ出撃！" },
                ].map((item, i) => (
                    <div key={i} className="relative flex items-start gap-6">
                        <div className="relative z-10 flex items-center justify-center w-14 h-14 shrink-0 rounded-xl bg-slate-800 border-2 border-slate-700 shadow-xl">
                            <span className="text-lg font-bold text-cyan-400 font-display">{item.step}</span>
                        </div>
                        <div className="pt-2">
                            <h3 className="text-base font-bold text-white mb-1">{item.title}</h3>
                            <p className="text-sm text-slate-400 font-body leading-relaxed">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-12 text-center">
                <Link href="/auth">
                    <Button size="lg" className="w-full h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-900/50">
                        今すぐ始める
                        <ArrowRight className="ml-2 w-4 h-4" />
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
    <section className="py-20 px-4 bg-slate-950 border-t border-white/5">
        <div className="max-w-lg mx-auto">
            <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-white/5 text-center">
                <ShieldCheck className="w-12 h-12 text-cyan-500 mx-auto mb-6 opacity-80" />
                <h2 className="text-xl font-bold text-white mb-6 font-display">安心・安全への取り組み</h2>

                <div className="grid gap-4 sm:grid-cols-2 text-left">
                    <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                        <div className="flex items-center gap-2 mb-2 text-cyan-400 font-bold text-sm">
                            <Wallet className="w-4 h-4" />
                            <span>基本無料</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            ガチャ等の射幸心を煽る高額課金はありません。無料でも最後まで遊べます。
                        </p>
                    </div>
                    <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                        <div className="flex items-center gap-2 mb-2 text-cyan-400 font-bold text-sm">
                            <Lock className="w-4 h-4" />
                            <span>プライバシー</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            カメラはバーコード認識のみに使用。画像は保存されません。
                        </p>
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
    <footer className="py-12 px-6 bg-slate-950 border-t border-white/5 text-center">
        <div className="max-w-md mx-auto">
            <div className="mb-8">
                <h3 className="text-lg font-bold text-white tracking-tight font-display mb-1">BARCODE GENESIS</h3>
                <p className="text-xs text-slate-500">Since 2025</p>
            </div>

            <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-8 text-xs font-medium text-slate-400">
                <Link href="/terms" className="hover:text-cyan-400 transition-colors">利用規約</Link>
                <Link href="/privacy" className="hover:text-cyan-400 transition-colors">プライバシーポリシー</Link>
                <Link href="/law" className="hover:text-cyan-400 transition-colors">特定商取引法に基づく表記</Link>
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
