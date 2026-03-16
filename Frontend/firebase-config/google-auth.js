import { app } from "./firebase.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup 
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc 
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

function showGoogleSignInModal(message = "You have successfully signed in with Google. Welcome to VeriHuman.", redirectUrl = "index.html") {
  const modal = document.getElementById("google-signin-modal");
  if (!modal) {
    console.error("Google sign-in modal element not found.");
    window.location.href = redirectUrl;
    return;
  }

  const textEl = modal.querySelector(".google-signin-modal__text");
  if (textEl) {
    textEl.textContent = message;
  }

  modal.classList.remove("hide");
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");

  setTimeout(() => {
    modal.classList.remove("show");
    modal.classList.add("hide");
    modal.setAttribute("aria-hidden", "true");
  }, 2600);

  setTimeout(() => {
    window.location.href = redirectUrl;
  }, 3000);
}

async function handleGoogleSignIn() {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Save/update user in "users" collection
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      name: user.displayName || "Anonymous User",
      photoURL: user.photoURL || "default-avatar.png",
      createdAt: new Date().toISOString(),
      authProvider: "google"
    }, { merge: true });

    // Store user locally
    sessionStorage.setItem("userUID", user.uid);
    sessionStorage.setItem("userEmail", user.email);

    // Show custom modal instead of alert
    showGoogleSignInModal(
      "You have successfully signed in with Google. Welcome to VeriHuman.",
      "index.html"
    );

  } catch (error) {
    console.error("Google Sign-In Error:", error);
    alert(`⚠️ ${error.message}`);
  }
}

// Attach click listener
document.getElementById("google-btn").addEventListener("click", handleGoogleSignIn);