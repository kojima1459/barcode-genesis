import { Link } from "wouter";
import { ArrowLeft, ScanLine, Sparkles, Swords, BookOpen, Factory, Coins, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SEO from "@/components/SEO";

const flowSteps = [
  { time: "30秒", label: "ルールだけ読む" },
  { time: "1分", label: "バーコードをスキャン" },
  { time: "3分", label: "初バトルへ" },
  { time: "その後", label: "図鑑と工房" },
];

export default function HowTo() {
  return (
    <div className="min-h-screen bg-bg p-4 flex flex-col pb-24 relative overflow-hidden text-text">
      <SEO title="遊び方" description="30秒で理解 → 1分でスキャン → 3分で初バトル。バーコードの快感から始まる遊び方。" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-bg/90 pointer-events-none" />

      <header className="flex items-center mb-6 max-w-4xl mx-auto w-full relative z-10">
        <Link href="/">
          <Button variant="ghost" className="mr-4">
            <ArrowLeft className="h-5 w-5 mr-2" />
            戻る
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-accent font-orbitron">遊び方</h1>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full space-y-6 relative z-10">
        <Card className="glass-panel border-border/60">
          <CardHeader>
            <CardTitle className="text-xl font-semibold tracking-tight">
              3ステップで始めるバーコード生活
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              日常のバーコードが、最強のロボットに変わる瞬間を体験しよう。
            </p>
            <div className="grid grid-cols-2 gap-3">
              {flowSteps.map((step) => (
                <div key={step.time} className="rounded-lg border border-border/60 bg-panel/70 p-3">
                  <div className="text-xs text-accent font-semibold">{step.time}</div>
                  <div className="text-sm font-semibold">{step.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* STEP 1: Scan & Generate */}
        <Card className="glass-panel border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-neon-cyan">
              <ScanLine className="h-5 w-5" />
              STEP 1: スキャンして生成
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              まずは手近な商品のバーコード（JANコード）をカメラで読み取ります。
              13桁の数字が設計図となり、世界に1体だけのロボットが生成されます。
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-xs">
              <li>バーコードごとに性能・パーツ・色が固定（決定論）</li>
              <li>レア演出やシークレット機体も存在</li>
            </ul>
            <Link href="/scan">
              <Button className="w-full bg-accent text-bg hover:bg-accent/90 mt-2">
                スキャンへ
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* STEP 2: Battle */}
        <Card className="glass-panel border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-neon-orange">
              <Swords className="h-5 w-5" />
              STEP 2: バトルで成長
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              生成したロボットで対戦（PvP/PvE）を行います。
              相性を考えて相手を選び、クレジットとXP（経験値）を獲得しましょう。
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-xs">
              <li>勝てば報酬GET、負けても少し貰える</li>
              <li>XPが溜まるとレベルアップしてステータス上昇</li>
            </ul>
            <Link href="/battle">
              <Button className="w-full bg-accent2 text-white hover:bg-accent2/90 mt-2">
                バトルへ
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* STEP 3: Workshop & Dex */}
        <Card className="glass-panel border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-neon-purple">
              <Factory className="h-5 w-5" />
              STEP 3: 工房と図鑑
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              集めたクレジットで「派生機（Variant）」を作成したり、図鑑を埋めたりします。
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-xs">
              <li>工房: コスメアイテムを使って見た目をカスタマイズ</li>
              <li>図鑑: コレクション率を上げて称号を獲得</li>
            </ul>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <Link href="/workshop">
                <Button variant="outline" className="w-full border-border/70">
                  工房へ
                </Button>
              </Link>
              <Link href="/dex">
                <Button variant="outline" className="w-full border-border/70">
                  図鑑へ
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <Card className="glass-panel border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <HelpCircle className="h-5 w-5 text-accent" />
              よくある質問
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground">Q. 13桁以外のバーコードは？</p>
              <p>A. 現在はJANコード(13桁)が基本です。その他はエラーになる場合があります。</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Q. 読み取りにくいときは？</p>
              <p>A. 明るい場所で、反射を避けて撮影してください。</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Q. プレミアムプランとは？</p>
              <p>A. 広告非表示、所持枠拡張などがセットになった有料プランです。</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
