import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { doc, onSnapshot, collection } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { Coins, Factory, Gift, Crown, BookOpen } from "lucide-react";
import { BattleIcon, HomeIcon, ShopIcon, ProfileIcon, UnitsIcon } from "@/components/icons/AppIcons";

import { useAuth } from "@/contexts/AuthContext";
import { db, functions } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getBadgeLabel } from "@/lib/badges";

function getJstDateKey(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();

  const [credits, setCredits] = useState<number | null>(null);
  const [loginStreak, setLoginStreak] = useState<number | null>(null);
  const [titleId, setTitleId] = useState<string | null>(null);
  const [workshopLines, setWorkshopLines] = useState<number | null>(null);
  const [dailyFreeStatus, setDailyFreeStatus] = useState<string>("unknown");

  useEffect(() => {
    if (!user) return;

    const unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (!snap.exists()) {
        setCredits(0);
        setWorkshopLines(0);
        setDailyFreeStatus("unknown");
        return;
      }

      const data = snap.data() as any;
      setCredits(typeof data.credits === "number" ? data.credits : 0);
      setLoginStreak(typeof data.loginStreak === "number" ? data.loginStreak : 0);
      setTitleId(typeof data.titleId === "string" ? data.titleId : null);
    });



    return () => {
      unsubUser();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const dateKey = getJstDateKey();
    const sessionKey = `dailyLoginAttempt:${user.uid}:${dateKey}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, "1");

    const claim = async () => {
      try {
        const claimDailyLogin = httpsCallable(functions, "claimDailyLogin");
        const result = await claimDailyLogin();
        const data = result.data as {
          claimed?: boolean;
          streak?: number;
          newBadges?: string[];
          titleId?: string | null;
          creditsGained?: number;
        };
        if (data?.claimed) {
          toast.success(`ログインボーナス獲得！連続${data.streak ?? 1}日`, { duration: 3000 });
          if (Array.isArray(data.newBadges)) {
            data.newBadges.forEach((badgeId) => {
              const label = getBadgeLabel(badgeId) ?? badgeId;
              toast(`新バッジ獲得: ${label}`, { duration: 3500 });
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
      { path: "/", label: "ホーム", icon: HomeIcon },
      { path: "/battle", label: "バトル", icon: BattleIcon },
      { path: "/dex", label: "ユニット", icon: UnitsIcon },
      { path: "/shop", label: "ショップ", icon: ShopIcon },
      { path: "/profile", label: "設定", icon: ProfileIcon },
    ],
    [],
  );

  const isActive = (path: string) => (path === "/" ? location === "/" : location.startsWith(path));

  return (
    <div className="min-h-[100dvh] bg-bg text-text relative overflow-hidden overscroll-y-contain">
      <div className="pointer-events-none absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />
      <div className="pointer-events-none absolute inset-0 bg-[url('/scanline.png')] opacity-[0.04] mix-blend-soft-light" />
      <div className="relative z-10">
        <header className="sticky top-0 z-40 border-b border-border/60 bg-surface/80 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-2">
            {/* Left: Rank & Badge */}
            <div className="flex items-center gap-2 text-xs md:text-sm shrink-0">
              <span className="font-mono text-primary font-bold text-sm">
                {titleId ? getBadgeLabel(titleId) ?? titleId : "Rookie"}
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
                  <span className="hidden sm:inline ml-1">ユニット</span>
                </Button>
              </Link>
              <Link href="/guide">
                <Button variant={isActive("/guide") ? "default" : "ghost"} size="sm" className="shrink-0 text-muted hover:text-primary whitespace-nowrap text-xs px-2">
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline ml-1">使い方</span>
                </Button>
              </Link>
              <Link href="/premium">
                <Button variant="default" size="sm" className="shrink-0 bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:from-yellow-400 hover:to-orange-400 font-bold whitespace-nowrap text-xs px-2">
                  <Crown className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline ml-1">Premium</span>
                </Button>
              </Link>
            </nav>
          </div>
        </header>

        <main className="pb-0">
          {children}

          {/* Footer - inside main for proper spacing */}
          <footer className="border-t border-border/50 bg-surface/50 backdrop-blur-sm mt-8 mb-4" style={{ marginBottom: "calc(var(--bottom-nav-h, 84px) + env(safe-area-inset-bottom) + 24px)" }}>
            <div className="mx-auto max-w-6xl px-4 py-6">
              <div className="flex flex-wrap justify-center gap-3 md:gap-6 text-sm">
                <Link href="/guide" className="text-muted hover:text-primary transition-colors flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  使い方
                </Link>
                <Link href="/premium" className="text-yellow-500 hover:text-yellow-400 transition-colors flex items-center gap-1 font-bold">
                  <Crown className="h-4 w-4" />
                  Premium
                </Link>
                <Link href="/terms" className="text-muted hover:text-primary transition-colors">
                  利用規約
                </Link>
                <Link href="/privacy" className="text-muted hover:text-primary transition-colors">
                  プライバシー
                </Link>
                <Link href="/law" className="text-muted hover:text-primary transition-colors">
                  特商法
                </Link>
              </div>
              <div className="text-center text-xs text-muted mt-4">
                © 2024 Barcode Genesis. All rights reserved.
              </div>
            </div>
          </footer>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-50 p-4 md:hidden pointer-events-none" aria-label="App navigation">
          <div
            className="glass-panel rounded-2xl flex justify-around items-center p-3 pointer-events-auto"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
          >
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link key={item.path} href={item.path} aria-current={active ? "page" : undefined}>
                  <div
                    className={`flex flex-col items-center gap-1 transition-all duration-300 min-w-[48px] min-h-[48px] justify-center ${active ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    <item.icon
                      className={`h-5 w-5 ${active ? "neon-text-cyan drop-shadow-[0_0_8px_rgba(62,208,240,0.5)]" : ""}`}
                      aria-hidden="true"
                    />
                    <span className={`text-[10px] font-orbitron tracking-[0.08em] ${active ? "text-primary neon-text-cyan" : ""}`}>
                      {item.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
