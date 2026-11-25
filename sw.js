importScripts("https://www.gstatic.com/firebasejs/12.6.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.6.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAArQI1uSH4pfmeCfhPsQv2iRHKKQj_EkY",
  authDomain: "sonu-janu-chats-cc0f4.firebaseapp.com",
  projectId: "sonu-janu-chats-cc0f4",
  storageBucket: "sonu-janu-chats-cc0f4.firebasestorage.app",
  messagingSenderId: "1081207504966",
  appId: "1:1081207504966:web:9bb336fe06604144eeca47",
  measurementId: "G-YME81NDRK2"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "New Message";

  self.registration.showNotification(title, {
    body: payload.notification?.body || "You have a new message.",
    icon: "./icon-192.png",
    badge: "./icon-192.png"
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow("./")
  );
});