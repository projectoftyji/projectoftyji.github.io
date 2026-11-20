import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAArQI1uSH4pfmeCfhPsQv2iRHKKQj_EkY",
    authDomain: "sonu-janu-chats-cc0f4.firebaseapp.com",
    projectId: "sonu-janu-chats-cc0f4",
    storageBucket: "sonu-janu-chats-cc0f4.firebasestorage.app",
    messagingSenderId: "1081207504966",
    appId: "1:1081207504966:web:9bb336fe06604144eeca47",
    measurementId: "G-YME81NDRK2"
  };

// Firebase Start
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// HTML Elements
const loginForm = document.getElementById("loginForm");
const loginScreen = document.getElementById("loginScreen");
const chatScreen = document.getElementById("chatScreen");
const message = document.getElementById("message");

// Login
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        message.textContent = "Login failed. Please check your details.";
        console.error(error);
    }
});

// Login Status
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginScreen.style.display = "none";
        chatScreen.style.display = "block";
        loadMessages();
    } else {
        loginScreen.style.display = "block";
        chatScreen.style.display = "none";
    }
});

// Load Messages
let unsubscribeMessages;

function loadMessages() {
    if (unsubscribeMessages) unsubscribeMessages();

    const messagesQuery = query(
        collection(db, "messages"),
        orderBy("createdAt", "asc")
    );

    unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
        const chatMessages = document.getElementById("chatMessages");
        chatMessages.innerHTML = "";

        snapshot.forEach((doc) => {
            const data = doc.data();

            const p = document.createElement("p");
            p.textContent = data.text;

            chatMessages.appendChild(p);
        });
    }, (error) => {
        console.error("Message loading error:", error);
    });
}

// Send Message
document.getElementById("sendButton").addEventListener("click", async () => {
    const input = document.getElementById("chatInput");
    const text = input.value.trim();

    if (!text || !auth.currentUser) return;

    try {
        await addDoc(collection(db, "messages"), {
            text: text,
            senderUid: auth.currentUser.uid,
            createdAt: serverTimestamp()
        });

        input.value = "";
    } catch (error) {
        console.error("Message sending error:", error);
    }
});

// Logout
document.getElementById("logoutButton").addEventListener("click", () => {
    signOut(auth);
});