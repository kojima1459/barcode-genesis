import { useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { ArrowRight, Scan, Sword, Cpu, Zap, Box, ShieldCheck, ChevronDown } from "lucide-react";

// --- Components ---

const Hero = () => {
    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 500], [0, 200]);
    const y2 = useTransform(scrollY, [0, 500], [0, -150]);
    const opacity = useTransform(scrollY, [0, 300], [1, 0]);

    return (
        <section className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#000] to-black">
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
                    <div className="inline-block mb-4 px-3 py-1 border border-white/20 rounded-full bg-white/5 backdrop-blur-sm text-xs tracking-widest uppercase text-cyan-400 font-orbitron">
                        Next Gen Barcode Battler
                    </div>
                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/50 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] font-orbitron">
                        BARCODE<br />GENESIS
                    </h1>
                    <p className="text-lg md:text-xl text-slate-400 mb-8 max-w-2xl mx-auto leading-relaxed">
                        Scan reality. Forge your mechanical army. <br />
                        Every barcode holds a secret power waiting to be unleashed.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/auth">
                            <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-white text-black hover:bg-slate-200 transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                                Start Game <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </Link>
                        <Link href="#features">
                            <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full border-white/20 text-white hover:bg-white/10 hover:border-white/50 transition-all">
                                Learn More
                            </Button>
                        </Link>
                    </div>
                </motion.div>
            </div>

            <motion.div
                style={{ opacity }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-slate-500"
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
            className="group relative p-8 bg-black border border-white/10 rounded-2xl hover:border-cyan-500/50 transition-all duration-300"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6 group-hover:bg-cyan-500/20 group-hover:text-cyan-400 transition-colors">
                    <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">{title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">
                    {desc}
                </p>
            </div>
        </motion.div>
    );
};

const Features = () => {
    return (
        <section id="features" className="py-32 bg-black relative">
            <div className="container max-w-6xl mx-auto px-4">
                <div className="text-center mb-20">
                    <h2 className="text-3xl md:text-5xl font-bold mb-6 font-orbitron">System Features</h2>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        Experience the fusion of physical reality and digital warfare.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    <FeatureCard
                        icon={Scan}
                        title="Scan & Generate"
                        desc="Point your camera at any barcode in the real world to generate a unique robot. Every product creates a different mechanical warrior."
                        delay={0}
                    />
                    <FeatureCard
                        icon={Sword}
                        title="Tactical Battle"
                        desc="Auto-battle system with strategic depth. Equip items, customize skills, and challenge rivals in the arena."
                        delay={0.2}
                    />
                    <FeatureCard
                        icon={Zap}
                        title="Evolution & Synthesis"
                        desc="Merge robots to create stronger variants. Inherit skills and stats to build the ultimate combat machine."
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
        <section className="py-32 bg-[#050505] relative overflow-hidden">
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
                    <div className="inline-block px-3 py-1 text-xs font-mono border border-purple-500/50 text-purple-400 rounded font-orbitron">
                        STORY MODE
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black leading-tight font-orbitron">
                        THE WORLD IS<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">YOUR ARMORY</span>
                    </h2>
                    <p className="text-slate-400 text-lg leading-relaxed">
                        In 204X, the boundary between digital data and physical matter dissolved.
                        Barcodes became gateways to the "Genesis Layer", where mechanical lifeforms reside.
                        <br /><br />
                        As a "Scanner", your mission is to explore the world, decode the hidden data, and command your legion in the struggle for digital supremacy.
                    </p>
                    <Link href="/auth">
                        <Button className="rounded-full px-8 bg-purple-600 hover:bg-purple-700 text-white border-none">
                            Enter Genesis Layer
                        </Button>
                    </Link>
                </motion.div>

                <div className="flex-1 relative">
                    <div className="relative w-full aspect-square bg-gradient-to-br from-purple-900/20 to-cyan-900/20 rounded-full border border-white/5 animate-pulse-slow flex items-center justify-center p-12">
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
        <footer className="bg-black border-t border-white/10 py-12">
            <div className="container max-w-6xl mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="text-center md:text-left">
                        <h4 className="font-bold text-xl mb-2">BARCODE GENESIS</h4>
                        <p className="text-slate-500 text-sm">© 2025 UNSEVED:LAB. All rights reserved.</p>
                    </div>

                    <div className="flex gap-6 text-sm text-slate-400">
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
        <div className="min-h-screen bg-black text-white selection:bg-cyan-500 selection:text-black font-sans">
            <Hero />
            <Features />
            <World />
            <Footer />
        </div>
    );
}
