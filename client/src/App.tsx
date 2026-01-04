import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider, LANGUAGE_STORAGE_KEY } from "./contexts/LanguageContext";
import { HapticProvider } from "@/contexts/HapticContext";
import { TutorialProvider } from "@/contexts/TutorialContext";
import TutorialOverlay from "@/components/TutorialOverlay";
import { UserDataProvider } from "@/hooks/useUserData";
import { SoundProvider, useSound } from "@/contexts/SoundContext";
import { useEffect, useRef, useState, lazy, Suspense, type ComponentType } from "react";
import { AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import OfflineBanner from "@/components/OfflineBanner";
import { Loader2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import { SystemSkeleton } from "@/components/ui/SystemSkeleton";
import { APP_VERSION } from "./version";
import { registerGlobalErrorHandlers } from "@/lib/errorLog";

const DEV_RENDER_PHASE_KEY = "__lastRenderPhase";

// Cache busting / Version check
const useVersionCheck = () => {
  useEffect(() => {
    const storedVersion = localStorage.getItem("app_version");
    if (storedVersion !== APP_VERSION) {
      console.log(`[VersionCheck] Version mismatch: ${storedVersion} -> ${APP_VERSION}. Forcing full refresh...`);

      // 言語設定を保存（クリア後に復元）
      const storedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? localStorage.getItem("language");
      const savedLanguage = storedLang === "en" || storedLang === "ja" ? storedLang : "ja";

      localStorage.clear();
      localStorage.setItem("app_version", APP_VERSION);

      // 言語設定を復元（英語復活を防ぐ）
      localStorage.setItem(LANGUAGE_STORAGE_KEY, savedLanguage);
      localStorage.removeItem("language");

      // Unregister all service workers
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function (registrations) {
          for (const registration of registrations) {
            registration.unregister();
            console.log('[VersionCheck] Unregistered SW:', registration.scope);
          }
        });
      }

      // IMPORTANT: Also clear all caches (SW may have cached old bundles)
      if ('caches' in window) {
        caches.keys().then(function (names) {
          for (const name of names) {
            caches.delete(name);
            console.log('[VersionCheck] Deleted cache:', name);
          }
        });
      }

      // Delay reload slightly to allow cache operations to complete
      setTimeout(() => {
        // Force reload ignoring cache
        window.location.reload();
      }, 100);
    }
  }, []);
};

// Lazy load pages for better performance (with auto-retry on chunk error)
import { lazyRetry } from "@/lib/lazyRetry";

const Home = lazyRetry(() => import("@/pages/Home"), "Home");
const Auth = lazyRetry(() => import("@/pages/Auth"), "Auth");
const Battle = lazyRetry(() => import("@/pages/Battle"), "Battle");
const Collection = lazyRetry(() => import("@/pages/Collection"), "Collection");
const Dex = lazyRetry(() => import("@/pages/Dex"), "Dex");
const Leaderboard = lazyRetry(() => import("@/pages/Leaderboard"), "Leaderboard");
const Profile = lazyRetry(() => import("@/pages/Profile"), "Profile");
const RobotDetail = lazyRetry(() => import("@/pages/RobotDetail"), "RobotDetail");
const Shop = lazyRetry(() => import("@/pages/Shop"), "Shop");
const Achievements = lazyRetry(() => import("@/pages/Achievements"), "Achievements");
const Premium = lazyRetry(() => import("@/pages/Premium"), "Premium");
const Guide = lazyRetry(() => import("@/pages/Guide"), "Guide");
const HowTo = lazyRetry(() => import("@/pages/HowTo"), "HowTo");
const LandingPage = lazyRetry(() => import("@/pages/LandingPage"), "LandingPage");
const Privacy = lazyRetry(() => import("@/pages/legal/Privacy"), "Privacy");
const Terms = lazyRetry(() => import("@/pages/legal/Terms"), "Terms");
const SpecifiedCommercial = lazyRetry(() => import("@/pages/legal/SpecifiedCommercial"), "SpecifiedCommercial");
const NotFound = lazyRetry(() => import("@/pages/NotFound"), "NotFound");
const Scan = lazyRetry(() => import("@/pages/Scan"), "Scan");
const Workshop = lazyRetry(() => import("@/pages/Workshop"), "Workshop");
const BossBattle = lazyRetry(() => import("@/pages/BossBattle"), "BossBattle");
const Debug = lazyRetry(() => import("@/pages/Debug"), "Debug");

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg p-8">
      <SystemSkeleton
        className="w-full max-w-2xl aspect-video rounded-3xl"
        text="LOADING SECTOR..."
        subtext="STREAMING UNIT DATA FROM GRID"
      />
    </div>
  );
}

