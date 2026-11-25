import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyAArQI1uSH4pfmeCfhPsQv2iRHKKQj_EkY",
  authDomain: "sonu-janu-chats-cc0f4.firebaseapp.com",
  projectId: "sonu-janu-chats-cc0f4",
  storageBucket: "sonu-janu-chats-cc0f4.firebasestorage.app",
  messagingSenderId: "1081207504966",
  appId: "1:1081207504966:web:9bb336fe06604144eeca47",
  measurementId: "G-YME81NDRK2"
};

const ALLOWED_USERS = {
  "mfAd2zpKk4Vw4twhaIqI7ch25G82": "Sonu",
  "9PCC9vJREzTlO7VRo5azZk5nGju1": "Janu"
};
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = id => document.getElementById(id);

let unsubscribeMessages = null;
let unsubscribePresence = null;
let heartbeatTimer = null;

$("togglePassword").addEventListener("click", () => {
  const input = $("password");
  input.type = input.type === "password" ? "text" : "password";
  $("togglePassword").setAttribute("aria-label", input.type === "password" ? "Show password" : "Hide password");
});

$("loginForm").addEventListener("submit", async event => {
  event.preventDefault();
  $("message").textContent = "Checking secure access…";
  try {
    await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
    $("message").textContent = "";
  } catch (error) {
    $("message").textContent = "Login Error: " + error.code;
    console.error(error);
  }
});

onAuthStateChanged(auth, user => {
  if (user) {
    $("loginScreen").style.display = "none";
    $("chatScreen").style.display = "grid";
    startChat(user);
  } else {
    stopLiveListeners();
    $("loginScreen").style.display = "flex";
    $("chatScreen").style.display = "none";
  }
});

function formatTime(timestamp) {
  if (!timestamp?.toDate) return "Sending…";
  return timestamp.toDate().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true });
}
function formatDate(timestamp) {
  if (!timestamp?.toDate) return "";
  return timestamp.toDate().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });
}
function setPresenceUI(isOnline, lastSeen) {
  const label = isOnline ? "Online" : (lastSeen?.toDate ? `Last seen ${formatTime(lastSeen)}` : "Offline");
  $("headerPresence").textContent = label;
  $("sidebarPresence").textContent = label;
  $("headerDot").classList.toggle("online", isOnline);
  $("sidebarDot").classList.toggle("online", isOnline);
}
async function updateMyPresence(status = "online") {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await setDoc(doc(db, "presence", user.uid), {
      name: ALLOWED_USERS[user.uid] || "Member",
      status,
      lastSeen: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.warn("Presence update failed. Check Firestore rules.", error);
  }
}
function startPresence() {
  updateMyPresence("online");
  heartbeatTimer = setInterval(() => updateMyPresence("online"), 30000);
  const otherUid = Object.keys(ALLOWED_USERS).find(uid => uid !== auth.currentUser?.uid);
  if (unsubscribePresence) unsubscribePresence();
  if (otherUid) {
    unsubscribePresence = onSnapshot(doc(db, "presence", otherUid), snapshot => {
      const data = snapshot.data();
      const recent = data?.lastSeen?.toDate && (Date.now() - data.lastSeen.toDate().getTime() < 90000);
      setPresenceUI(Boolean(data?.status === "online" && recent), data?.lastSeen);
    }, error => {
      console.warn("Presence read failed. Check Firestore rules.", error);
      setPresenceUI(false, null);
    });
  }
}
function stopLiveListeners() {
  if (unsubscribeMessages) unsubscribeMessages();
  if (unsubscribePresence) unsubscribePresence();
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  unsubscribeMessages = unsubscribePresence = heartbeatTimer = null;
}
function startChat(user) {
  startPresence();
  const messagesQuery = query(collection(db, "messages"), orderBy("createdAt", "asc"));
  if (unsubscribeMessages) unsubscribeMessages();
  unsubscribeMessages = onSnapshot(messagesQuery, snapshot => {
    const container = $("chatMessages");
    container.replaceChildren();
    let previousDate = "";
    snapshot.forEach(messageDoc => {
      const data = messageDoc.data();
      const dateLabel = formatDate(data.createdAt);
      if (dateLabel && dateLabel !== previousDate) {
        const divider = document.createElement("div");
        divider.className = "date-divider";
        divider.textContent = dateLabel;
        container.appendChild(divider);
        previousDate = dateLabel;
      }
      const mine = data.senderUid === user.uid;
      const row = document.createElement("div");
      row.className = "message-row" + (mine ? " mine" : "");
      const bubble = document.createElement("div");
      bubble.className = "message-bubble";
      bubble.textContent = data.text || "";
      const meta = document.createElement("div");
      meta.className = "message-meta";
      const time = document.createElement("span");
      time.textContent = formatTime(data.createdAt);
      const deleteButton = document.createElement("button");
      deleteButton.className = "delete-message";
      deleteButton.type = "button";
      deleteButton.textContent = "Delete";
      deleteButton.setAttribute("aria-label", "Delete this message");
      deleteButton.addEventListener("click", async () => {
        if (!confirm("Delete this message for both people?")) return;
        try {
          await deleteDoc(doc(db, "messages", messageDoc.id));
        } catch (error) {
          console.error("Delete failed:", error);
          alert("Could not delete. Check Firestore security rules.");
        }
      });
      meta.append(time, deleteButton);
      row.append(bubble, meta);
      container.appendChild(row);
    });
    if (!snapshot.size) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Your private conversation starts here.";
      container.appendChild(empty);
    }
    container.scrollTop = container.scrollHeight;
  }, error => console.error("Message loading error:", error));
}

$("chatForm").addEventListener("submit", async event => {
  event.preventDefault();
  const input = $("chatInput");
  const text = input.value.trim();
  if (!text || !auth.currentUser) return;
  $("sendButton").disabled = true;
  try {
    await addDoc(collection(db, "messages"), {
      text,
      senderUid: auth.currentUser.uid,
      createdAt: serverTimestamp()
    });
    input.value = "";
  } catch (error) {
    console.error("Message sending error:", error);
    alert("Message could not be sent. Check your connection and Firestore rules.");
  } finally {
    $("sendButton").disabled = false;
    input.focus();
  }
});

$("logoutButton").addEventListener("click", async () => {
  await updateMyPresence("offline");
  try { await signOut(auth); }
  catch (error) { console.error("Logout error:", error); }
});
window.addEventListener("pagehide", () => {
  // Best-effort status update; browser may stop network requests during page close.
  updateMyPresence("offline");
});
// Register Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./sw.js");
      console.log("Service Worker registered:", registration.scope);
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  });
}
