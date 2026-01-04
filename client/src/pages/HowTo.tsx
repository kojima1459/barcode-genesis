import { Link } from "wouter";
import { ArrowLeft, ScanLine, Swords, Factory, HelpCircle, Layers, TrendingUp, Trophy, ScanBarcode, Zap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import { useLanguage } from "@/contexts/LanguageContext";
import { TechCard } from "@/components/ui/TechCard";

export default function HowTo() {
  const { t } = useLanguage();

  const flowSteps = [
    { time: "30sec", label: t('step_rule') },
    { time: "1min", label: t('step_scan') },
    { time: "3min", label: t('step_battle') },
    { time: "Next", label: t('step_workshop') },
  ];

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col pt-[env(safe-area-inset-top)] relative overflow-hidden text-foreground" style={{ paddingBottom: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 16px)" }}>
      <SEO title={t('how_to_title')} description={t('how_to_welcome')} />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-linear-to-b from-transparent to-bg/90 pointer-events-none" />

      <header className="flex items-center mb-6 max-w-4xl mx-auto w-full relative z-10">
        <Link href="/">
          <Button variant="ghost" className="mr-4">
            <ArrowLeft className="h-5 w-5 mr-2" />
            {t('back')}
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-accent font-orbitron">{t('how_to_title')}</h1>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full space-y-6 relative z-10">
        <TechCard header={t('how_to_steps_title')}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground font-mono">
              {t('how_to_summary')}
            </p>
            <p className="text-[11px] text-muted-foreground/80">
              {t('how_to_welcome')}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {flowSteps.map((step) => (
                <div key={step.label} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-accent font-semibold">{step.time}</div>
                  <div className="text-sm font-semibold">{step.label}</div>
                </div>
              ))}
            </div>
          </div>
        </TechCard>

        {/* STEP 1: Scan & Generate */}
        <div className="relative overflow-hidden rounded-xl border border-cyan-500/30 bg-black/40 backdrop-blur-sm group hover:border-cyan-500/50 transition-all">
          <div className="absolute inset-0 bg-linear-to-br from-cyan-900/20 to-transparent opacity-50" />
          <ScanBarcode className="absolute -right-8 -bottom-8 w-48 h-48 text-cyan-500/5 rotate-[-15deg] group-hover:scale-105 transition-transform duration-700" />

          <div className="relative p-5 z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                <ScanLine className="w-5 h-5 text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold italic text-white font-orbitron tracking-wide">
                STEP 01 <span className="text-cyan-400 not-italic ml-2 text-base font-sans">{t('howto_step1_title')}</span>
              </h2>
            </div>

            <div className="space-y-4 text-sm text-gray-300 pl-1">
              <p>{t('howto_step1_desc')}</p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-cyan-200/80">
                <li className="flex items-start gap-2 bg-cyan-950/30 p-2 rounded border border-cyan-500/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1 shrink-0" />
                  {t('howto_step1_note1')}
                </li>
                <li className="flex items-start gap-2 bg-cyan-950/30 p-2 rounded border border-cyan-500/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1 shrink-0" />
                  {t('howto_step1_note2')}
                </li>
              </ul>
              <Link href="/scan">
                <Button className="w-full bg-linear-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-bold tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.4)] border-none mt-2 h-10">
                  {t('scan_barcode')}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* STEP 2: Battle */}
        <div className="relative overflow-hidden rounded-xl border border-pink-500/30 bg-black/40 backdrop-blur-sm group hover:border-pink-500/50 transition-all">
          <div className="absolute inset-0 bg-linear-to-br from-pink-900/20 to-transparent opacity-50" />
          <Swords className="absolute -right-8 -bottom-8 w-48 h-48 text-pink-500/5 rotate-[-15deg] group-hover:scale-105 transition-transform duration-700" />

          <div className="relative p-5 z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center border border-pink-500/50 shadow-[0_0_10px_rgba(236,72,153,0.3)]">
                <Swords className="w-5 h-5 text-pink-400" />
              </div>
              <h2 className="text-xl font-bold italic text-white font-orbitron tracking-wide">
                STEP 02 <span className="text-pink-400 not-italic ml-2 text-base font-sans">{t('howto_step2_title')}</span>
              </h2>
            </div>

            <div className="space-y-4 text-sm text-gray-300 pl-1">
              <p>{t('howto_step2_desc')}</p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-pink-200/80">
                <li className="flex items-start gap-2 bg-pink-950/30 p-2 rounded border border-pink-500/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-pink-400 mt-1 shrink-0" />
                  {t('howto_step2_note1')}
                </li>
                <li className="flex items-start gap-2 bg-pink-950/30 p-2 rounded border border-pink-500/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-pink-400 mt-1 shrink-0" />
                  {t('howto_step2_note2')}
                </li>
              </ul>
              <div className="p-3 rounded-lg bg-pink-500/10 border border-pink-500/20 text-xs text-pink-200/90 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-pink-300">
                  <Zap className="w-3.5 h-3.5" />
                  ひっさつわざ (Overdrive)
                </div>
                <p>
                  バトルがはじまるまえに「ひっさつわざ」をONにしよう。ゲージがたまったときに、すごいわざが はつどうするよ！
                </p>
                <div className="font-bold flex items-center gap-1.5 text-pink-300 pt-1">
                  <Users className="w-3.5 h-3.5" />
                  サポート (Support)
                </div>
                <p>
                  「おうえんプロトコル」をつかうと、ロボットの ステータスが パワーアップするよ！ つよいあいてと たたかうときに つかってみよう。
                </p>
              </div>
              <Link href="/battle">
                <Button className="w-full bg-linear-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 text-white font-bold tracking-wider shadow-[0_0_15px_rgba(236,72,153,0.4)] border-none mt-2 h-10">
                  {t('battle')}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* STEP 3: Workshop & Dex */}
        <div className="relative overflow-hidden rounded-xl border border-orange-500/30 bg-black/40 backdrop-blur-sm group hover:border-orange-500/50 transition-all">
          <div className="absolute inset-0 bg-linear-to-br from-orange-900/20 to-transparent opacity-50" />
          <Factory className="absolute -right-8 -bottom-8 w-48 h-48 text-orange-500/5 rotate-[-15deg] group-hover:scale-105 transition-transform duration-700" />

          <div className="relative p-5 z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center border border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.3)]">
                <Factory className="w-5 h-5 text-orange-400" />
              </div>
              <h2 className="text-xl font-bold italic text-white font-orbitron tracking-wide">
                STEP 03 <span className="text-orange-400 not-italic ml-2 text-base font-sans">{t('howto_step3_title')}</span>
              </h2>
            </div>

            <div className="space-y-4 text-sm text-gray-300 pl-1">
              <p>{t('howto_step3_desc')}</p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-orange-200/80">
                <li className="flex items-start gap-2 bg-orange-950/30 p-2 rounded border border-orange-500/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1 shrink-0" />
                  {t('howto_step3_note1')}
                </li>
                <li className="flex items-start gap-2 bg-orange-950/30 p-2 rounded border border-orange-500/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1 shrink-0" />
                  {t('howto_step3_note2')}
                </li>
              </ul>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <Link href="/workshop">
                  <Button className="w-full bg-linear-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold tracking-wider shadow-[0_0_15px_rgba(249,115,22,0.4)] border-none h-10">
                    {t('menu_craft')}
                  </Button>
                </Link>
                <Link href="/dex">
                  <Button variant="outline" className="w-full border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 h-10">
                    {t('units')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Enhancement Features */}
        <div className="relative overflow-hidden rounded-xl border border-green-500/30 bg-black/40 backdrop-blur-sm group hover:border-green-500/50 transition-all">
          <div className="absolute inset-0 bg-linear-to-br from-green-900/20 to-transparent opacity-50" />
          <Layers className="absolute -right-8 -bottom-8 w-48 h-48 text-green-500/5 rotate-[-15deg] group-hover:scale-105 transition-transform duration-700" />

          <div className="relative p-5 z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center border border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.3)]">
                <Layers className="w-5 h-5 text-green-400" />
              </div>
              <h2 className="text-xl font-bold italic text-white font-orbitron tracking-wide">
                GUIDE <span className="text-green-400 not-italic ml-2 text-base font-sans">{t('howto_enhance_title')}</span>
              </h2>
            </div>

            <div className="space-y-4 text-sm text-gray-300 pl-1">
              <p>{t('howto_enhance_desc')}</p>
              <div className="space-y-3">
                <div className="rounded-lg border border-green-500/20 bg-green-900/10 p-3 hover:bg-green-900/20 transition-colors">
                  <div className="font-semibold text-green-400 text-xs flex items-center gap-1 mb-1">
                    <Factory className="w-3 h-3" />
                    {t('howto_synthesis_title')}
                  </div>
                  <div className="text-xs text-green-200/80">{t('howto_synthesis_desc')}</div>
                </div>
                <div className="rounded-lg border border-green-500/20 bg-green-900/10 p-3 hover:bg-green-900/20 transition-colors">
                  <div className="font-semibold text-orange-400 text-xs flex items-center gap-1 mb-1">
                    <TrendingUp className="w-3 h-3" />
                    {t('howto_evolution_title')}
                  </div>
                  <div className="text-xs text-orange-200/80">{t('howto_evolution_desc')}</div>
                </div>
                <div className="rounded-lg border border-green-500/20 bg-green-900/10 p-3 hover:bg-green-900/20 transition-colors">
                  <div className="font-semibold text-purple-400 text-xs flex items-center gap-1 mb-1">
                    <Trophy className="w-3 h-3" />
                    {t('howto_workshop_title')}
                  </div>
                  <div className="text-xs text-purple-200/80">{t('howto_workshop_desc')}</div>
                </div>
              </div>
              <p className="text-xs bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-green-200/90 italic">
                💡 {t('howto_enhance_tip')}
              </p>
            </div>
          </div>
        </div>

        {/* Level Up Methods */}
        <TechCard
          header={
            <div className="flex items-center gap-2 text-neon-cyan">
              <TrendingUp className="h-5 w-5" />
              {t('howto_levelup_title')}
            </div>
          }
        >
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>{t('howto_levelup_desc')}</p>
            <div className="space-y-3">
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                <div className="font-semibold text-green-400 text-xs flex items-center gap-1">✅ {t('howto_battle_title')}</div>
                <div className="text-xs mt-1">{t('howto_battle_xp')}</div>
              </div>
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                <div className="font-semibold text-green-400 text-xs flex items-center gap-1">✅ {t('howto_synthesis_title')}</div>
                <div className="text-xs mt-1">{t('howto_synthesis_xp')}</div>
              </div>
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
                <div className="font-semibold text-yellow-400 text-xs">{t('howto_training_title')}</div>
                <div className="text-xs mt-1">{t('howto_training_warn')}</div>
              </div>
            </div>
          </div>
        </TechCard>

        {/* Workshop Expansion */}
        <TechCard
          header={
            <div className="flex items-center gap-2 text-yellow-500">
              <Trophy className="h-5 w-5" />
              {t('howto_expansion_title')}
            </div>
          }
        >
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>{t('howto_expansion_desc')}</p>
          </div>
        </TechCard>

        {/* FAQ Section */}
        <TechCard
          header={
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-accent" />
              {t('faq_title')}
            </div>
          }
        >
          <div className="space-y-4 text-sm text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground">{t('faq_q1')}</p>
              <p>{t('faq_a1')}</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">{t('faq_q2')}</p>
              <p>{t('faq_a2')}</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">{t('faq_q3')}</p>
              <p>{t('faq_a3')}</p>
            </div>
          </div>
        </TechCard>
      </main>
    </div >
  );
}