function GlobalSoundManager() {
  const { playSE } = useSound();

  useEffect(() => {
    const handleClick = () => {
      playSE("se_click");
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [playSE]);

  return null;
}

function Router() {
  const [location] = useLocation();
  if (import.meta.env.DEV && typeof window !== "undefined") {
    (window as { [key: string]: string | undefined })[DEV_RENDER_PHASE_KEY] = `route:${location}`;
  }

  const withShell = (Component: ComponentType) => () => (
    <AppShell>
      <Component />
    </AppShell>
  );

  return (
    <AnimatePresence mode="wait">
      <PageTransition key={location}>
        <Suspense fallback={<PageLoader />}>
          <Switch location={location}>
            <Route path="/lp" component={LandingPage} />
            <Route path="/privacy" component={Privacy} />
            <Route path="/terms" component={Terms} />
            <Route path="/law" component={SpecifiedCommercial} />
            <Route path="/auth" component={Auth} />
            <Route path="/debug" component={Debug} />

            <Route path="/">
              <ProtectedRoute component={withShell(Home)} />
            </Route>
            <Route path="/dex">
              <ProtectedRoute component={withShell(Dex)} />
            </Route>
            <Route path="/battle">
              <ProtectedRoute component={withShell(Battle)} />
            </Route>
            <Route path="/weekly-boss">
              <ProtectedRoute component={withShell(() => <BossBattle modeOverride="weekly" />)} />
            </Route>
            <Route path="/boss">
              <ProtectedRoute component={withShell(BossBattle)} />
            </Route>
            <Route path="/collection">
              <ProtectedRoute component={withShell(Collection)} />
            </Route>
            <Route path="/shop">
              <ProtectedRoute component={withShell(Shop)} />
            </Route>
            <Route path="/scan">
              <ProtectedRoute component={withShell(Scan)} />
            </Route>
            <Route path="/robots/:robotId">
              {(params) => (
                <ProtectedRoute component={withShell(() => <RobotDetail robotId={params.robotId} />)} />
              )}
            </Route>
            <Route path="/leaderboard">
              <ProtectedRoute component={withShell(Leaderboard)} />
            </Route>
            <Route path="/achievements">
              <ProtectedRoute component={withShell(Achievements)} />
            </Route>
            <Route path="/premium">
              <ProtectedRoute component={withShell(Premium)} />
            </Route>
            <Route path="/profile">
              <ProtectedRoute component={withShell(Profile)} />
            </Route>
            <Route path="/guide">
              <ProtectedRoute component={withShell(Guide)} />
            </Route>
            <Route path="/how-to">
              <ProtectedRoute component={withShell(HowTo)} />
            </Route>
            <Route path="/workshop">
              <ProtectedRoute component={withShell(Workshop)} />
            </Route>
            <Route path="/404" component={NotFound} />
            {/* Final fallback route */}
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </PageTransition>
    </AnimatePresence>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

import { HelmetProvider } from "react-helmet-async";

function App() {
  useVersionCheck();
  const [devCrashNotice, setDevCrashNotice] = useState<string | null>(null);
  const devCrashTimeoutRef = useRef<number | null>(null);
  useEffect(() => {
    const cleanup = registerGlobalErrorHandlers();
    return () => cleanup();
  }, []);
  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === "undefined") return;

    const onError = (event: ErrorEvent) => {
      const phase = (window as { [key: string]: string | undefined })[DEV_RENDER_PHASE_KEY] || "unknown";
      const route = window.location.pathname + window.location.search;
      console.error("[DEV_CRASH] window.onerror", {
        message: event.message,
        stack: event.error?.stack,
        route,
        phase,
      });
      setDevCrashNotice(event.message || "DEV crash");
      if (devCrashTimeoutRef.current) {
        clearTimeout(devCrashTimeoutRef.current);
      }
      devCrashTimeoutRef.current = window.setTimeout(() => setDevCrashNotice(null), 3000);
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error ? reason.stack : undefined;
      const phase = (window as { [key: string]: string | undefined })[DEV_RENDER_PHASE_KEY] || "unknown";
      const route = window.location.pathname + window.location.search;
      console.error("[DEV_CRASH] unhandledrejection", {
        message,
        stack,
        route,
        phase,
      });
      setDevCrashNotice(message || "DEV crash");
      if (devCrashTimeoutRef.current) {
        clearTimeout(devCrashTimeoutRef.current);
      }
      devCrashTimeoutRef.current = window.setTimeout(() => setDevCrashNotice(null), 3000);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      if (devCrashTimeoutRef.current) {
        clearTimeout(devCrashTimeoutRef.current);
      }
    };
  }, []);
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <HelmetProvider>
            <SoundProvider>
              <GlobalSoundManager />
              <ThemeProvider defaultTheme="dark" switchable>
                <HapticProvider>
                  <TooltipProvider delayDuration={0}>
                    <UserDataProvider>
                      <TutorialProvider>
                        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-neon-cyan/30">
                          <OfflineBanner />
                          <TutorialOverlay />
                          {import.meta.env.DEV && devCrashNotice && (
                            <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 rounded bg-red-900/80 px-3 py-1 text-[10px] font-mono text-white shadow-lg">
                              {devCrashNotice}
                            </div>
                          )}
                          <Toaster />
                          <Router />
                        </div>
                      </TutorialProvider>
                    </UserDataProvider>
                  </TooltipProvider>
                </HapticProvider>
              </ThemeProvider>
            </SoundProvider>
          </HelmetProvider>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}


export default App;
