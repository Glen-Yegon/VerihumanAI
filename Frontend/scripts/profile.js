const signupMethodEl = document.getElementById("signup-method");
const paymentPackageEl = document.getElementById("payment-package");
const paymentBtn = document.getElementById("payment-cta");
const logoutBtn = document.getElementById("logout-btn");

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}<>?';

function shuffleText(element, finalText, duration = 5000, intervalTime = 50) {
  let iterations = duration / intervalTime;
  let count = 0;

  const interval = setInterval(() => {
    let displayed = '';
    for (let i = 0; i < finalText.length; i++) {
      if (count / 2 > i) {
        displayed += finalText[i];
      } else {
        displayed += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    element.textContent = displayed;

    count++;
    if (count >= iterations) {
      element.textContent = finalText;
      clearInterval(interval);
    }
  }, intervalTime);
}

window.addEventListener('DOMContentLoaded', () => {
  const userUID = sessionStorage.getItem("userUID");
  const userEmail = sessionStorage.getItem("userEmail");

  // Set payment package
  paymentPackageEl.textContent = sessionStorage.getItem("paymentPackage") || "Basic (Configure Later)";

  // Set login status
  const statusEl = document.getElementById("login-status");
  if (userUID && userEmail) {
    statusEl.textContent = "Active";
    statusEl.style.color = "#00c853";
  } else {
    statusEl.textContent = "Inactive";
    statusEl.style.color = "#d50000";
  }

  // UID toggle logic
  const profileUidEl = document.getElementById("profile-uid");
  const toggleBtn = document.getElementById("toggle-uid-visibility");
  let uidVisible = false;

  if (profileUidEl) {
    profileUidEl.textContent = "•••••••••••••••••••••••"; // masked by default
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      if (!userUID) return;

      uidVisible = !uidVisible;

      if (uidVisible) {
        shuffleText(profileUidEl, userUID, 5000, 50);
        toggleBtn.title = "Hide User ID";
      } else {
        profileUidEl.textContent = "•••••••••••••••••••••••";
        toggleBtn.title = "Show User ID";
      }
    });
  }

  // Animate all shuffle-text elements
  document.querySelectorAll('.shuffle-text').forEach(el => {
    const finalText = el.textContent;
    el.textContent = '';
    shuffleText(el, finalText, 5000, 50);
  });
});

// Payment button handler
paymentBtn.addEventListener("click", () => {
  window.location.href = "/Frontend/pay.html";
});

// Logout button
logoutBtn.addEventListener("click", () => {
  sessionStorage.clear();
  alert("Logged out");
  window.location.href = "index.html";
});