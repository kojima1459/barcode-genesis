import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function SpecifiedCommercial() {
    return (
        <div className="min-h-screen bg-background py-10 px-4 animate-in fade-in duration-500">
            <div className="max-w-3xl mx-auto space-y-8 bg-card border rounded-lg p-8 shadow-sm">
                <h1 className="text-2xl font-bold mb-6">特定商取引法に基づく表記</h1>

                <div className="space-y-6 text-sm">
                    <section className="grid sm:grid-cols-3 gap-2 border-b pb-4">
                        <h2 className="font-semibold text-muted-foreground">販売事業者</h2>
                        <div className="sm:col-span-2">UNSEVED:LAB</div>
                    </section>

                    <section className="grid sm:grid-cols-3 gap-2 border-b pb-4">
                        <h2 className="font-semibold text-muted-foreground">代表者</h2>
                        <div className="sm:col-span-2">Masahide Kojima</div>
                    </section>

                    <section className="grid sm:grid-cols-3 gap-2 border-b pb-4">
                        <h2 className="font-semibold text-muted-foreground">メールアドレス</h2>
                        <div className="sm:col-span-2">mk19830920@gmail.com</div>
                    </section>

                    <section className="grid sm:grid-cols-3 gap-2 border-b pb-4">
                        <h2 className="font-semibold text-muted-foreground">所在地・電話番号</h2>
                        <div className="sm:col-span-2">請求があった場合、遅滞なく開示いたします。</div>
                    </section>

                    <section className="grid sm:grid-cols-3 gap-2 border-b pb-4">
                        <h2 className="font-semibold text-muted-foreground">販売価格</h2>
                        <div className="sm:col-span-2">購入画面に表示される金額（税込）とします。</div>
                    </section>

                    <section className="grid sm:grid-cols-3 gap-2 border-b pb-4">
                        <h2 className="font-semibold text-muted-foreground">支払時期・方法</h2>
                        <div className="sm:col-span-2">
                            <p>支払方法：クレジットカード決済（Stripe）</p>
                            <p>支払時期：商品購入時</p>
                        </div>
                    </section>

                    <section className="grid sm:grid-cols-3 gap-2 border-b pb-4">
                        <h2 className="font-semibold text-muted-foreground">引き渡し時期</h2>
                        <div className="sm:col-span-2">決済完了後、直ちにアカウントに反映されます。</div>
                    </section>

                    <section className="grid sm:grid-cols-3 gap-2">
                        <h2 className="font-semibold text-muted-foreground">返品・キャンセル</h2>
                        <div className="sm:col-span-2">デジタルコンテンツの性質上、購入後の返品・キャンセルはお受けできません。</div>
                    </section>
                </div>

                <div className="pt-8 text-center">
                    <Link href="/">
                        <Button variant="outline">トップへ戻る</Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
