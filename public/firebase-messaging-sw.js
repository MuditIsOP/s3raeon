// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
// We have to hardcode keys here or use a specific loader because SW doesn't access Vite env vars easily.
// For simplicity in this static deployment, we will hardcode the config the user provided.
// Since these keys are technically public-identifiable and restricted by domain, it's generally okay for this specific use case.

firebase.initializeApp({
    apiKey: "AIzaSyB22nTmS3Hl5tXMGzWjhyFrO2qNGdHxjn8",
    authDomain: "s3raeon.firebaseapp.com",
    projectId: "s3raeon",
    storageBucket: "s3raeon.firebasestorage.app",
    messagingSenderId: "39476696846",
    appId: "1:39476696846:web:872ab40e642934968f695f"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    // Customize notification here
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/s3raeon-icon.svg', // Use our app icon
        badge: '/s3raeon-icon.svg'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
