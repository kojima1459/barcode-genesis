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
import BottomNav from "@/components/BottomNav";
import { useEffect, lazy, Suspense } from "react";
import { AnimatePresence } from "framer-motion";
import PageTransition from "@/components/PageTransition";
import OfflineBanner from "@/components/OfflineBanner";
import { Loader2 } from "lucide-react";

// Lazy load pages for better performance
const Home = lazy(() => import("@/pages/Home"));
const Auth = lazy(() => import("@/pages/Auth"));
const Battle = lazy(() => import("@/pages/Battle"));
const Collection = lazy(() => import("@/pages/Collection"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
const Profile = lazy(() => import("@/pages/Profile"));
const RobotDetail = lazy(() => import("@/pages/RobotDetail"));
const Shop = lazy(() => import("@/pages/Shop"));
const Achievements = lazy(() => import("@/pages/Achievements"));
const Premium = lazy(() => import("@/pages/Premium"));
const Guide = lazy(() => import("@/pages/Guide"));
const LandingPage = lazy(() => import("@/pages/LandingPage"));
const Privacy = lazy(() => import("@/pages/legal/Privacy"));
const Terms = lazy(() => import("@/pages/legal/Terms"));
const SpecifiedCommercial = lazy(() => import("@/pages/legal/SpecifiedCommercial"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Scan = lazy(() => import("@/pages/Scan"));
const Workshop = lazy(() => import("@/pages/Workshop"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg">
      <Loader2 className="w-8 h-8 text-neon-cyan animate-spin" />
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

  return (
    <>
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
                <ProtectedRoute component={Home} />
              </Route>
              <Route path="/battle">
                <ProtectedRoute component={Battle} />
              </Route>
              <Route path="/collection">
                <ProtectedRoute component={Collection} />
              </Route>
              <Route path="/shop">
                <ProtectedRoute component={Shop} />
              </Route>
              <Route path="/scan">
                <ProtectedRoute component={Scan} />
              </Route>
              <Route path="/robots/:robotId">
                {(params) => (
                  <ProtectedRoute component={() => <RobotDetail robotId={params.robotId} />} />
                )}
              </Route>
              <Route path="/leaderboard">
                <ProtectedRoute component={Leaderboard} />
              </Route>
              <Route path="/achievements">
                <ProtectedRoute component={Achievements} />
              </Route>
              <Route path="/premium">
                <ProtectedRoute component={Premium} />
              </Route>
              <Route path="/profile">
                <ProtectedRoute component={Profile} />
              </Route>
              <Route path="/guide">
                <ProtectedRoute component={Guide} />
              </Route>
              <Route path="/workshop">
                <ProtectedRoute component={Workshop} />
              </Route>
              <Route path="/404" component={NotFound} />
              {/* Final fallback route */}
              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </PageTransition>
      </AnimatePresence>
      <BottomNav />
    </>
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
                      <div className="min-h-screen bg-background text-foreground font-sans selection:bg-neon-cyan/30">
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
