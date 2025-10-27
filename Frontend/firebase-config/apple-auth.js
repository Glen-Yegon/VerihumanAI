import { app } from "./firebase.js";
import { 
  getAuth, 
  signInWithPopup, 
  OAuthProvider 
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc 
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Apple Provider
const provider = new OAuthProvider("apple.com");
provider.addScope("email");
provider.addScope("name");

async function handleAppleSignIn() {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Save user data in Firestore
    await setDoc(doc(db, "signup", user.uid), {
      uid: user.uid,
      email: user.email || "No email provided",
      name: user.displayName || "Anonymous User",
      photoURL: user.photoURL || "default-avatar.png",
      createdAt: new Date().toISOString(),
      authProvider: "apple"
    }, { merge: true });

    // Save locally
    sessionStorage.setItem("userUID", user.uid);
    sessionStorage.setItem("userEmail", user.email);

    // Notify user
    if (window.showPopup) {
      showPopup("🍎 Apple Sign-In successful! Welcome to VeriHuman.", 3000, "index.html");
    } else {
      alert("🍎 Apple Sign-In successful!");
      window.location.href = "index.html";
    }
  } catch (error) {
    console.error("Apple Sign-In Error:", error);
    alert(`⚠️ ${error.message}`);
  }
}

document.getElementById("apple-btn").addEventListener("click", handleAppleSignIn);
