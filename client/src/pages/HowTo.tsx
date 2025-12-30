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
              30秒で理解 → 1分でスキャン → 3分で初バトル
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              まずはバーコードを撮る。その瞬間の高揚感が、この世界の入口です。
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

        <Card className="glass-panel border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <ScanLine className="h-5 w-5 text-accent" />
              0) まずは撮る（スキャン）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              カメラでバーコードを1本。読み取りの快感が、最初のロボを生む。
            </p>
            <Link href="/scan">
              <Button className="w-full bg-accent text-bg hover:bg-accent/90">
                スキャンへ
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="glass-panel border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Sparkles className="h-5 w-5 text-accent2" />
              1) ロボが生まれる
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>・13桁の数字が設計図になる</p>
            <p>・色、パーツ、スキルが決まる</p>
            <p>・同じバーコードは同じロボ（唯一）</p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Swords className="h-5 w-5 text-accent" />
              2) バトルする
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>練習: 自分のロボ同士で試せる（報酬なし）</p>
            <p>対戦: 勝てばクレジットとXPが手に入る</p>
            <Link href="/battle">
              <Button className="w-full bg-accent text-bg hover:bg-accent/90">
                バトルへ
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="glass-panel border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <BookOpen className="h-5 w-5 text-accent" />
              3) 図鑑で集める
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>ロボと派生機をコレクション。出会いは全部、現実のバーコードから。</p>
            <Link href="/dex">
              <Button variant="outline" className="w-full border-border/70">
                図鑑へ
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="glass-panel border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Factory className="h-5 w-5 text-accent2" />
              4) 工房で派生機
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>コスメ合成で見た目を進化。強さは変わらないので安心。</p>
            <Link href="/workshop">
              <Button variant="outline" className="w-full border-border/70">
                工房へ
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="glass-panel border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Coins className="h-5 w-5 text-accent2" />
              5) クレジット / XP
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>スキャンが主役。クレジットは準備（クラフト）に使う。</p>
            <p>XPはバトルでどんどん増える。毎日少しずつ強くなる。</p>
          </CardContent>
        </Card>

        <Card className="glass-panel border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <HelpCircle className="h-5 w-5 text-accent" />
              FAQ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground">Q. 13桁じゃないバーコードは？</p>
              <p>A. できるだけ13桁を探す。ISBNなどは対応外。</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Q. 読み取れない時は？</p>
              <p>A. 光を当てる/影を減らす/ピントを合わせ直す。</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">Q. 勝てない…</p>
              <p>A. まずは練習で相性確認。バーコードを変えると世界が変わる。</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
