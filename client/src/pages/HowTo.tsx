import { Link } from "wouter";
import { ArrowLeft, ScanLine, Swords, Factory, HelpCircle } from "lucide-react";
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
        <TechCard
          header={
            <div className="flex items-center gap-2 text-neon-cyan">
              <ScanLine className="h-5 w-5" />
              {t('howto_step1_title')}
            </div>
          }
        >
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>{t('howto_step1_desc')}</p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-xs">
              <li>{t('howto_step1_note1')}</li>
              <li>{t('howto_step1_note2')}</li>
            </ul>
            <Link href="/scan">
              <Button className="w-full bg-accent text-background hover:bg-accent/90 mt-2">
                {t('scan_barcode')}
              </Button>
            </Link>
          </div>
        </TechCard>

        {/* STEP 2: Battle */}
        <TechCard
          header={
            <div className="flex items-center gap-2 text-neon-orange">
              <Swords className="h-5 w-5" />
              {t('howto_step2_title')}
            </div>
          }
        >
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>{t('howto_step2_desc')}</p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-xs">
              <li>{t('howto_step2_note1')}</li>
              <li>{t('howto_step2_note2')}</li>
            </ul>
            <Link href="/battle">
              <Button className="w-full bg-accent2 text-white hover:bg-accent2/90 mt-2">
                {t('battle')}
              </Button>
            </Link>
          </div>
        </TechCard>

        {/* STEP 3: Workshop & Dex */}
        <TechCard
          header={
            <div className="flex items-center gap-2 text-neon-purple">
              <Factory className="h-5 w-5" />
              {t('howto_step3_title')}
            </div>
          }
        >
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>{t('howto_step3_desc')}</p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-xs">
              <li>{t('howto_step3_note1')}</li>
              <li>{t('howto_step3_note2')}</li>
            </ul>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <Link href="/workshop">
                <Button variant="outline" className="w-full border-white/10">
                  {t('workshop')}
                </Button>
              </Link>
              <Link href="/dex">
                <Button variant="outline" className="w-full border-white/10">
                  {t('units')}
                </Button>
              </Link>
            </div>
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
    </div>
  );
}
