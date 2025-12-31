import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { HapticProvider } from "@/contexts/HapticContext";
import { TutorialProvider } from "@/contexts/TutorialContext";
import TutorialOverlay from "@/components/TutorialOverlay";
import { SoundProvider, useSound } from "@/contexts/SoundContext";
import { useEffect, lazy, Suspense, type ComponentType, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import OfflineBanner from "@/components/OfflineBanner";
import { Loader2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import { SystemSkeleton } from "@/components/ui/SystemSkeleton";

// Lazy load pages for better performance
const Home = lazy(() => import("@/pages/Home"));
const Auth = lazy(() => import("@/pages/Auth"));
const Battle = lazy(() => import("@/pages/Battle"));
const Collection = lazy(() => import("@/pages/Collection"));
const Dex = lazy(() => import("@/pages/Dex"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
const Profile = lazy(() => import("@/pages/Profile"));
const RobotDetail = lazy(() => import("@/pages/RobotDetail"));
const Shop = lazy(() => import("@/pages/Shop"));
const Achievements = lazy(() => import("@/pages/Achievements"));
const Premium = lazy(() => import("@/pages/Premium"));
const Guide = lazy(() => import("@/pages/Guide"));
const HowTo = lazy(() => import("@/pages/HowTo"));
const LandingPage = lazy(() => import("@/pages/LandingPage"));
const Privacy = lazy(() => import("@/pages/legal/Privacy"));
const Terms = lazy(() => import("@/pages/legal/Terms"));
const SpecifiedCommercial = lazy(() => import("@/pages/legal/SpecifiedCommercial"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Scan = lazy(() => import("@/pages/Scan"));
const Workshop = lazy(() => import("@/pages/Workshop"));
const BossBattle = lazy(() => import("@/pages/BossBattle"));

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

            <Route path="/">
              <ProtectedRoute component={withShell(Home)} />
            </Route>
            <Route path="/dex">
              <ProtectedRoute component={withShell(Dex)} />
            </Route>
            <Route path="/battle">
              <ProtectedRoute component={withShell(Battle)} />
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
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <HelmetProvider>
          <SoundProvider>
            <GlobalSoundManager />
            <ThemeProvider defaultTheme="dark" switchable>
              <HapticProvider>
                <TooltipProvider delayDuration={0}>
                  <AuthProvider>
                    <TutorialProvider>
                      <div className="min-h-screen bg-bg text-text font-sans selection:bg-neon-cyan/30">
                        <OfflineBanner />
                        <TutorialOverlay />
                        <Toaster />
                        <Router />
                      </div>
                    </TutorialProvider>
                  </AuthProvider>
                </TooltipProvider>
              </HapticProvider>
            </ThemeProvider>
          </SoundProvider>
        </HelmetProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}


export default App;
