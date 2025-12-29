importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyBV5GUqsQTsHM9PxZbwnirS2FSUNV6k4z4",
    authDomain: "barcodegame-42858.firebaseapp.com",
    projectId: "barcodegame-42858",
    storageBucket: "barcodegame-42858.firebasestorage.app",
    messagingSenderId: "568442609396",
    appId: "1:568442609396:web:94efd24ef8a6f39c6708a1",
    measurementId: "G-Q69RL7BNFQ"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon-192.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
