import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { doc, onSnapshot, collection } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { Coins, Factory, Gift } from "lucide-react";
import { BattleIcon, DexIcon, HowToIcon, ScanIcon, WorkshopIcon } from "@/components/icons/AppIcons";

import { useAuth } from "@/contexts/AuthContext";
import { db, functions } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getBadgeLabel } from "@/lib/badges";

type DailyFreeStatus = "loading" | "unknown" | "available" | "used";

function toJstDateString(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  const maybeTimestamp = value as { toDate?: () => Date };
  if (typeof maybeTimestamp.toDate === "function") {
    return maybeTimestamp.toDate().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
  }
  return null;
}

function getJstDateKey(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

export default function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();

  const [credits, setCredits] = useState<number | null>(null);
  const [workshopLines, setWorkshopLines] = useState<number | null>(null);
  const [variantsCount, setVariantsCount] = useState<number | null>(null);
  const [dailyFreeStatus, setDailyFreeStatus] = useState<DailyFreeStatus>("loading");
  const [loginStreak, setLoginStreak] = useState<number | null>(null);
  const [titleId, setTitleId] = useState<string | null>(null);

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
      setWorkshopLines(typeof data.workshopLines === "number" ? data.workshopLines : 0);
      setLoginStreak(typeof data.loginStreak === "number" ? data.loginStreak : 0);
      setTitleId(typeof data.titleId === "string" ? data.titleId : null);

      const todayJst = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
      const lastFree = toJstDateString(data.lastFreeVariantDate);
      if (lastFree == null) {
        setDailyFreeStatus("unknown");
      } else {
        setDailyFreeStatus(lastFree !== todayJst ? "available" : "used");
      }
    });

    const unsubVariants = onSnapshot(collection(db, "users", user.uid, "variants"), (snap) => {
      setVariantsCount(snap.size);
    });

    return () => {
      unsubUser();
      unsubVariants();
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

  const remainingLines = useMemo(() => {
    if (workshopLines == null || variantsCount == null) return null;
    return Math.max(0, workshopLines - variantsCount);
  }, [variantsCount, workshopLines]);

  const navItems = useMemo(
    () => [
      { path: "/scan", label: "Scan", icon: ScanIcon },
      { path: "/how-to", label: "遊び方", icon: HowToIcon },
      { path: "/dex", label: "Dex", icon: DexIcon },
      { path: "/battle", label: "Battle", icon: BattleIcon },
      { path: "/workshop", label: "Workshop", icon: WorkshopIcon },
    ],
    [],
  );

  const isActive = (path: string) => (path === "/" ? location === "/" : location.startsWith(path));

  return (
    <div className="min-h-[100dvh] bg-bg text-text relative overflow-hidden overscroll-y-contain">
      <div className="pointer-events-none absolute inset-0 bg-[url('/grid.svg')] opacity-[0.06]" />
      <div className="pointer-events-none absolute inset-0 bg-[url('/scanline.png')] opacity-[0.08] mix-blend-soft-light" />
      <div className="relative z-10">
        <header className="sticky top-0 z-40 border-b border-border/60 bg-surface/80 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-xs md:text-sm">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-yellow-400" />
                <span className="font-mono">{credits == null ? "…" : credits}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">称号</span>
                <span className="font-mono">
                  {titleId ? getBadgeLabel(titleId) ?? titleId : "Rookie"}
                </span>
                <span className="text-orange-300 font-mono">
                  🔥連続{loginStreak == null ? "…" : loginStreak}日
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Factory className="h-4 w-4 text-primary" />
                <span className="font-mono">
                  {variantsCount == null || workshopLines == null ? "…/…" : `${variantsCount}/${workshopLines}`}
                  {remainingLines == null ? "" : ` (残り${remainingLines})`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-neon-cyan" />
                <span className="font-mono">
                  {dailyFreeStatus === "loading" || dailyFreeStatus === "unknown"
                    ? "FREE: …"
                    : dailyFreeStatus === "available"
                      ? "FREE: 〇"
                      : "FREE: ×"}
                </span>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-2">
              {navItems.map((item) => (
                <Link key={item.path} href={item.path}>
                  <Button variant={isActive(item.path) ? "default" : "ghost"} size="sm">
                    <item.icon className="h-4 w-4 mr-2" aria-hidden="true" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main
          className="pb-0"
          style={{
            paddingBottom: "calc(var(--bottom-nav-h, 84px) + env(safe-area-inset-bottom) + 16px)",
          }}
        >
          {children}
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
                    className={`flex flex-col items-center gap-1 transition-all duration-300 min-w-[48px] min-h-[48px] justify-center ${
                      active ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <item.icon
                      className={`h-5 w-5 ${active ? "neon-text-cyan drop-shadow-[0_0_8px_rgba(62,208,240,0.5)]" : ""}`}
                      aria-hidden="true"
                    />
                    <span className={`text-[11px] font-orbitron tracking-[0.08em] ${active ? "text-primary neon-text-cyan" : ""}`}>
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
