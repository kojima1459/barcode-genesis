import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Auth from "@/pages/Auth";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { SoundProvider } from "@/contexts/SoundContext";
import Battle from "@/pages/Battle";
import Collection from "@/pages/Collection";
import Leaderboard from "@/pages/Leaderboard";
import Profile from "@/pages/Profile";
import Home from "@/pages/Home";
import RobotDetail from "@/pages/RobotDetail";
import Shop from "@/pages/Shop";
import Achievements from "@/pages/Achievements";
import Premium from "@/pages/Premium";
import LandingPage from "@/pages/LandingPage";
import Privacy from "@/pages/legal/Privacy";
import Terms from "@/pages/legal/Terms";
import SpecifiedCommercial from "@/pages/legal/SpecifiedCommercial";
import BottomNav from "@/components/BottomNav";

function Router() {
  return (
    <>
      <Switch>
        <Route path="/lp" component={LandingPage} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/law" component={SpecifiedCommercial} />
        <Route path="/auth" component={Auth} />
        <Route path="/" component={Home} />
        <Route path="/battle" component={Battle} />
        <Route path="/collection" component={Collection} />
        <Route path="/shop" component={Shop} />
        <Route path="/robots/:robotId">
          {(params) => <RobotDetail robotId={params.robotId} />}
        </Route>
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/achievements" component={Achievements} />
        <Route path="/premium" component={Premium} />
        <Route path="/profile" component={Profile} />
        <Route path="/404" component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
        <Route component={NotFound} />
      </Switch>
      <BottomNav />
    </>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <SoundProvider>
          <ThemeProvider defaultTheme="dark">
            <AuthProvider>
              <TooltipProvider>
                <Toaster />
                <Router />
              </TooltipProvider>
            </AuthProvider>
          </ThemeProvider>
        </SoundProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
