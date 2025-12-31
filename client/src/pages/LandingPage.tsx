import { useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { ArrowRight, ChevronDown, Cpu } from "lucide-react";
import { BattleIcon, ScanIcon, WorkshopIcon } from "@/components/icons/AppIcons";

// --- Components ---

const Hero = () => {
    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 500], [0, 200]);
    const y2 = useTransform(scrollY, [0, 500], [0, -150]);
    const opacity = useTransform(scrollY, [0, 300], [1, 0]);

    const scrollToFeatures = () => {
        const featuresSection = document.getElementById('features');
        if (featuresSection) {
            featuresSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <section className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#111b29] via-[#0b1118] to-[#070a10]">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 pointer-events-none"></div>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

            {/* Floating Elements */}
            <motion.div
                style={{ y: y1, opacity: 0.5 }}
                className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/30 rounded-full blur-[100px]"
            />
            <motion.div
                style={{ y: y2, opacity: 0.5 }}
                className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px]"
            />

            <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <div className="inline-block mb-4 px-3 py-1 border border-border/60 rounded-full bg-panel/60 backdrop-blur-sm text-xs tracking-[0.14em] text-accent font-orbitron">
                        次世代バーコードバトラー
                    </div>
                    <h1 className="text-5xl md:text-7xl font-semibold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/70 drop-shadow-[0_0_12px_rgba(255,255,255,0.25)] font-orbitron">
                        BARCODE<br />GENESIS
                    </h1>
                    <p className="text-lg md:text-xl text-muted mb-8 max-w-2xl mx-auto leading-relaxed">
                        現実をスキャンせよ。機械の軍団を築け。<br />
                        すべてのバーコードには、未知なる力が眠っている。
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/auth">
                            <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-accent text-bg hover:bg-accent/90 transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(62,208,240,0.3)]">
                                ゲームスタート <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </Link>
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={scrollToFeatures}
                            className="h-14 px-8 text-lg rounded-full border-border/70 text-text hover:bg-panel/60 hover:border-border transition-all"
                        >
                            詳しく見る
                        </Button>
                    </div>
                </motion.div>
            </div>

            <motion.div
                style={{ opacity }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-muted"
            >
                <ChevronDown className="w-6 h-6" />
            </motion.div>
        </section>
    );
};

const FeatureCard = ({ icon: Icon, title, desc, delay }: any) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 50 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay }}
            whileHover={{ y: -10 }}
            className="group relative p-8 bg-panel/70 border border-border/60 rounded-2xl hover:border-accent/50 transition-all duration-300"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-accent2/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
                <div className="w-12 h-12 bg-panel/70 rounded-xl flex items-center justify-center mb-6 group-hover:bg-accent/15 group-hover:text-accent transition-colors">
                    <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{title}</h3>
                <p className="text-muted leading-relaxed text-sm">
                    {desc}
                </p>
            </div>
        </motion.div>
    );
};

const Features = () => {
    return (
        <section id="features" className="py-24 bg-bg relative">
            <div className="container max-w-6xl mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-semibold mb-6 font-orbitron">ゲームシステム</h2>
                    <p className="text-muted max-w-2xl mx-auto">
                        現実とデジタルの融合を体験せよ。
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    <FeatureCard
                        icon={ScanIcon}
                        title="スキャン＆生成"
                        desc="身の回りのバーコードをカメラでスキャンして、ユニークなロボットを生成。商品ごとに異なるメカ戦士が誕生します。"
                        delay={0}
                    />
                    <FeatureCard
                        icon={BattleIcon}
                        title="戦略的バトル"
                        desc="戦略的なオートバトルシステム。アイテムを装備し、スキルをカスタマイズして、ライバルたちに挑め。"
                        delay={0.2}
                    />
                    <FeatureCard
                        icon={WorkshopIcon}
                        title="進化と合成"
                        desc="ロボット同士を融合させて強化。スキルやステータスを引き継ぎ、究極の機体を組み上げよう。"
                        delay={0.4}
                    />
                </div>
            </div>
        </section>
    );
};

const World = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });

    return (
        <section className="py-24 bg-[#0a0f16] relative overflow-hidden">
            {/* Decorative lines */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

            <div className="container max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center gap-16">
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, x: -50 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.8 }}
                    className="flex-1 space-y-8"
                >
                    <div className="inline-block px-3 py-1 text-xs font-mono border border-accent2/50 text-accent2 rounded font-orbitron">
                        ストーリー
                    </div>
                    <h2 className="text-4xl md:text-6xl font-semibold leading-tight font-orbitron">
                        世界は<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent2 to-accent">君の武器庫だ</span>
                    </h2>
                    <p className="text-muted text-lg leading-relaxed">
                        204X年、デジタルデータと実体物質の境界は消滅した。
                        バーコードは機械生命体が生息する「ジェネシスレイヤー」への入り口となった。
                        <br /><br />
                        あなたは「スキャナー」として世界を探索し、隠されたデータを解読。デジタル覇権をかけた戦いに身を投じる。
                    </p>
                    <Link href="/auth">
                        <Button className="rounded-full px-8 bg-accent2 hover:bg-accent2/90 text-bg border-none">
                            ジェネシスレイヤーへ
                        </Button>
                    </Link>
                </motion.div>

                <div className="flex-1 relative">
                    <div className="relative w-full aspect-square bg-gradient-to-br from-accent2/15 to-accent/15 rounded-full border border-white/5 animate-pulse-slow flex items-center justify-center p-12">
                        <div className="absolute inset-0 border border-white/10 rounded-full animate-[spin_10s_linear_infinite]"></div>
                        <div className="absolute inset-4 border border-white/5 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
                        <Cpu className="w-32 h-32 text-white/20" />
                    </div>
                </div>
            </div>
        </section>
    );
};

const Footer = () => {
    return (
        <footer className="bg-panel/80 border-t border-border/60 py-12">
            <div className="container max-w-6xl mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="text-center md:text-left">
                        <h4 className="font-semibold text-xl mb-2">BARCODE GENESIS</h4>
                        <p className="text-muted text-sm">© 2025 UNSEVED:LAB. All rights reserved.</p>
                    </div>

                    <div className="flex gap-6 text-sm text-muted">
                        <Link href="/terms" className="hover:text-white transition-colors">利用規約</Link>
                        <Link href="/privacy" className="hover:text-white transition-colors">プライバシーポリシー</Link>
                        <Link href="/law" className="hover:text-white transition-colors">特定商取引法に基づく表記</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-bg text-text selection:bg-accent selection:text-bg font-sans">
            <Hero />
            <Features />
            <World />
            <Footer />
        </div>
    );
}
