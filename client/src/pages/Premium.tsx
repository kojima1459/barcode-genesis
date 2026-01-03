import { useState, useEffect } from "react";
import { Link } from "wouter";
import { httpsCallable } from "firebase/functions";
import { ArrowLeft, Loader2, CreditCard, Crown, Coins, Sparkles, Zap, Shield, ChevronDown, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { functions } from "@/lib/firebase";
import { toast } from "sonner";
import { Interactive } from "@/components/ui/interactive";
import { useUserData } from "@/hooks/useUserData";
import { BenefitCard } from "@/components/BenefitCard";
import SEO from "@/components/SEO";

const CREDIT_PACKS = [
    { id: "credits_100", credits: 100, price: 120, popular: false },
    { id: "credits_500", credits: 500, price: 500, popular: true },
    { id: "credits_1200", credits: 1200, price: 980, popular: false },
];

import { TechCard } from "@/components/ui/TechCard";

export default function Premium() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const { userData, loading: userDataLoading } = useUserData();
    const [loadingPackId, setLoadingPackId] = useState<string | null>(null);
    const [loadingSubscription, setLoadingSubscription] = useState(false);
    const [loadingPortal, setLoadingPortal] = useState(false);


    // Reflection wait state (webhook may take a few seconds)
    const [waitingForReflection, setWaitingForReflection] = useState(false);
    const [pollCount, setPollCount] = useState(0);
    const MAX_POLL_COUNT = 15; // Max ~30 seconds with exponential backoff

    const isPremium = !!userData?.isPremium;

    // Detect ?result=success from Stripe redirect
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const result = params.get('result') || params.get('premium');

        if (result === 'success' || result === 'activated') {
            // Clear URL params
            window.history.replaceState({}, '', '/premium');

            if (!isPremium) {
                setWaitingForReflection(true);
                setPollCount(0);
            } else {
                toast.success('プレミアムが有効になりました！');
            }
        }
    }, []);

    // Polling for reflection (exponential backoff)
    useEffect(() => {
        if (!waitingForReflection || !user) return;

        if (isPremium) {
            setWaitingForReflection(false);
            toast.success('プレミアムが有効になりました！');
            return;
        }

        if (pollCount >= MAX_POLL_COUNT) {
            setWaitingForReflection(false);
            toast.error('反映に時間がかかっています。ページを再読み込みしてください。');
            return;
        }

        // Just increment poll count on timer - onSnapshot handles actual data refresh
        const delay = Math.min((pollCount + 1) * 1000, 5000);
        const timer = setTimeout(() => {
            setPollCount(prev => prev + 1);
        }, delay);

        return () => clearTimeout(timer);
    }, [waitingForReflection, pollCount, isPremium, user]);



    const handleBuyCredits = async (packId: string) => {
        if (!user) {
            toast.error(t('error'));
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
                toast.error(t('error'));
            }
        } catch (error) {
            console.error("Checkout error:", error);
            toast.error(t('error'));
        } finally {
            setLoadingPackId(null);
        }
    };

    const handleSubscribe = async () => {
        if (!user) {
            toast.error(t('error'));
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
                toast.error(t('error'));
            }
        } catch (error) {
            console.error("Subscription error:", error);
            toast.error(t('error'));
        } finally {
            setLoadingSubscription(false);
        }
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
                toast.error(t('error'));
            }
        } catch (error) {
            console.error("Portal error:", error);
            toast.error(t('error'));
        } finally {
            setLoadingPortal(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col relative bg-background text-foreground pt-[env(safe-area-inset-top)]"
            style={{ paddingBottom: "calc(var(--bottom-nav-height) + 2rem)" }}>
            <SEO title={t('premium')} description={t('premium_desc')} />

            {/* Header / Hero */}
            <div className="relative pt-6 pb-8 px-4 border-b border-white/5 bg-black/20">
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
                        <h1 className="text-2xl md:text-3xl font-orbitron font-semibold tracking-wide text-white">
                            {t('system_upgrade')}
                        </h1>
                    </div>
                    <p className="text-muted-foreground text-sm md:text-base max-w-lg">
                        {t('unlock_full_capability')}
                    </p>
                </div>
            </div>

            {/* Reflection Waiting Banner */}
            {waitingForReflection && (
                <div className="bg-cyan-500/10 border-b border-cyan-500/30 px-4 py-3">
                    <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
                            <div>
                                <p className="text-sm font-medium text-cyan-300">
                                    プレミアム反映待ち...
                                </p>
                                <p className="text-xs text-cyan-400/70">
                                    決済完了しました。反映まで数秒お待ちください
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.location.reload()}
                            className="text-cyan-400 hover:text-cyan-300"
                        >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            更新
                        </Button>
                    </div>
                </div>
            )}

            <main className="max-w-4xl mx-auto px-4 py-8 space-y-12">

                {/* Subscription Action Card - MOVED TO TOP */}
                <TechCard className={isPremium ? 'border-yellow-500/50' : 'border-neon-cyan/50'}>
                    <div className="text-center">
                        <h3 className="font-orbitron text-lg text-muted-foreground mb-4">{t('maintenance_cost')}</h3>
                        <div className="flex items-end justify-center gap-1 mb-6">
                            <span className="text-4xl font-orbitron font-semibold text-white">¥390</span>
                            <span className="text-muted-foreground mb-1">/ {t('month')}</span>
                        </div>
                        {isPremium ? (
                            <Button
                                variant="outline"
                                onClick={handlePortal}
                                className="w-full border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 h-12 font-bold"
                                disabled={loadingPortal}
                            >
                                {loadingPortal && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t('manage_subscription')}
                            </Button>
                        ) : (
                            <Button
                                size="lg"
                                className="w-full bg-neon-cyan text-black hover:bg-cyan-400 font-bold text-lg h-12 relative overflow-hidden group shadow-[0_0_20px_rgba(0,243,255,0.3)]"
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
                        <p className="text-[10px] text-muted-foreground mt-3 text-center">
                            * {t('maintenance_cost')} ¥390 / {t('month')}
                        </p>
                    </div>
                </TechCard>

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
                <TechCard header={t('access_comparison')}>
                    <div className="space-y-4 text-sm">
                        <CompareRow label={t('scanning_limit')} free={`5 / ${t('day')}`} premium={t('unlimited')} highlight />
                        <CompareRow label={t('ads_display')} free={t('present')} premium={t('none')} />
                        <CompareRow label={t('login_bonus')} free={t('standard')} premium="x2" />
                        <CompareRow label={t('battle_xp')} free="100%" premium="150%" />
                    </div>
                </TechCard>

                {/* Resource Supply (Credits) */}
                <section className="pb-8">
                    <h2 className="text-xl font-orbitron font-semibold mb-4 flex items-center gap-2 text-muted-foreground">
                        <Coins className="h-5 w-5" />
                        {t('resource_supply')}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {CREDIT_PACKS.map((pack) => (
                            <Interactive
                                key={pack.id}
                                className={`rounded-xl border p-4 bg-white/5 flex flex-col items-center text-center transition-colors ${pack.popular ? 'border-neon-cyan/50 bg-neon-cyan/5 shadow-[0_0_15px_rgba(0,243,255,0.1)]' : 'border-white/10 hover:border-white/20'}`}
                                onClick={() => handleBuyCredits(pack.id)}
                            >
                                <div className="text-xl font-bold mb-1 text-white">{pack.credits} <span className="text-xs text-muted-foreground uppercase">{t('credits')}</span></div>
                                <div className="text-sm text-neon-cyan mb-3 font-mono">¥{pack.price.toLocaleString()}</div>
                                <Button size="sm" variant={pack.popular ? "default" : "secondary"} className="w-full h-8 text-xs font-bold" disabled={loadingPackId === pack.id}>
                                    {loadingPackId === pack.id && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                                    {t('purchase')}
                                </Button>
                            </Interactive>
                        ))}
                    </div>
                </section>

                {/* FAQ Section */}
                <div className="pt-6 border-t border-white/10 text-left space-y-4 text-[11px] text-muted-foreground leading-relaxed">
                    <div>
                        <strong className="text-white block mb-1">{t('faq_cancel_title')}</strong>
                        {t('faq_cancel_desc')}
                    </div>
                    <div>
                        <strong className="text-white block mb-1">{t('faq_data_title')}</strong>
                        {t('faq_data_desc')}
                    </div>
                </div>

                <div style={{ height: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 16px)" }}></div>
            </main >
        </div >
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
