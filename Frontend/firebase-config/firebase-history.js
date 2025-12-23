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
 * @param {string} userId
 * @param {string} userMessage
 * @param {string} aiReply
 * @param {boolean} forceNew - if true, create a new chat document instead of appending
 */
// firebase-history.js
let currentChatDocId = null; // tracks current conversation globally

export async function saveChatToHistory(
  userId,
  userMessage,
  aiReply,
  forceNew = false,
  options = {} // { mode: "chat"|"detect"|"humanize", metadata: {} }
) {
  try {
    if (!userId) return;

    const { mode = "chat", metadata = {} } = options;

    const historyRef = collection(db, "history", userId, "chats");
    const title =
      (userMessage || "").length > 40
        ? userMessage.substring(0, 40) + "..."
        : userMessage || "Conversation";

    const messageEntry = {
      sender: "user",
      text: userMessage,
      timestamp: new Date().toISOString(),
      mode,
      metadata,
    };

    const aiMessageEntry = {
      sender: "ai",
      text: aiReply,
      timestamp: new Date().toISOString(),
      mode,
      metadata,
    };

    // 🔹 Force a new conversation or if no current doc
    if (forceNew || !currentChatDocId) {
      const docRef = await addDoc(historyRef, {
        title,
        messages: [messageEntry, aiMessageEntry],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMode: mode,
      });
      currentChatDocId = docRef.id;
      console.log("✨ New conversation created with ID:", currentChatDocId);
      return;
    }

    // 🔹 Append to existing conversation
    const docRef = doc(db, "history", userId, "chats", currentChatDocId);
    const docSnap = await getDoc(docRef);
    const oldMessages = docSnap.exists() ? docSnap.data().messages || [] : [];

    await updateDoc(docRef, {
      messages: [...oldMessages, messageEntry, aiMessageEntry],
      updatedAt: serverTimestamp(),
      lastMode: mode,
    });

    console.log("✅ Chat appended successfully to doc ID:", currentChatDocId);
  } catch (err) {
    console.error("🔥 Error saving chat:", err);
  }
}

// Optional helper to reset current chat when starting a new conversation
export function resetCurrentChatDoc() {
  currentChatDocId = null;
}


/**
 * Get latest conversation messages for a user (most recent chat doc)
 * @param {string} userId
 * @returns {Array|null}
 */
export async function getLatestChat(userId) {
  try {
    if (!userId) return null;

    const historyRef = collection(db, "history", userId, "chats");
    const q = query(historyRef, orderBy("createdAt", "desc"), limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const lastDoc = snapshot.docs[0];
      currentChatDocId = lastDoc.id;  // 🔹 track the current chat globally
      return lastDoc.data().messages || [];
    }

    return null;
  } catch (err) {
    console.error("🔥 Error retrieving latest chat:", err);
    return null;
  }
}


/**
 * Save full chat session (when starting new chat or saving explicitly)
 */
export async function saveFullChatSession(uid, messages) {
  if (!uid || !messages || messages.length === 0) return;

  try {
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

/**
 * Return list of chat documents for a user
 */
export async function getAllChats(userId) {
  try {
    if (!userId) {
      console.warn("⚠️ No userId provided to getAllChats()");
      return [];
    }

    const historyRef = collection(db, "history", userId, "chats");
    const q = query(historyRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    const chats = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    return chats;
  } catch (error) {
    console.error("🔥 Error fetching chats:", error);
    return [];
  }
}

/**
 * Get single chat document and normalize messages for UI
 */
export async function getChatById(userUID, chatId) {
  if (!userUID || !chatId) {
    console.error("❌ Missing userUID or chatId");
    return null;
  }

  try {
    const chatRef = doc(db, "history", userUID, "chats", chatId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
      console.warn("⚠️ No such chat:", chatId);
      return null;
    }

    const chatData = chatSnap.data();
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

