// firebase-history.js
import { app } from "./firebase.js";
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const db = getFirestore(app);

/**
 * Save or update a user's chat history in Firestore.
 * @param {string} userId - The UID of the logged-in user
 * @param {string} userMessage - The message sent by the user
 * @param {string} aiReply - The AI's response
 */

export async function saveChatToHistory(userId, userMessage, aiReply, forceNew = false) {
  try {
    if (!userId) {
      console.warn("⚠️ No user logged in. Skipping history save.");
      return;
    }

    const historyRef = collection(db, "history", userId, "chats");
    const title = userMessage.length > 40 ? userMessage.substring(0, 40) + "..." : userMessage;

    if (forceNew) {
      // 🆕 Always create a fresh document
      await addDoc(historyRef, {
        title,
        messages: [
          { sender: "user", text: userMessage, timestamp: new Date().toISOString() },
          { sender: "ai", text: aiReply, timestamp: new Date().toISOString() },
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log("✨ New conversation created!");
      return;
    }

    // Otherwise continue last chat as usual
    const q = query(historyRef, orderBy("createdAt", "desc"), limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const lastChat = snapshot.docs[0];
      await updateDoc(doc(historyRef, lastChat.id), {
        messages: [
          ...lastChat.data().messages,
          { sender: "user", text: userMessage, timestamp: new Date().toISOString() },
          { sender: "ai", text: aiReply, timestamp: new Date().toISOString() },
        ],
        updatedAt: serverTimestamp(),
      });
    } else {
      // No previous chat — create one
      await addDoc(historyRef, {
        title,
        messages: [
          { sender: "user", text: userMessage, timestamp: new Date().toISOString() },
          { sender: "ai", text: aiReply, timestamp: new Date().toISOString() },
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    console.log("✅ Chat saved successfully!");
  } catch (err) {
    console.error("🔥 Error saving chat:", err);
  }
}



/**
 * Fetch the latest conversation for a user.
 * @param {string} userId - The UID of the logged-in user
 * @returns {Array|null} The latest chat messages or null if none
 */
export async function getLatestChat(userId) {
  try {
    if (!userId) return null;

    const historyRef = collection(db, "history", userId, "chats");
    const q = query(historyRef, orderBy("createdAt", "desc"), limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const lastChat = snapshot.docs[0].data();
      return lastChat.messages;
    }

    return null;
  } catch (err) {
    console.error("🔥 Error retrieving latest chat:", err);
    return null;
  }
}


// 🧠 Function to save full chat session (when "New Chat" is clicked)
export async function saveFullChatSession(uid, messages) {
  if (!uid || !messages || messages.length === 0) return;

  try {
    // Create a short auto-title (based on first user message)
    const firstUserMessage = messages.find(m => m.sender === "user")?.text || "Conversation";
    const title = firstUserMessage.length > 30 ? firstUserMessage.slice(0, 30) + "..." : firstUserMessage;

    const sessionRef = doc(collection(db, "history", uid, "sessions"));
    await setDoc(sessionRef, {
      title,
      messages,
      createdAt: serverTimestamp()
    });

    console.log("✅ Chat session saved:", title);
  } catch (error) {
    console.error("❌ Failed to save full chat session:", error);
  }
}



export async function getAllChats(userId) {
  try {
    if (!userId) {
      console.warn("⚠️ No userId provided to getAllChats()");
      return [];
    }

    console.log("📜 Fetching chats for user:", userId);

    const historyRef = collection(db, "history", userId, "chats");
    const q = query(historyRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    const chats = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log("✅ Fetched chats:", chats);
    return chats;
  } catch (error) {
    console.error("🔥 Error fetching chats:", error);
    return [];
  }
}


export async function getChatById(userUID, chatId) {
  if (!userUID || !chatId) {
    console.error("❌ Missing userUID or chatId");
    return null;
  }

  try {
    // ✅ Correct Firestore path based on your structure
    const chatRef = doc(db, "history", userUID, "chats", chatId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
      console.warn("⚠️ No such chat:", chatId);
      return null;
    }

    const chatData = chatSnap.data();

    // 🧩 Reconstruct messages properly
    const messages = (chatData.messages || []).map((msg) => ({
      role: msg.sender === "user" ? "user" : "ai",
      content: msg.text,
    }));

    return { id: chatId, ...chatData, messages };
  } catch (err) {
    console.error("🔥 Error fetching chat by ID:", err);
    return null;
  }
}

