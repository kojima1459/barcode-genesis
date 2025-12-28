import { useState, useEffect } from "react";
import { Link } from "wouter";
import { httpsCallable } from "firebase/functions";
import { ArrowLeft, Loader2, CreditCard, Crown, Coins, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { functions } from "@/lib/firebase";
import { toast } from "sonner";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const CREDIT_PACKS = [
    { id: "credits_100", credits: 100, price: 120, popular: false },
    { id: "credits_500", credits: 500, price: 500, popular: true },
    { id: "credits_1200", credits: 1200, price: 980, popular: false },
];

export default function Premium() {
    const { user } = useAuth();
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
        <div className="min-h-screen bg-background p-4 flex flex-col">
            <header className="flex items-center mb-6 max-w-4xl mx-auto w-full">
                <Link href="/">
                    <Button variant="ghost" className="mr-4">
                        <ArrowLeft className="h-5 w-5 mr-2" />
                        戻る
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold text-primary">プレミアム</h1>
            </header>

            <main className="flex-1 max-w-4xl mx-auto w-full space-y-8">
                {/* プレミアム会員 */}
                <section>
                    <Card className="border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-500/10 to-orange-500/10">
                        <CardHeader className="text-center">
                            <div className="mx-auto mb-2 p-3 rounded-full bg-yellow-500/20 text-yellow-500 w-fit">
                                <Crown className="h-8 w-8" />
                            </div>
                            <CardTitle className="text-2xl">プレミアム会員</CardTitle>
                            <CardDescription>月額 ¥980 で限定特典をゲット！</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-yellow-500" />
                                    毎日ログインボーナス2倍（100クレジット）
                                </li>
                                <li className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-yellow-500" />
                                    限定スキン・エフェクト解放
                                </li>
                                <li className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-yellow-500" />
                                    バトル経験値+50%ボーナス
                                </li>
                                <li className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-yellow-500" />
                                    広告非表示（将来対応）
                                </li>
                            </ul>


                            {isPremium ? (
                                <div className="space-y-3">
                                    <div className="bg-yellow-500/20 text-yellow-600 p-3 rounded text-center font-bold border border-yellow-500/50">
                                        プレミアム会員です
                                    </div>
                                    <Button
                                        className="w-full"
                                        variant="outline"
                                        onClick={handlePortal}
                                        disabled={loadingPortal}
                                    >
                                        {loadingPortal && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                        プランの確認・解約
                                    </Button>
                                    <p className="text-xs text-center text-muted-foreground">
                                        Stripeカスタマーポータルへ移動します
                                    </p>
                                </div>
                            ) : (
                                <Button
                                    className="w-full"
                                    size="lg"
                                    onClick={handleSubscribe}
                                    disabled={loadingSubscription}
                                >
                                    {loadingSubscription && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    プレミアムに登録する
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </section>

                {/* クレジットパック */}
                <section>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Coins className="h-5 w-5 text-primary" />
                        クレジットパック
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {CREDIT_PACKS.map((pack) => (
                            <Card
                                key={pack.id}
                                className={pack.popular ? "border-2 border-primary relative" : ""}
                            >
                                {pack.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-bold">
                                        人気！
                                    </div>
                                )}
                                <CardHeader className="text-center">
                                    <CardTitle className="text-3xl font-bold">{pack.credits}</CardTitle>
                                    <CardDescription>クレジット</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="text-center text-2xl font-bold text-primary">
                                        ¥{pack.price.toLocaleString()}
                                    </div>
                                    <Button
                                        className="w-full"
                                        variant={pack.popular ? "default" : "outline"}
                                        onClick={() => handleBuyCredits(pack.id)}
                                        disabled={loadingPackId === pack.id}
                                    >
                                        {loadingPackId === pack.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                        購入する
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* 注意事項 */}
                <section className="text-xs text-muted-foreground space-y-1">
                    <p>※ お支払いは Stripe 株式会社の決済システムを利用しています。</p>
                    <p>※ プレミアム会員は月額自動更新です。解約はいつでも可能です。</p>
                    <p>※ クレジットは購入後すぐにアカウントに反映されます。</p>
                </section>
            </main>
        </div>
    );
}
