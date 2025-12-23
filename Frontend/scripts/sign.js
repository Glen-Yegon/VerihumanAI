const toggleLink = document.getElementById("toggle-link");
const formTitle = document.getElementById("form-title");
const submitBtn = document.getElementById("submit-btn");
const signupOnlyFields = document.querySelectorAll(".signup-only");

let isSignup = true;


toggleLink.addEventListener("click", () => {
    isSignup = !isSignup;

    if (isSignup) {
        formTitle.textContent = "Create Your Account";
        submitBtn.textContent = "Sign Up";
        signupOnlyFields.forEach(el => el.style.display = "flex");
        toggleLink.textContent = "Sign In";
    } else {
        formTitle.textContent = "Welcome Back";
        submitBtn.textContent = "Sign In";
        signupOnlyFields.forEach(el => el.style.display = "none");
        toggleLink.textContent = "Sign Up";
    }
});


document.addEventListener("DOMContentLoaded", () => {
    const typingElement = document.getElementById("ai-typing");
    const chatBubble = document.querySelector(".ai-welcome-container");

    if (!typingElement || !chatBubble) return; // Safety check

    // ✅ Check if the bubble has already been shown in this session
    if (sessionStorage.getItem("aiWelcomeShown")) return;

    const messages = [
        "Welcome to VeriHuman : Bridging Intelligence and Innovation.",
        "Experience the future of human–AI interaction, tailored for your needs.",
        "Prompt the AI to unleash creativity 🚀"
    ];

    function shuffleText(target, text, delay = 35, callback) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
        let output = Array(text.length).fill("");
        let resolved = Array(text.length).fill(false);

        const interval = setInterval(() => {
            let allResolved = true;

            for (let i = 0; i < text.length; i++) {
                if (!resolved[i]) {
                    allResolved = false;
                    output[i] = chars[Math.floor(Math.random() * chars.length)];
                }
            }
            target.textContent = output.join("");

            for (let i = 0; i < text.length; i++) {
                if (!resolved[i] && Math.random() < 0.05) {
                    output[i] = text[i];
                    resolved[i] = true;
                }
            }

            if (allResolved) {
                clearInterval(interval);
                if (callback) setTimeout(callback, 1500); // Pause before next message
            }
        }, delay);
    }

    function playMessages(index = 0) {
        if (index < messages.length) {
            shuffleText(typingElement, messages[index], 25, () => {
                playMessages(index + 1);
            });
        } else {
            // Fade out bubble after all messages
            setTimeout(() => {
                chatBubble.style.opacity = "0";
                setTimeout(() => chatBubble.remove(), 800);
            }, 2000);
        }
    }

    // ✅ Delay 5 seconds before showing
    setTimeout(() => {
        chatBubble.style.opacity = "1"; // Ensure visible
        chatBubble.style.transition = "opacity 0.8s ease";
        playMessages();

        // ✅ Mark as shown in this session
        sessionStorage.setItem("aiWelcomeShown", "true");
    }, 5000);
});
