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
  deleteDoc,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const db = getFirestore(app);
let currentChatDocId = null;

export function getCurrentChatDocId() {
  return currentChatDocId;
}

export function setCurrentChatDocId(id) {
  currentChatDocId = id || null;
}

export function resetCurrentChatDoc() {
  currentChatDocId = null;
}

export async function saveChatToHistory(
  userId,
  userMessage,
  aiReply,
  forceNew = false,
  options = {} // { mode, metadata, chatId }
) {
  try {
    if (!userId) return null;

    const { mode = "chat", metadata = {}, chatId = null } = options;

    const historyRef = collection(db, "history", userId, "chats");

    const userText = (userMessage || "").trim();
    const titleBase =
      userText.length > 0
        ? userText
        : mode === "detect"
        ? "AI Detection"
        : mode === "humanize"
        ? "Humanizer"
        : "Conversation";

    const title = titleBase.length > 40 ? titleBase.substring(0, 40) + "..." : titleBase;

    // ✅ FIX: timestamps inside arrays must NOT be serverTimestamp()
    const now = Date.now();

    const userEntry = {
      sender: "user",
      text: userMessage || "",
      createdAt: now, // ✅ number is allowed in arrays
      mode,
      metadata,
    };

    const aiEntry = {
      sender: "ai",
      text: aiReply || "",
      createdAt: now, // ✅ number is allowed in arrays
      mode,
      metadata,
    };

    // ✅ Create new doc if forced OR no chatId
    if (forceNew || !chatId) {
      const docRef = await addDoc(historyRef, {
        title,
        messages: [userEntry, aiEntry],
        createdAt: serverTimestamp(),  // ✅ top-level ok
        updatedAt: serverTimestamp(),  // ✅ top-level ok
        lastMode: mode,
      });

      return docRef.id;
    }

    // ✅ Ordered + race-safe append using transaction
    const docRef = doc(db, "history", userId, "chats", chatId);

    const finalChatId = await runTransaction(db, async (tx) => {
      const snap = await tx.get(docRef);

      // If doc missing, recreate it
      if (!snap.exists()) {
        tx.set(docRef, {
          title,
          messages: [userEntry, aiEntry],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMode: mode,
        });
        return chatId;
      }

      const data = snap.data();
      const oldMessages = Array.isArray(data.messages) ? data.messages : [];

      tx.update(docRef, {
        messages: [...oldMessages, userEntry, aiEntry], // ✅ order preserved
        updatedAt: serverTimestamp(),                  // ✅ allowed
        lastMode: mode,
      });

      return chatId;
    });

    return finalChatId;
  } catch (err) {
    console.error("🔥 Error saving chat:", err);
    return null;
  }
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

      currentChatDocId = lastDoc.id;

      return {
        chatId: lastDoc.id,
        messages: lastDoc.data().messages || [],
      };
    }

    currentChatDocId = null;
    return null;
  } catch (err) {
    console.error("🔥 Error retrieving latest chat:", err);
    currentChatDocId = null;
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
      content: msg.text || "",
      mode: msg.mode || "chat",
      metadata: msg.metadata || {},
      // Firestore Timestamp -> millis (safe), fallback null
      createdAt: typeof msg.createdAt === "number"
  ? msg.createdAt
  : msg.createdAt?.toMillis
  ? msg.createdAt.toMillis()
  : null,
    }));

    return { id: chatId, ...chatData, messages };
  } catch (err) {
    console.error("🔥 Error fetching chat by ID:", err);
    return null;
  }
}


export async function deleteChatHistory(userUID, chatId) {
  if (!userUID || !chatId) return;

  try {
    const chatRef = doc(db, "history", userUID, "chats", chatId);
    await deleteDoc(chatRef);
    console.log("🗑 Chat deleted:", chatId);
  } catch (err) {
    console.error("❌ Failed to delete chat:", err);
  }
}
