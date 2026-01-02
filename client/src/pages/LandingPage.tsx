import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, ScanLine, Gamepad2, Trophy, Shield, Lock, Heart, ChevronDown } from "lucide-react";
import SEO from "@/components/SEO";

// ============================================
// Hero Section
// ============================================
const Hero = () => {
    const scrollToFeatures = () => {
        document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <section className="relative min-h-[100dvh] w-full flex flex-col items-center justify-center px-4 pt-[env(safe-area-inset-top)] pb-16 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            {/* Background - Lightweight CSS Grid */}
            <div
                className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                    backgroundSize: '32px 32px'
                }}
            />

            {/* Subtle glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 text-center max-w-lg mx-auto">
                {/* Badge */}
                <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-cyan-300 tracking-wide">
                    身の回りのバーコードがロボットに
                </div>

                {/* Title */}
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 text-white leading-tight">
                    バーコード
                    <br />
                    ジェネシス
                </h1>

                {/* Description */}
                <p className="text-base text-slate-300 mb-8 leading-relaxed max-w-sm mx-auto">
                    バーコードをスキャンすると、
                    <br className="sm:hidden" />
                    世界に一つだけのロボットが生まれます。
                    <br />
                    集めて、育てて、バトルで競おう。
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link href="/auth">
                        <Button
                            size="lg"
                            className="h-12 px-8 text-base rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-cyan-500/20"
                        >
                            無料で始める
                            <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    </Link>
                    <Button
                        variant="ghost"
                        size="lg"
                        onClick={scrollToFeatures}
                        className="h-12 px-6 text-base rounded-full text-slate-300 hover:text-white hover:bg-white/5 transition-all"
                    >
                        詳しく見る
                    </Button>
                </div>
            </div>

            {/* Scroll indicator */}
            <button
                onClick={scrollToFeatures}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-500 hover:text-slate-300 transition-colors animate-bounce"
                aria-label="下にスクロール"
            >
                <ChevronDown className="w-6 h-6" />
            </button>
        </section>
    );
};

// ============================================
// Feature Card Component
// ============================================
interface FeatureCardProps {
    icon: React.ElementType;
    title: string;
    description: string;
}

const FeatureCard = ({ icon: Icon, title, description }: FeatureCardProps) => (
    <div className="p-6 bg-white/[0.03] border border-white/10 rounded-2xl hover:border-cyan-500/30 hover:bg-white/[0.05] transition-all duration-300">
        <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4">
            <Icon className="w-6 h-6 text-cyan-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
    </div>
);

// ============================================
// Features Section
// ============================================
const Features = () => (
    <section id="features" className="py-20 px-4 bg-slate-950">
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">3つの楽しみ方</h2>
                <p className="text-slate-400">シンプルだけど奥深い、バーコードゲームの世界</p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
                <FeatureCard
                    icon={ScanLine}
                    title="スキャンで誕生"
                    description="お菓子、飲み物、本…身の回りのバーコードをスキャンすると、そのコードに応じたロボットが生まれます。"
                />
                <FeatureCard
                    icon={Gamepad2}
                    title="集めて育てる"
                    description="レアなロボットを集めたり、合成で強化したり。自分だけの最強チームを作りましょう。"
                />
                <FeatureCard
                    icon={Trophy}
                    title="バトルで競う"
                    description="育てたロボットでバトル。デイリーボスに挑んだり、ランキングを目指したり。"
                />
            </div>
        </div>
    </section>
);

// ============================================
// How To Play Section (3 Steps)
// ============================================
const HowToPlay = () => (
    <section className="py-20 px-4 bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">遊び方</h2>
                <p className="text-slate-400">3ステップで簡単スタート</p>
            </div>

            <div className="grid sm:grid-cols-3 gap-6">
                {[
                    { step: 1, title: "バーコードをスキャン", desc: "カメラでバーコードを読み取るだけ" },
                    { step: 2, title: "ロボットをカスタマイズ", desc: "育成・合成で自分好みに強化" },
                    { step: 3, title: "バトルで勝利", desc: "ボスに挑戦してランキング上位へ" },
                ].map(({ step, title, desc }) => (
                    <div key={step} className="text-center">
                        <div className="w-14 h-14 rounded-full bg-cyan-500/20 border-2 border-cyan-500/50 flex items-center justify-center mx-auto mb-4">
                            <span className="text-xl font-bold text-cyan-400">{step}</span>
                        </div>
                        <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
                        <p className="text-sm text-slate-400">{desc}</p>
                    </div>
                ))}
            </div>
        </div>
    </section>
);

// ============================================
// Parental Safety Section
// ============================================
const ParentalSafety = () => (
    <section className="py-20 px-4 bg-slate-900">
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">保護者の方へ</h2>
                <p className="text-slate-400">お子様にも安心してお使いいただけます</p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
                <div className="p-6 bg-white/[0.03] border border-white/10 rounded-2xl text-center">
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                        <Heart className="w-6 h-6 text-green-400" />
                    </div>
                    <h3 className="text-base font-semibold text-white mb-2">基本無料</h3>
                    <p className="text-sm text-slate-400">課金なしでも十分楽しめます。有料機能は任意です。</p>
                </div>
                <div className="p-6 bg-white/[0.03] border border-white/10 rounded-2xl text-center">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-6 h-6 text-blue-400" />
                    </div>
                    <h3 className="text-base font-semibold text-white mb-2">安全設計</h3>
                    <p className="text-sm text-slate-400">チャット機能なし。個人情報の入力も最小限です。</p>
                </div>
                <div className="p-6 bg-white/[0.03] border border-white/10 rounded-2xl text-center">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-6 h-6 text-purple-400" />
                    </div>
                    <h3 className="text-base font-semibold text-white mb-2">プライバシー保護</h3>
                    <p className="text-sm text-slate-400">カメラはバーコード読み取りのみに使用します。</p>
                </div>
            </div>
        </div>
    </section>
);

// ============================================
// Final CTA Section
// ============================================
const FinalCTA = () => (
    <section className="py-20 px-4 bg-gradient-to-b from-slate-900 to-slate-950 text-center">
        <div className="max-w-lg mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                さあ、始めよう
            </h2>
            <p className="text-slate-400 mb-8">
                アカウント作成は無料。すぐに遊び始められます。
            </p>
            <Link href="/auth">
                <Button
                    size="lg"
                    className="h-12 px-10 text-base rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-cyan-500/20"
                >
                    無料で始める
                    <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
            </Link>
        </div>
    </section>
);

// ============================================
// Footer
// ============================================
const Footer = () => (
    <footer className="py-12 px-4 bg-slate-950 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="text-center sm:text-left">
                    <div className="font-semibold text-white mb-1">バーコードジェネシス</div>
                    <div className="text-sm text-slate-500">© 2025 All rights reserved.</div>
                </div>

                <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-400">
                    <Link href="/terms" className="hover:text-white transition-colors">利用規約</Link>
                    <Link href="/privacy" className="hover:text-white transition-colors">プライバシー</Link>
                    <Link href="/law" className="hover:text-white transition-colors">特定商取引法</Link>
                </div>
            </div>
        </div>
    </footer>
);

// ============================================
// Main Component
// ============================================
export default function LandingPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white selection:bg-cyan-500 selection:text-slate-900">
            <SEO
                title="バーコードジェネシス | 身の回りのバーコードがロボットに"
                description="バーコードをスキャンして世界に一つだけのロボットを生成。集めて、育てて、バトルで競おう。基本無料で遊べます。"
            />
            <Hero />
            <Features />
            <HowToPlay />
            <ParentalSafety />
            <FinalCTA />
            <Footer />
        </div>
    );
}
