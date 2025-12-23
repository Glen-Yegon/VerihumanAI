// profile.js
const profilePhotoInput = document.getElementById("photo-upload");
const profilePhoto = document.getElementById("profile-photo");

const signupMethodEl = document.getElementById("signup-method");
const paymentPackageEl = document.getElementById("payment-package");


const paymentBtn = document.getElementById("payment-cta");
const logoutBtn = document.getElementById("logout-btn");

// Open file picker when profile circle clicked
document.querySelector(".profile-photo-wrapper").addEventListener("click", () => {
  profilePhotoInput.click();
});

// Handle file upload and preview
profilePhotoInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (file && file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = () => {
      profilePhoto.src = reader.result;
      // You may want to upload this to your backend or Firebase Storage here.
      sessionStorage.setItem("profilePhoto", reader.result); // Save in session for demo
    };
    reader.readAsDataURL(file);
  } else {
    alert("Please upload a valid image file.");
  }
});

// Load saved profile photo on page load
window.addEventListener("load", () => {
  const savedPhoto = sessionStorage.getItem("profilePhoto");
  if (savedPhoto) {
    profilePhoto.src = savedPhoto;
  }

  // Load dummy data for demo - replace with your real user data fetch
  //signupMethodEl.textContent = sessionStorage.getItem("signupMethod") || "Email";
  paymentPackageEl.textContent = sessionStorage.getItem("paymentPackage") || "Basic (Configure Later)";


  profilePhoto.alt = sessionStorage.getItem("profileName") || "User Profile Photo";
  //document.getElementById("profile-name").textContent = sessionStorage.getItem("profileName") || "Anonymous User";
});

// Payment button handler
paymentBtn.addEventListener("click", () => {
  // Replace with your actual payment page URL
  window.location.href = "/Frontend/pay.html";
});

// Log out button (clears session storage and redirects)
logoutBtn.addEventListener("click", () => {
  sessionStorage.clear();
  alert("Logged out");
  window.location.href = "index.html";
});



window.onload = () => {
  const userUID = sessionStorage.getItem("userUID");
  const userEmail = sessionStorage.getItem("userEmail");
  const statusEl = document.getElementById("login-status");

  if (userUID && userEmail) {
    console.log("User is logged in:", userEmail);
    statusEl.textContent = "Active";
    statusEl.style.color = "#00c853"; // green for active
  } else {
    console.log("User is not logged in.");
    statusEl.textContent = "Inactive";
    statusEl.style.color = "#d50000"; // red for inactive
  }
};


function scrambleText(element, finalText, totalDuration = 5000) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  const steps = finalText.length * 20; // more steps for longer duration
  const speed = totalDuration / steps; // interval time per step
  
  let iteration = 0;

  const interval = setInterval(() => {
    let scrambled = '';
    for (let i = 0; i < finalText.length; i++) {
      if (i < iteration / 20) { // slowly reveal letters
        scrambled += finalText[i];
      } else {
        scrambled += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    element.textContent = scrambled;

    iteration++;
    if (iteration > steps) {
      clearInterval(interval);
      element.textContent = finalText;
    }
  }, speed);
}

// Usage on page load
window.addEventListener('DOMContentLoaded', () => {
  const uidLabel = document.getElementById('uid-label');
  if (uidLabel) {
    scrambleText(uidLabel, 'User ID:', 5000); // 5 seconds
  }
});


// Characters used for shuffle effect
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{}<>?';

// Shuffle animation function for one element
function shuffleText(element, finalText, duration = 5000, intervalTime = 50) {
  let iterations = duration / intervalTime;
  let count = 0;

  const interval = setInterval(() => {
    let displayed = '';
    for (let i = 0; i < finalText.length; i++) {
      if (count / 2 > i) {
        // Reveal actual character progressively
        displayed += finalText[i];
      } else {
        // Random char from the pool
        displayed += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }
    element.textContent = displayed;

    count++;
    if (count >= iterations) {
      element.textContent = finalText; // Set final text exactly
      clearInterval(interval);
    }
  }, intervalTime);
}

// On page load, find all elements with class 'shuffle-text' and animate them
window.addEventListener('DOMContentLoaded', () => {
  const elements = document.querySelectorAll('.shuffle-text');
  elements.forEach(el => {
    const finalText = el.textContent;
    el.textContent = ''; // Clear before animating
    shuffleText(el, finalText, 5000, 50); // 5 seconds animation
  });
});


