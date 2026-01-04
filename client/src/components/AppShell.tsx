import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Coins, Factory, Gift, Crown, BookOpen } from "lucide-react";
import { BattleIcon, HomeIcon, ShopIcon, ProfileIcon, UnitsIcon } from "@/components/icons/AppIcons";

import { useAuth } from "@/contexts/AuthContext";
import { useUserData } from "@/hooks/useUserData";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getBadgeLabel } from "@/lib/badges";
import { preloadSfx, unlockSfx } from "@/lib/sfx";
import BottomNav from "@/components/BottomNav";
import { GlobalHeader } from "@/components/GlobalHeader";
import { APP_VERSION } from "@/version";

function getJstDateKey(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

// Pages that should NOT show GlobalHeader (they have their own headers or are public)
const PAGES_WITHOUT_GLOBAL_HEADER = ["/lp", "/auth", "/privacy", "/terms", "/law", "/404", "/how-to", "/guide", "/premium", "/boss", "/workshop", "/robot/", "/scan"];

export default function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [location] = useLocation();

  // Centralized User Data
  const { credits, loginStreak, titleId, workshopLines, error } = useUserData();
  const userDataDenied = (error as { code?: string } | null)?.code === "permission-denied";

  const [dailyFreeStatus, setDailyFreeStatus] = useState<string>("unknown");

  // Determine if GlobalHeader should be shown
  const showGlobalHeader = useMemo(() => {
    if (!user) return false;
    return !PAGES_WITHOUT_GLOBAL_HEADER.some(path => location.startsWith(path) || location === path);
  }, [user, location]);

  // Preload SFX on mount
  useEffect(() => {
    preloadSfx();
    // Unlock on first user interaction
    const unlock = () => {
      unlockSfx();
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
    };
    document.addEventListener('click', unlock);
    document.addEventListener('touchstart', unlock);

    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
    };
  }, []);

  // Reset scroll position on route change (prevent confusion)
  useEffect(() => {
    // Find the main element and scroll it to top
    const main = document.querySelector('main');
    if (main) {
      main.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [location]);

  // User subscription removed - handled by useUserData

  useEffect(() => {
    if (!user) return;
    const dateKey = getJstDateKey();
    const sessionKey = `dailyLoginAttempt:${user.uid}:${dateKey}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, "1");

    const claim = async () => {
      try {
        const [{ httpsCallable }, { getFunctions }] = await Promise.all([
          import("firebase/functions"),
          import("@/lib/firebase"),
        ]);
        const claimDailyLogin = httpsCallable(getFunctions(), "claimDailyLogin");
        const result = await claimDailyLogin();
        const data = result.data as {
          claimed?: boolean;
          streak?: number;
          newBadges?: string[];
          titleId?: string | null;
          creditsGained?: number;
        };
        if (data?.claimed) {
          toast.success(t('login_bonus_toast').replace('{streak}', String(data.streak ?? 1)), { duration: 3000 });
          if (Array.isArray(data.newBadges)) {
            data.newBadges.forEach((badgeId) => {
              const label = getBadgeLabel(badgeId) ?? badgeId;
              toast(t('new_badge_toast').replace('{badge}', label), { duration: 3500 });
            });
          }
        }
      } catch (error) {
        console.warn("claimDailyLogin failed:", error);
      }
    };

    void claim();
  }, [user]);



  const navItems = useMemo(
    () => [
      { path: "/", label: t('menu_home'), icon: HomeIcon },
      { path: "/battle", label: t('menu_battle'), icon: BattleIcon },
      { path: "/dex", label: t('menu_units'), icon: UnitsIcon },
      { path: "/shop", label: t('menu_shop'), icon: ShopIcon },
      { path: "/profile", label: t('profile'), icon: ProfileIcon },
    ],
    [],
  );

  const isActive = (path: string) => (path === "/" ? location === "/" : location.startsWith(path));

  return (
    <div className="h-dvh bg-background text-foreground relative overflow-hidden flex flex-col">
      {/* Dynamic Background Elements */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.05] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
        <div className="absolute inset-0 bg-noise opacity-[0.02]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-accent/5 blur-[120px] rounded-full animate-pulse-slow" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-accent2/5 blur-[120px] rounded-full animate-pulse-slow" />
      </div>

      <div className="relative z-10 flex flex-col flex-1 min-h-0">

        {/* GlobalHeader - rendered once, fixed position */}
        {showGlobalHeader && <GlobalHeader />}

        {/* Desktop Header - Hiding on mobile to save space (replaced by GlobalHeader + BottomNav) */}
        <header className="hidden md:flex sticky top-0 z-40 border-b border-border/60 bg-surface/80 backdrop-blur w-full shrink-0">
          <div className="container px-4 py-3 flex items-center justify-between gap-2">
            {/* Left: Rank & Badge */}
            <div className="flex items-center gap-2 text-xs md:text-sm shrink-0">
              <span className="font-mono text-primary font-bold text-sm">
                {titleId ? getBadgeLabel(titleId) ?? titleId : t('rookie')}
              </span>
              <div className="flex items-center gap-1 border-l border-white/10 pl-2">
                <span>🔥</span>
                <span className="font-mono text-orange-300 text-sm font-bold">{loginStreak == null ? "…" : loginStreak}</span>
              </div>
            </div>

            {/* Right: Navigation */}
            <nav className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
              <Link href="/dex">
                <Button variant={isActive("/dex") ? "default" : "ghost"} size="sm" className="shrink-0 whitespace-nowrap text-xs px-2">
                  <UnitsIcon className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline ml-1">{t('menu_units')}</span>
                </Button>
              </Link>
              <Link href="/guide">
                <Button variant={isActive("/guide") ? "default" : "ghost"} size="sm" className="shrink-0 text-muted hover:text-primary whitespace-nowrap text-xs px-2">
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline ml-1">{t('footer_guide')}</span>
                </Button>
              </Link>
              <Link href="/premium">
                <Button variant="default" size="sm" className="shrink-0 bg-linear-to-r from-yellow-500 to-orange-500 text-black hover:from-yellow-400 hover:to-orange-400 font-bold whitespace-nowrap text-xs px-2">
                  <Crown className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline ml-1">{t('premium')}</span>
                </Button>
              </Link>
            </nav>
          </div>
        </header>

        <main
          className="flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain -webkit-overflow-scrolling-touch"
          style={{
            paddingTop: showGlobalHeader ? "calc(var(--header-height) + env(safe-area-inset-top))" : undefined,
            paddingBottom: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 16px)"
          }}
        >
          {userDataDenied && (
            <div className="mx-4 mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-mono text-destructive">
              読み込み不可
            </div>
          )}
          {children}

          {/* Footer - inside main for proper spacing */}
          <footer className="border-t border-border/50 bg-surface/50 backdrop-blur-sm mt-8">
            <div className="mx-auto max-w-6xl px-4 py-6">
              <div className="flex flex-col items-center gap-4 text-sm">
                {/* Footer links - Row 1: Standard links */}
                <div className="flex flex-wrap justify-center items-center gap-3 md:gap-6">
                  <Link href="/how-to" className="text-muted hover:text-primary transition-colors flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    {t('footer_guide')}
                  </Link>
                  <Link href="/terms" className="text-muted hover:text-primary transition-colors">
                    {t('footer_terms')}
                  </Link>
                  <Link href="/law" className="text-muted hover:text-primary transition-colors">
                    {t('footer_law')}
                  </Link>
                  <Link href="/privacy" className="text-muted hover:text-primary transition-colors">
                    {t('footer_privacy')}
                  </Link>
                </div>

              </div>
              <div className="text-center text-xs text-muted mt-4">
                © 2024 Barcode Genesis. All rights reserved. v{APP_VERSION}
              </div>
            </div>
          </footer>
        </main>

        <BottomNav />
      </div>
    </div>
  );
}
