import React, { createContext, useContext, useCallback } from 'react';

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

interface HapticContextType {
    triggerHaptic: (type: HapticType) => void;
}

const HapticContext = createContext<HapticContextType | undefined>(undefined);

export const HapticProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const triggerHaptic = useCallback((type: HapticType) => {
        if (!('vibrate' in navigator)) return;

        try {
            switch (type) {
                case 'light':
                    navigator.vibrate(10); // Very subtle click feel
                    break;
                case 'medium':
                    navigator.vibrate(40); // Standard interaction
                    break;
                case 'heavy':
                    navigator.vibrate(100); // Impact
                    break;
                case 'success':
                    navigator.vibrate([50, 50, 50]); // Da-da-da
                    break;
                case 'warning':
                    navigator.vibrate([30, 100, 30]); // Short-Long-Short
                    break;
                case 'error':
                    navigator.vibrate([50, 100, 50, 100]); // Two heavy pulses
                    break;
            }
        } catch (e) {
            // Ignore errors on devices that don't support vibration or if permission issues
            console.debug('Haptic feedback failed', e);
        }
    }, []);

    return (
        <HapticContext.Provider value={{ triggerHaptic }}>
            {children}
        </HapticContext.Provider>
    );
};

export const useHaptic = () => {
    const context = useContext(HapticContext);
    if (context === undefined) {
        throw new Error('useHaptic must be used within a HapticProvider');
    }
    return context;
};
