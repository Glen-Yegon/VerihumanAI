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

async function handleGoogleSignIn() {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // ✅ Save/update user in "users" collection (matches Firestore rules)
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

    // Friendly popup or redirect
    if (window.showPopup) {
      showPopup("🎉 Google Sign-In successful! Welcome to VeriHuman.", 3000, "index.html");
    } else {
      alert("🎉 Google Sign-In successful!");
      window.location.href = "index.html";
    }
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    alert(`⚠️ ${error.message}`);
  }
}

// Attach click listener
document.getElementById("google-btn").addEventListener("click", handleGoogleSignIn);
