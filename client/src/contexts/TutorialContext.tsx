import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getDb } from '@/lib/firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';

export type TutorialStep = 'HOME_GENERATE' | 'SCAN_BARCODE' | 'SCAN_RESULT' | 'COMPLETED';

interface TutorialContextType {
    activeStep: TutorialStep;
    isTutorialActive: boolean;
    completeStep: (step: TutorialStep) => void;
    nextStep: () => void;
    skipTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [activeStep, setActiveStep] = useState<TutorialStep>('COMPLETED'); // Default to completed to avoid flash
    const [isTutorialActive, setIsTutorialActive] = useState(false);

    useEffect(() => {
        if (!user) {
            setIsTutorialActive(false);
            return;
        }

        const checkTutorialStatus = async () => {
            // Check if user has already completed tutorial locally (optional optimization)
            const localCompleted = localStorage.getItem(`tutorial_completed_${user.uid}`);
            if (localCompleted) {
                return;
            }

            // Check if user has any robots
            try {
                const q = query(collection(getDb(), 'users', user.uid, 'robots'), limit(1));
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    setIsTutorialActive(true);
                    setActiveStep('HOME_GENERATE');
                } else {
                    // User already has robots, consider tutorial done
                    localStorage.setItem(`tutorial_completed_${user.uid}`, 'true');
                }
            } catch (error) {
                console.error("Failed to check tutorial status:", error);
            }
        };

        checkTutorialStatus();
    }, [user]);

    const nextStep = () => {
        switch (activeStep) {
            case 'HOME_GENERATE':
                setActiveStep('SCAN_BARCODE');
                break;
            case 'SCAN_BARCODE':
                setActiveStep('SCAN_RESULT');
                break;
            case 'SCAN_RESULT':
                completeTutorial();
                break;
        }
    };

    const completeStep = (step: TutorialStep) => {
        if (activeStep === step) {
            nextStep();
        }
    };

    const completeTutorial = () => {
        setIsTutorialActive(false);
        setActiveStep('COMPLETED');
        if (user) {
            localStorage.setItem(`tutorial_completed_${user.uid}`, 'true');
        }
    };

    const skipTutorial = () => {
        completeTutorial();
    };

    return (
        <TutorialContext.Provider value={{
            activeStep,
            isTutorialActive,
            completeStep,
            nextStep,
            skipTutorial
        }}>
            {children}
        </TutorialContext.Provider>
    );
};

export const useTutorial = () => {
    const context = useContext(TutorialContext);
    if (context === undefined) {
        throw new Error('useTutorial must be used within a TutorialProvider');
    }
    return context;
};
