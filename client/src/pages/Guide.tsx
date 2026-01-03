import { Link } from "wouter";
import { ArrowLeft, ScanBarcode, Swords, Skull, Zap, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AdBanner from "@/components/AdBanner";

export default function Guide() {
    return (
        <div className="min-h-screen bg-background p-4 flex flex-col pb-24">
            <div className="max-w-4xl mx-auto w-full space-y-8">
                <header className="flex items-center">
                    <Link href="/">
                        <Button variant="ghost" className="mr-4">
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            戻る
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-orbitron font-semibold text-primary">あそびかた</h1>
                </header>

                <section className="space-y-6">
                    <Card className="bg-card/50 border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl text-primary">
                                <ScanBarcode className="h-6 w-6" />
                                1. ロボットを生成
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-muted-foreground">
                                身の回りにあるバーコードをスキャンして、あなただけのオリジナルロボットを生成しましょう。
                                バーコードの数字によって、ロボットの強さや見た目、パーツが変化します。
                            </p>
                            <div className="bg-secondary/50 p-4 rounded-lg border border-border">
                                <h3 className="font-bold mb-2 flex items-center gap-2 text-yellow-500">
                                    <Crown className="h-4 w-4" /> 生成制限について
                                </h3>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                    <li><span className="font-bold text-muted-foreground">無料プラン:</span> 1日 1体まで生成可能</li>
                                    <li><span className="font-bold text-neon-cyan">プレミアム:</span> 1日 10体まで生成可能</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-neon-pink/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl text-neon-pink">
                                <Swords className="h-6 w-6" />
                                2. バトルで勝利
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                生成したロボットで他のプレイヤーとバトル！
                                勝利すると経験値やクレジット、ランキングポイントが手に入ります。
                                レベルアップすると新しいスキルを覚えたり、ステータスが上昇します。
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card/50 border-neon-yellow/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl text-neon-yellow">
                                <Zap className="h-6 w-6" />
                                3. 合成と強化
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                不要なロボットを素材にして、メインのロボットを強化（合成）できます。
                                また、クレジットを使ってショップで強化パーツを購入し、カスタマイズすることも可能です。
                            </p>
                        </CardContent>
                    </Card>
                </section>

                <div className="flex justify-center pt-8">
                    <Link href="/premium">
                        <Button size="lg" className="w-full md:w-auto bg-linear-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white border-0">
                            <Crown className="mr-2 h-5 w-5" />
                            プレミアムプランを見る
                        </Button>
                    </Link>
                </div>
                <AdBanner />
            </div>
        </div>
    );
}
