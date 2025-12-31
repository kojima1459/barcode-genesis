import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Scan, Sword, Trophy, Zap, Cpu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function TutorialModal() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem("hasSeenTutorial");
    if (!hasSeenTutorial) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("hasSeenTutorial", "true");
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const currentIcon = () => {
    switch (step) {
      case 0: return <Cpu className="w-24 h-24 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]" />;
      case 1: return <Scan className="w-24 h-24 text-purple-400 drop-shadow-[0_0_15px_rgba(192,132,252,0.8)]" />;
      case 2: return <Sword className="w-24 h-24 text-red-400 drop-shadow-[0_0_15px_rgba(248,113,113,0.8)]" />;
      case 3: return <Trophy className="w-24 h-24 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]" />;
      default: return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent showCloseButton={false} className="sm:max-w-md bg-black/90 border border-white/10 text-white backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] p-0 overflow-hidden gap-0">

        {/* Custom Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-50 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground text-white"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/50 via-black to-black pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-cyan-500 to-transparent opacity-50" />
        <div className="absolute bottom-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-purple-500 to-transparent opacity-50" />

        <div className="relative z-10 flex flex-col items-center justify-center p-8 pt-12 min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center w-full"
            >
              <div className="mb-8 relative">
                <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full transform scale-150" />
                {currentIcon()}
              </div>

              <DialogHeader className="mb-4 space-y-4">
                <DialogTitle className="text-center text-3xl font-bold font-orbitron tracking-wider bg-clip-text text-transparent bg-linear-to-r from-white via-cyan-200 to-white">
                  {step === 0 && t('tutorial_welcome_title')}
                  {step === 1 && t('tutorial_step1_title')}
                  {step === 2 && t('tutorial_step2_title')}
                  {step === 3 && t('tutorial_step3_title')}
                </DialogTitle>
                <DialogDescription className="text-center text-lg text-slate-400 leading-relaxed max-w-sm mx-auto">
                  {step === 0 && t('tutorial_welcome_desc')}
                  {step === 1 && t('tutorial_step1_desc')}
                  {step === 2 && t('tutorial_step2_desc')}
                  {step === 3 && t('tutorial_step3_desc')}
                </DialogDescription>
              </DialogHeader>
            </motion.div>
          </AnimatePresence>
        </div>

        <DialogFooter className="relative z-10 p-6 pt-0 sm:justify-center flex-col gap-6">
          <div className="flex justify-center gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`transition-all duration-300 rounded-full ${i === step
                  ? 'w-8 h-2 bg-linear-to-r from-cyan-400 to-purple-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]'
                  : 'w-2 h-2 bg-white/20'
                  }`}
              />
            ))}
          </div>

          <Button
            onClick={handleNext}
            size="lg"
            className="w-full h-14 rounded-full text-lg font-bold bg-white text-black hover:bg-cyan-50 transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
          >
            {step < 3 ? (
              <span className="flex items-center gap-2">
                {t('next')} <Zap className="w-4 h-4" />
              </span>
            ) : (
              <span className="flex items-center gap-2">
                {t('tutorial_start')} <Cpu className="w-4 h-4" />
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
