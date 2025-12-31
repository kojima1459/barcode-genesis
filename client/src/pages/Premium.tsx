import { useState, useEffect } from "react";
import { Link } from "wouter";
import { httpsCallable } from "firebase/functions";
import { ArrowLeft, Loader2, CreditCard, Crown, Coins, Sparkles, Zap, Shield, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { functions } from "@/lib/firebase";
import { toast } from "sonner";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Interactive } from "@/components/ui/interactive";
import SEO from "@/components/SEO";

const CREDIT_PACKS = [
    { id: "credits_100", credits: 100, price: 120, popular: false },
    { id: "credits_500", credits: 500, price: 500, popular: true },
    { id: "credits_1200", credits: 1200, price: 980, popular: false },
];

export default function Premium() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [loadingPackId, setLoadingPackId] = useState<string | null>(null);
    const [loadingSubscription, setLoadingSubscription] = useState(false);
    const [loadingPortal, setLoadingPortal] = useState(false);
    const [isPremium, setIsPremium] = useState(false);

    // ユーザー情報の監視（プレミアム状態の確認）
    useEffect(() => {
        if (!user) return;
        const unsub = onSnapshot(doc(db, "users", user.uid), (doc) => {
            const data = doc.data();
            setIsPremium(!!data?.isPremium);
        });
        return () => unsub();
    }, [user]);

    const handleBuyCredits = async (packId: string) => {
        if (!user) {
            toast.error("ログインが必要です");
            return;
        }

        setLoadingPackId(packId);

        try {
            const createCheckoutSession = httpsCallable(functions, "createCheckoutSession");
            const result = await createCheckoutSession({
                packId,
                successUrl: `${window.location.origin}/shop?success=true`,
                cancelUrl: `${window.location.origin}/premium?canceled=true`,
            });

            const data = result.data as { url?: string };
            if (data.url) {
                window.location.href = data.url;
            } else {
                toast.error("決済ページの作成に失敗しました");
            }
        } catch (error) {
            console.error("Checkout error:", error);
            toast.error("エラーが発生しました");
        } finally {
            setLoadingPackId(null);
        }
    };

    const handleSubscribe = async () => {
        if (!user) {
            toast.error("ログインが必要です");
            return;
        }

        setLoadingSubscription(true);

        try {
            const createSubscriptionSession = httpsCallable(functions, "createSubscriptionSession");
            const result = await createSubscriptionSession({
                successUrl: `${window.location.origin}/?premium=activated`,
                cancelUrl: `${window.location.origin}/premium?canceled=true`,
            });

            const data = result.data as { url?: string };
            if (data.url) {
                window.location.href = data.url;
            } else {
                toast.error("決済ページの作成に失敗しました");
            }
        } catch (error) {
            console.error("Subscription error:", error);
            toast.error("エラーが発生しました");
        } finally {
            setLoadingSubscription(false);
        }
        setLoadingSubscription(false);
    };

    const handlePortal = async () => {
        if (!user) return;
        setLoadingPortal(true);
        try {
            const createPortalSession = httpsCallable(functions, "createPortalSession");
            const result = await createPortalSession({
                returnUrl: window.location.href,
            });
            const data = result.data as { url?: string };
            if (data.url) {
                window.location.href = data.url;
            } else {
                toast.error("ポータルへの遷移に失敗しました");
            }
        } catch (error) {
            console.error("Portal error:", error);
            toast.error("エラーが発生しました");
        } finally {
            setLoadingPortal(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg pb-32 text-text">
            <SEO title={t('premium')} description="Upgrade your base system." />

            {/* Header / Hero */}
            <div className="relative pt-6 pb-8 px-4 border-b border-border/40 bg-black/20">
                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05] pointer-events-none" />
                <div className="max-w-4xl mx-auto">
                    <Link href="/">
                        <Button variant="ghost" size="sm" className="mb-4 text-muted-foreground hover:text-primary pl-0">
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            {t('back')}
                        </Button>
                    </Link>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-500">
                            <Crown className="w-6 h-6" />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-orbitron font-bold tracking-wide text-white">
                            {t('system_upgrade')}
                        </h1>
                    </div>
                    <p className="text-muted-foreground text-sm md:text-base max-w-lg">
                        {t('unlock_full_capability')}
                    </p>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-4 py-8 space-y-12">

                {/* Benefits Grid */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <BenefitCard
                        icon={Zap}
                        color="text-neon-cyan"
                        title={t('limit_break')}
                        desc={t('benefit_scan_desc')}
                    />
                    <BenefitCard
                        icon={Shield}
                        color="text-neon-purple"
                        title={t('ad_block')}
                        desc={t('benefit_ad_desc')}
                    />
                    <BenefitCard
                        icon={Coins}
                        color="text-yellow-400"
                        title={t('efficiency')}
                        desc={t('benefit_efficiency_desc')}
                    />
                    <BenefitCard
                        icon={Sparkles}
                        color="text-neon-pink"
                        title={t('visuals')}
                        desc={t('benefit_visual_desc')}
                    />
                </section>

                {/* Free vs Premium Comparison */}
                <section className="glass-panel rounded-xl overflow-hidden border-white/10">
                    <div className="p-4 border-b border-white/10 bg-white/5 font-orbitron font-bold text-center">
                        ACCESS LEVEL COMPARISON
                    </div>
                    <div className="p-4 space-y-4 text-sm">
                        <CompareRow label="Scanning" free="5 / day" premium="100 / day" highlight />
                        <CompareRow label="Ads" free="Yes" premium="None" />
                        <CompareRow label="Login Bonus" free="Standard" premium="x2" />
                        <CompareRow label="Battle XP" free="100%" premium="150%" />
                    </div>
                </section>

                {/* Resource Supply (Credits) */}
                <section className="pb-8">
                    <h2 className="text-xl font-orbitron font-bold mb-4 flex items-center gap-2 text-muted-foreground">
                        <Coins className="h-5 w-5" />
                        {t('resource_supply')}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {CREDIT_PACKS.map((pack) => (
                            <Interactive
                                key={pack.id}
                                className={`rounded-lg border p-4 bg-black/40 flex flex-col items-center text-center transition-colors ${pack.popular ? 'border-neon-cyan/50 bg-neon-cyan/5' : 'border-white/10 hover:border-white/20'}`}
                                onClick={() => handleBuyCredits(pack.id)}
                            >
                                <div className="text-xl font-bold mb-1">{pack.credits} Cr</div>
                                <div className="text-sm text-muted-foreground mb-3">¥{pack.price.toLocaleString()}</div>
                                <Button size="sm" variant={pack.popular ? "default" : "secondary"} className="w-full h-8 text-xs" disabled={loadingPackId === pack.id}>
                                    {loadingPackId === pack.id && <Loader2 className="h-3 w-3 animate-spin" />}
                                    {!loadingPackId && "PURCHASE"}
                                </Button>
                            </Interactive>
                        ))}
                    </div>
                </section>

                {/* Pricing & CTA Section (Summary for Desktop / Info for Mobile) */}
                <section className={`rounded-xl p-1 ${isPremium ? 'bg-linear-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/30' : 'bg-linear-to-br from-neon-cyan/20 to-blue-600/10 border border-neon-cyan/30'}`}>
                    <div className="bg-black/80 backdrop-blur rounded p-6 text-center space-y-4">
                        <h3 className="font-orbitron text-lg text-muted-foreground">{t('maintenance_cost')}</h3>

                        <div className="flex items-end justify-center gap-1">
                            <span className="text-4xl font-bold font-orbitron text-white">¥980</span>
                            <span className="text-muted-foreground mb-1">/ {t('month')}</span>
                        </div>

                        {/* FAQ Simple */}
                        <div className="pt-4 border-t border-white/10 text-left space-y-4 text-xs text-muted-foreground">
                            <div>
                                <strong className="text-white block mb-1">{t('faq_cancel_title')}</strong>
                                {t('faq_cancel_desc')}
                            </div>
                            <div>
                                <strong className="text-white block mb-1">{t('faq_data_title')}</strong>
                                {t('faq_data_desc')}
                            </div>
                        </div>
                    </div>
                </section>

                <div className="h-24"></div> {/* Spacer for fixed footer */}
            </main>

            {/* Fixed Bottom CTA */}
            <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md border-t border-white/10 p-4 z-50 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <div className="max-w-4xl mx-auto flex items-center gap-4 justify-between">
                    <div className="hidden sm:block">
                        <div className="text-xs text-muted-foreground">{t('maintenance_cost')}</div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold font-orbitron text-white">¥980</span>
                            <span className="text-xs text-muted-foreground">/ {t('month')}</span>
                        </div>
                    </div>

                    <div className="flex-1 sm:max-w-xs ml-auto">
                        {isPremium ? (
                            <Button
                                variant="outline"
                                onClick={handlePortal}
                                className="w-full border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10"
                                disabled={loadingPortal}
                            >
                                {loadingPortal && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t('manage_subscription')}
                            </Button>
                        ) : (
                            <Button
                                size="lg"
                                className="w-full bg-neon-cyan text-black hover:bg-cyan-400 font-bold text-lg h-12 relative overflow-hidden group shadow-[0_0_20px_rgba(0,243,255,0.3)] animate-pulse hover:animate-none"
                                onClick={handleSubscribe}
                                disabled={loadingSubscription}
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                {loadingSubscription ? (
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                ) : (
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        <Zap className="w-4 h-4 fill-current" />
                                        {t('activate_license')}
                                    </span>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function BenefitCard({ icon: Icon, color, title, desc }: { icon: any, color: string, title: string, desc: string }) {
    return (
        <Card className="bg-black/40 border-white/10 hover:border-white/20 transition-colors">
            <CardContent className="p-4 flex gap-4 items-start">
                <div className={`p-2 rounded bg-white/5 border border-white/5 ${color}`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <h3 className={`font-bold text-sm mb-1 ${color}`}>{title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function CompareRow({ label, free, premium, highlight }: { label: string, free: string, premium: string, highlight?: boolean }) {
    return (
        <div className="grid grid-cols-3 items-center py-2 border-b border-white/5 last:border-0">
            <div className="text-muted-foreground font-medium">{label}</div>
            <div className="text-center text-muted-foreground/70">{free}</div>
            <div className={`text-center font-bold ${highlight ? 'text-neon-cyan' : 'text-white'}`}>{premium}</div>
        </div>
    );
}
