import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Scan, Sword, Trophy } from "lucide-react";

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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl mb-2">
            {step === 0 && t('tutorial_welcome_title')}
            {step === 1 && t('tutorial_step1_title')}
            {step === 2 && t('tutorial_step2_title')}
            {step === 3 && t('tutorial_step3_title')}
          </DialogTitle>
          <DialogDescription className="text-center text-lg">
            {step === 0 && t('tutorial_welcome_desc')}
            {step === 1 && t('tutorial_step1_desc')}
            {step === 2 && t('tutorial_step2_desc')}
            {step === 3 && t('tutorial_step3_desc')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center py-8">
          {step === 0 && <div className="text-6xl">🤖</div>}
          {step === 1 && <div className="p-6 rounded-full bg-primary/10 text-primary"><Scan className="w-16 h-16" /></div>}
          {step === 2 && <div className="p-6 rounded-full bg-destructive/10 text-destructive"><Sword className="w-16 h-16" /></div>}
          {step === 3 && <div className="p-6 rounded-full bg-yellow-500/10 text-yellow-500"><Trophy className="w-16 h-16" /></div>}
        </div>

        <DialogFooter className="sm:justify-center">
          <Button onClick={handleNext} size="lg" className="w-full sm:w-auto">
            {step < 3 ? t('next') : t('tutorial_start')}
          </Button>
        </DialogFooter>
        
        <div className="flex justify-center gap-2 mt-4">
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={`w-2 h-2 rounded-full ${i === step ? 'bg-primary' : 'bg-secondary'}`}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
