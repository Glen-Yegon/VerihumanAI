import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { app } from "./firebase.min.js";

const db = getFirestore(app);

/**
 * Ensure the user's credits document exists and has required fields.
 * If fields are missing, rewrite safe defaults.
 */
export async function ensureUserCredits(uid) {
  const ref = doc(db, "credits", uid);
  const snap = await getDoc(ref);

  const defaultData = {
    usedCredits: 0,
    maxCredits: 10,
    lastUpdated: serverTimestamp(),
  };

  if (!snap.exists()) {
    await setDoc(ref, defaultData);
  } else {
    const data = snap.data() || {};
    const updateObj = {};
    let needsUpdate = false;

    if (typeof data.usedCredits !== "number") {
      updateObj.usedCredits = 0;
      needsUpdate = true;
    }

    if (typeof data.maxCredits !== "number") {
      updateObj.maxCredits = 10;
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
 * Check if user still has remaining credits
 */
export async function canUseCredits(uid) {
  const ref = await ensureUserCredits(uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return false;

  const data = snap.data() || {};
  const usedCredits = Number(data.usedCredits || 0);
  const maxCredits = Number(data.maxCredits || 0);

  return usedCredits < maxCredits;
}

/**
 * Consume exactly one credit
 */
export async function consumeCredit(uid) {
  const ref = await ensureUserCredits(uid);

  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error("Credits document does not exist.");
  }

  const data = snap.data() || {};
  const usedCredits = Number(data.usedCredits || 0);
  const maxCredits = Number(data.maxCredits || 0);

  if (usedCredits >= maxCredits) {
    throw new Error("No credits remaining.");
  }

  await updateDoc(ref, {
    usedCredits: increment(1),
    lastUpdated: serverTimestamp(),
  });
}

/**
 * Add purchased credits
 */
export async function addCredits(uid, creditsToAdd) {
  const ref = await ensureUserCredits(uid);

  const amount = Number(creditsToAdd);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("creditsToAdd must be a positive number.");
  }

  await updateDoc(ref, {
    maxCredits: increment(amount),
    lastUpdated: serverTimestamp(),
  });
}

/**
 * Get credit info + remaining credits
 */
export async function getCreditInfo(uid) {
  const ref = await ensureUserCredits(uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  const data = snap.data() || {};
  const usedCredits = Number(data.usedCredits || 0);
  const maxCredits = Number(data.maxCredits || 0);
  const remainingCredits = Math.max(maxCredits - usedCredits, 0);

  return {
    usedCredits,
    maxCredits,
    remainingCredits,
    lastUpdated: data.lastUpdated || null,
  };
}