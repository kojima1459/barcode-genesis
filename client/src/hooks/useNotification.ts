import { useState, useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, db } from '@/lib/firebase';
import { doc, setDoc, arrayUnion } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useNotification = () => {
    const { user } = useAuth();
    const [permission, setPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = async () => {
        if (!('Notification' in window)) {
            toast.error("This browser does not support desktop notification");
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            setPermission(permission);

            if (permission === 'granted') {
                const token = await getToken(messaging, {
                    vapidKey: 'BM_yRswvlq2WqvqQ9g9Qv6XyqLgQ8gQ8gQ8gQ8gQ8gQ8gQ8gQ8g' // Replace with actual Vapid Key if needed, or remove for auto-fetch
                });

                if (token && user) {
                    await saveTokenToDatabase(token, user.uid);
                    toast.success("Notifications enabled!");
                }
            }
        } catch (error) {
            console.error("Error requesting permission:", error);
            toast.error("Failed to enable notifications");
        }
    };

    const saveTokenToDatabase = async (token: string, uid: string) => {
        const tokenRef = doc(db, 'users', uid, 'fcmTokens', token);
        await setDoc(tokenRef, {
            token,
            createdAt: new Date(),
            device: navigator.userAgent
        });
    };

    // Listen for foreground messages
    useEffect(() => {
        if (permission === 'granted') {
            const unsubscribe = onMessage(messaging, (payload) => {
                console.log('Foreground Message:', payload);
                toast(payload.notification?.title || 'New Message', {
                    description: payload.notification?.body,
                });
            });
            return () => unsubscribe();
        }
    }, [permission]);

    return { permission, requestPermission };
};
