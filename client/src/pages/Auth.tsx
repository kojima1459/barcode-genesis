import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Loader2, ShieldCheck, Cpu, Terminal, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export default function Auth() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, user, loading, authStatus } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();

  // Redirect to home when user becomes authenticated
  useEffect(() => {
    if (user && authStatus === 'authed') {
      console.log('[Auth] User authenticated, redirecting to /');
      setLocation("/");
    }
  }, [user, authStatus, setLocation]);

  // If still loading auth state, show loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1118]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      // Don't setLocation here - useEffect above will handle redirect when user state changes
    } catch (error) {
      console.error("Login failed:", error);
      toast.error("Authentication failed. Please try again.");
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (isSignUp: boolean) => {
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setIsLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      // Don't setLocation here - useEffect above will handle redirect when user state changes
    } catch (error: any) {
      console.error("Auth failed:", error);
      let message = "Authentication failed.";
      if (error.code === 'auth/invalid-credential') message = "Invalid email or password.";
      if (error.code === 'auth/email-already-in-use') message = "Email already registered.";
      if (error.code === 'auth/weak-password') message = "Password is too weak.";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#121a26] via-[#0b1118] to-[#070a10] font-sans text-foreground">
      {/* ... backgrounds ... */}
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 pointer-events-none"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      {/* ... orbs ... */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent2/20 rounded-full blur-[100px] animate-pulse-slow font-orbitron"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[120px] animate-pulse-slow delay-1000"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md p-6"
      >
        {/* Terminal Window Frame */}
        <div className="relative bg-panel/80 backdrop-blur-xl border border-border/60 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          {/* Header Bar */}
          <div className="h-10 bg-panel/60 border-b border-border/60 flex items-center px-4 justify-between">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
            </div>
            <div className="text-[10px] font-mono text-muted tracking-[0.12em]">
              Secure Access Protocol v9.2
            </div>
          </div>

          <div className="p-8 flex flex-col items-center text-center space-y-6">
            {/* Logo/Icon Area */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="relative w-24 h-24 bg-linear-to-br from-cyan-500/20 to-purple-500/20 rounded-full flex items-center justify-center border border-white/10 group"
            >
              <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <Cpu className="w-10 h-10 text-accent drop-shadow-[0_0_10px_rgba(62,208,240,0.4)]" />
              <div className="absolute inset-0 border border-cyan-500/30 rounded-full border-t-transparent animate-[spin_3s_linear_infinite]"></div>
            </motion.div>

            {/* Titles */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <h1 className="text-3xl font-semibold font-orbitron tracking-tight bg-clip-text text-transparent bg-linear-to-r from-white via-white to-white/70">
                System Login
              </h1>
              <p className="text-sm text-muted font-mono">
                Identity verification required for Genesis Layer access.
              </p>
            </motion.div>

            {/* Google Login Button */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="w-full"
            >
              <Button
                size="lg"
                className="w-full h-14 relative group overflow-hidden bg-panel/70 hover:bg-panel border border-border/60 hover:border-accent/50 transition-all duration-300"
                onClick={handleLogin}
                disabled={isLoading}
              >
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                <div className="flex items-center justify-center gap-3">
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-accent" />
                  ) : (
                    <div className="p-1 bg-white rounded-full">
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                    </div>
                  )}
                  <span className="font-orbitron tracking-[0.12em] text-sm font-semibold">
                    {isLoading ? "AUTHENTICATING..." : "SSO ACCESS"}
                  </span>
                </div>
              </Button>
            </motion.div>

            {/* Divider */}
            <div className="flex items-center w-full gap-2">
              <div className="h-[1px] bg-white/10 flex-1"></div>
              <span className="text-[10px] text-muted font-mono">MANUAL OVERRIDE</span>
              <div className="h-[1px] bg-white/10 flex-1"></div>
            </div>

            {/* Email/Pass Form */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="w-full space-y-3"
            >
              <Input
                type="email"
                placeholder="OPERATOR ID (EMAIL)"
                className="bg-panel/60 border-border/60 text-center font-mono text-sm h-10 focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all placeholder:text-muted/60"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                data-testid="email-input"
              />
              <Input
                type="password"
                placeholder="ACCESS CODE (PASSWORD)"
                className="bg-panel/60 border-border/60 text-center font-mono text-sm h-10 focus:border-accent/50 focus:ring-1 focus:ring-accent/50 transition-all placeholder:text-muted/60"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                data-testid="password-input"
              />
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 h-10 bg-panel/60 border-border/60 hover:bg-panel hover:text-accent font-mono text-xs"
                  onClick={() => handleEmailAuth(false)}
                  disabled={isLoading}
                  data-testid="login-button"
                >
                  LOGIN
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-10 bg-panel/60 border-border/60 hover:bg-panel hover:text-accent font-mono text-xs"
                  onClick={() => handleEmailAuth(true)}
                  disabled={isLoading}
                  data-testid="signup-button"
                >
                  REGISTER
                </Button>
              </div>
            </motion.div>

            {/* Status Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-2 text-[10px] text-emerald-300/80 font-mono bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              SERVER STATUS: ONLINE
            </motion.div>

          </div>
        </div>

        {/* Disclaimer */}
        <p className="mt-6 text-center text-[10px] text-muted font-mono">
          UNAUTHORIZED ACCESS IS PROHIBITED BY PROTOCOL 7734.<br />
          ALL ACTIVITIES ARE MONITORED.
        </p>
      </motion.div>
    </div>
  );
}
