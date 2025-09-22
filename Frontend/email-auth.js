import { app } from "./firebase.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

// Futuristic popup function
function showPopup(message, duration = 4000, redirectUrl = null) {
    const popup = document.getElementById("auth-popup");
    popup.textContent = message;
    popup.classList.add("show");

    setTimeout(() => {
        popup.classList.remove("show");
        if (redirectUrl) window.location.href = redirectUrl;
    }, duration);
}

document.getElementById("auth-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const confirmPassword = document.getElementById("confirm-password")?.value.trim();
    const isSignup = document.getElementById("submit-btn").textContent === "Sign Up";

    try {
        if (isSignup) {
            if (password !== confirmPassword) {
                showPopup("⚡ Passwords do not match. Please try again.", 4000);
                return;
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await setDoc(doc(db, "signup", user.uid), {
                uid: user.uid,
                email: user.email,
                name: user.displayName || "Anonymous User",
                photoURL: user.photoURL || "default-avatar.png",
                createdAt: new Date().toISOString(),
                authProvider: "email"
            });

            // Store user info in sessionStorage
            sessionStorage.setItem("userUID", user.uid);
            sessionStorage.setItem("userEmail", user.email);

            showPopup("🤖 Signup successful! Welcome to VeriHuman.", 4000, "index.html");
        } else {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Store user info in sessionStorage
            sessionStorage.setItem("userUID", user.uid);
            sessionStorage.setItem("userEmail", user.email);

            showPopup("🤖 Login successful! Access granted.", 4000, "index.html");
        }
    } catch (error) {
        showPopup(`⚠️ ${error.message}`, 4000);
        console.error(error);
    }
});
