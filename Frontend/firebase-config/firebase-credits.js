import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { app } from "./firebase.js";

const db = getFirestore(app);

/**
 * Ensure the user's credits document exists and has required fields.
 * If fields are missing or deleted, rewrite defaults.
 */
export async function ensureUserCredits(uid) {
  const ref = doc(db, "credits", uid);
  const snap = await getDoc(ref);

  const defaultData = {
    usedCredits: 0,
    maxCredits: 100, // or "unlimited"
    lastUpdated: serverTimestamp(),
  };

  if (!snap.exists()) {
    // Create document with defaults
    await setDoc(ref, defaultData);
  } else {
    // Check for missing fields
    const data = snap.data();
    let needsUpdate = false;

    const updateObj = {};
    if (data.usedCredits === undefined) {
      updateObj.usedCredits = 0;
      needsUpdate = true;
    }
    if (data.maxCredits === undefined) {
      updateObj.maxCredits = 100;
      needsUpdate = true;
    }
    if (needsUpdate) {
      updateObj.lastUpdated = serverTimestamp();
      await updateDoc(ref, updateObj);
    }
  }

  return ref;
}

/**
 * Check if user can use AI (has remaining credits)
 */
export async function canUseCredits(uid) {
  const ref = doc(db, "credits", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return true;

  const { usedCredits, maxCredits } = snap.data();
  if (maxCredits === "unlimited") return true;

  return usedCredits < maxCredits;
}

/**
 * Consume exactly ONE credit
 */
export async function consumeCredit(uid) {
  const ref = doc(db, "credits", uid);
  await updateDoc(ref, {
    usedCredits: increment(1),
    lastUpdated: serverTimestamp(),
  });
}

/**
 * Get credit info
 */
export async function getCreditInfo(uid) {
  const snap = await getDoc(doc(db, "credits", uid));
  return snap.exists() ? snap.data() : null;
}
