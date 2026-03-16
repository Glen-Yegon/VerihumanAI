import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { app } from "../firebase-config/firebase.js";

const auth = getAuth(app);
const db = getFirestore(app);

window.addEventListener("DOMContentLoaded", () => {
  const creditsUsedEl = document.getElementById("credits-used");
  if (!creditsUsedEl) {
    console.warn("Element #credits-used not found!");
    return;
  }

  async function loadRemainingCredits(userUID) {
    console.log("loadRemainingCredits called with UID:", userUID);
    if (!userUID || !creditsUsedEl) {
      console.log("No userUID or credits element. Exiting.");
      return;
    }

    try {
      const creditsRef = doc(db, "credits", userUID);
      console.log("Fetching credits from Firestore...");
      const creditsSnap = await getDoc(creditsRef);

      let remainingText = "0 (Configure Later)";

      if (creditsSnap.exists()) {
        const data = creditsSnap.data();
        console.log("Credits document data:", data);

        const maxCredits = data.maxCredits;
        const usedCredits = data.usedCredits || 0;

        if (maxCredits === "unlimited" || maxCredits === -1) {
          remainingText = "Unlimited";
        } else {
          remainingText = Math.max(maxCredits - usedCredits, 0);
        }
      } else {
        console.log("Credits document does not exist for user:", userUID);
      }

      console.log("Remaining credits to display:", remainingText);
      creditsUsedEl.textContent = remainingText;
      sessionStorage.setItem("creditsUsed", remainingText);
    } catch (error) {
      console.error("Error fetching credits:", error);
      creditsUsedEl.textContent = "0 (Error)";
    }
  }

  console.log("Setting up onAuthStateChanged listener...");
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("User is logged in:", user.uid, user.email);
      loadRemainingCredits(user.uid);
    } else {
      console.log("No user logged in.");
      creditsUsedEl.textContent = "0 (Not logged in)";
    }
  });
});
