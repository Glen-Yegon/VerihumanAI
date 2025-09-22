// google-auth.js
import { app } from "./firebase.js";
import { getAuth, signInWithCredential, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

window.handleGoogleSignIn = async (response) => {
    try {
        const credential = GoogleAuthProvider.credential(response.credential);
        const result = await signInWithCredential(auth, credential);
        const user = result.user;

        await setDoc(doc(db, "signup", user.uid), {
            uid: user.uid,
            email: user.email,
            name: user.displayName || "Anonymous User",
            photoURL: user.photoURL || "default-avatar.png",
            createdAt: new Date().toISOString(),
            authProvider: "google"
        }, { merge: true });

        alert("Google Sign-In successful!");
        window.location.href = "index.html";
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
};
