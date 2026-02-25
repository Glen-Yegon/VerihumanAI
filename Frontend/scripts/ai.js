import { app } from "../firebase-config/firebase.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  saveChatToHistory,
  getLatestChat,
  saveFullChatSession,
  resetCurrentChatDoc,     // ✅ import real one
  setCurrentChatDocId,     // ✅ optional (only if you want sync)
} from "../firebase-config/firebase-history.js";
import {
  ensureUserCredits,
  canUseCredits,
  consumeCredit,
  getCreditInfo
} from "../firebase-config/firebase-credits.js";


// Check if user is logged in
function isUserLoggedIn() {
  return (
    sessionStorage.getItem("userUID") &&
    sessionStorage.getItem("userEmail")
  );
}


// Show / Hide modal
function showAuthModal() {
  document.getElementById("auth-modal").classList.remove("hidden");
}

function hideAuthModal() {
  document.getElementById("auth-modal").classList.add("hidden");
}

// Wait for DOM to load before attaching events
document.addEventListener("DOMContentLoaded", () => {

  const closeBtn = document.getElementById("close-auth-modal");
  const goSigninBtn = document.getElementById("go-signin-btn");
  const chatForm = document.getElementById("chatForm");

  // 🔥 Immediately check login when page loads
  if (!isUserLoggedIn()) {
    showAuthModal();
  }

  // Close modal
  if (closeBtn) {
    closeBtn.addEventListener("click", hideAuthModal);
  }

  // Go to sign page
  if (goSigninBtn) {
    goSigninBtn.addEventListener("click", () => {
      window.location.href = "sign.html";
    });
  }

  // Protect form submission
  if (chatForm) {
    chatForm.addEventListener("submit", (e) => {
      if (!isUserLoggedIn()) {
        e.preventDefault();
        showAuthModal();
      }
    });
  }

});

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("auth-modal");
  const backdrop = modal?.querySelector(".auth-modal__backdrop");

  if (backdrop) {
    backdrop.addEventListener("click", () => {
      // same behavior as your cancel button
      document.getElementById("close-auth-modal")?.click();
    });
  }
});


document.getElementById("chatForm").addEventListener("submit", (e) => {
  if (!isUserLoggedIn()) {
    e.preventDefault();
    showAuthModal();
    return;
  }

  // user is logged in → continue sending message
});

document.getElementById("run-humanizer-btn").addEventListener("click", () => {
  if (!isUserLoggedIn()) {
    showAuthModal();
    return;
  }

  // run humanizer logic
});

document.getElementById("run-detection-btn").addEventListener("click", () => {
  if (!isUserLoggedIn()) {
    showAuthModal();
    return;
  }

  // run detection logic
});



const chatForm = document.getElementById("chatForm");


chatForm.addEventListener("submit", async (event) => {
  event.preventDefault(); // ✅ Prevent the default form submission
  if (!chatInput.value.trim()) return; // ignore empty messages
  await handleSend(); // call your existing send function
});

  
const chatSection = document.getElementById("chat-section");
const chatContainer = document.getElementById("chat-container");
const scrollBtn = document.getElementById("scroll-bottom-btn");

// Check if user is at bottom (with 2px tolerance)
function isAtBottom() {
  return chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 2;
}

// Show/hide scroll button
function toggleScrollButton() {
  scrollBtn.style.display = isAtBottom() ? "none" : "block";
}

// Smooth scroll to bottom
function scrollToBottomSmooth() {
  chatContainer.scrollTo({
    top: chatContainer.scrollHeight,
    behavior: "smooth",
  });
}

// Event listeners
scrollBtn.addEventListener("click", scrollToBottomSmooth);
chatContainer.addEventListener("scroll", toggleScrollButton);

// Call this after new message is added
function updateScrollButton() {
  scrollToBottomSmooth();
  toggleScrollButton();
}
updateScrollButton();


const db = getFirestore(app);
const auth = getAuth(app);

const avatarBtn = document.getElementById("user-avatar"); // sidebar bottom
const modal = document.getElementById("profile-modal");
const closeBtn = document.getElementById("close-modal");
const modalAvatar = document.querySelector(".modal-avatar");
const userEmailEl = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");

// Open modal ONLY when avatar is clicked
avatarBtn.addEventListener("click", () => {
  modal.style.display = "flex";
});

// Close modal with (X)
closeBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

// Close modal when clicking outside
window.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
  }
});

// Load user data
async function loadUserData() {
  const userUID = sessionStorage.getItem("userUID");
  if (!userUID) {
    userEmailEl.innerHTML = `<a href="sign.html">Sign Up / Login</a>`;
    logoutBtn.style.display = "none";
    return;
  }

  try {
    const userRef = doc(db, "users", userUID);
    const docSnap = await getDoc(userRef);

    // Get profile photo from sessionStorage if available
    let profilePhotoURL = sessionStorage.getItem("profilePhoto");

    // Fallback to Firestore photo or default
    if (!profilePhotoURL && docSnap.exists()) {
      const data = docSnap.data();
      profilePhotoURL = data.photoURL || "default-avatar.png";
    }

    // Set avatar in modal + sidebar
    [modalAvatar, document.getElementById("user-avatar")].forEach(el => {
      el.style.backgroundImage = `url('${profilePhotoURL}')`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
      el.style.borderRadius = "50%";
    });

    // Email display
    if (docSnap.exists() && docSnap.data().email) {
      userEmailEl.textContent = docSnap.data().email;
    }

    logoutBtn.style.display = "block";
  } catch (err) {
    console.error("Error fetching user data:", err);
  }
}



// Logout
logoutBtn.addEventListener("click", () => {
  signOut(auth).then(() => {
    sessionStorage.clear();
    window.location.href = "sign.html";
  }).catch(err => console.error("Error signing out:", err));
});

loadUserData();
  const chatInput = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendBtn");
  const newChatBtn = document.getElementById("newChatBtn");
  const newChatBtnMobile = document.getElementById("newChatBtnMobile");

const humanizerUI = document.getElementById("humanizer-ui");
const humanizeInput = document.getElementById("humanize-input");
const runHumanizerBtn = document.getElementById("run-humanizer-btn");


  // Local store of current conversation
  let currentChatMessages = [];
  let currentChatDocId = null; // tracks current conversation in Firestore

// -------------------------------
// MODE SWITCHING LOGIC + UI UPDATE
// -------------------------------

// Get last saved mode from localStorage
const savedMode = localStorage.getItem("verihuman_mode");

// Start **visually** in chat mode, ignore savedMode for initial display
let currentMode = "chat";

const modeButtons = document.querySelectorAll(".mode-btn");
const detectionUI = document.getElementById("detection-ui"); // detection textarea + run button
const detectInput = document.getElementById("detect-input");
const runDetectionBtn = document.getElementById("run-detection-btn");

const chatInputContainer = document.getElementById("chatForm"); // bottom input form

// Update buttons to reflect the active mode
modeButtons.forEach(btn => {
  btn.classList.remove("active");
  if (btn.dataset.mode === currentMode) {
    btn.classList.add("active");
  }
});

// Update the UI to match the current mode
updateModeUI();


function updateModeUI() {
  // ---------- CHAT MODE ----------
  if (currentMode === "chat") {
    
  // default matrix colors

// Ensure only chat mode UI is visible on page load
chatInputContainer.style.display = "flex";

detectionUI.classList.add("hidden");
if (chatContainer.contains(detectionUI)) {
  chatContainer.removeChild(detectionUI);
}

humanizerUI.classList.add("hidden");
if (chatContainer.contains(humanizerUI)) {
  chatContainer.removeChild(humanizerUI);
}



    chatInput.disabled = false;
    sendBtn.disabled = false;
    return;
  }

  // ---------- DETECT MODE ----------
  if (currentMode === "detect") {
      // detection mode → bright yellow

    const lastBubble = chatContainer.lastElementChild;
    if (!lastBubble || lastBubble.dataset.modeSwitch !== "detect") {
      const bubble = createBubble("🟡 Switched to AI Detection Mode", "ai");
      bubble.dataset.modeSwitch = "detect"; // mark so it won't repeat
    }

    // Hide chat input bar
    chatInputContainer.style.display = "none";


    // Show Detect UI
    detectionUI.classList.remove("hidden");
    if (!chatContainer.contains(detectionUI)) {
      chatContainer.appendChild(detectionUI);
    }

    // Hide Humanizer UI
    humanizerUI.classList.add("hidden");
    if (chatContainer.contains(humanizerUI)) {
      chatContainer.removeChild(humanizerUI);
    }

    scrollToBottom();
    return;
  }

  // ---------- HUMANIZER MODE ----------
  if (currentMode === "humanize") {
      // humanizer mode → futuristic purple
      



    const lastBubble = chatContainer.lastElementChild;
    if (!lastBubble || lastBubble.dataset.modeSwitch !== "humanizer") {
      const bubble = createBubble("🟣 Switched to Humanizer Mode", "ai");
      bubble.dataset.modeSwitch = "humanizer"; // mark so it won't repeat
    }

    // Hide chat input bar
    chatInputContainer.style.display = "none";

    // Hide Detection UI
    detectionUI.classList.add("hidden");
    if (chatContainer.contains(detectionUI)) {
      chatContainer.removeChild(detectionUI);
    }

    // Show Humanizer UI
    humanizerUI.classList.remove("hidden");
    if (!chatContainer.contains(humanizerUI)) {
      chatContainer.appendChild(humanizerUI);
    }

    scrollToBottom();
    return;
  }
}



// Handle mode button clicks and integrate with history
modeButtons.forEach(btn => {
  btn.addEventListener("click", async () => {
    const selectedMode = btn.dataset.mode;

    if (selectedMode === currentMode) return;

    // Update active button UI
    modeButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // Update mode in memory
    currentMode = selectedMode;

    // Save the current mode to localStorage so next visit restores it
    localStorage.setItem("verihuman_mode", selectedMode);

    // Update the UI for the selected mode
    updateModeUI();

    // Announce mode switch in chat UI
    const modeText = {
      chat: "🔵 Switched to Chat Mode",
      detect: "🟡 Switched to AI Detection Mode",
      humanize: "🟣 Switched to Humanizer Mode",
    };

// When switching modes in your modeButtons click listener
if (selectedMode !== "detect") {
  const bubble = createBubble("", "ai");
  await typeText(bubble, modeText[selectedMode]);

// 🔹 Save mode-switch as AI message in history
const userUID = sessionStorage.getItem("userUID");
if (userUID && window.currentChatId) {
  const savedId = await saveChatToHistory(
    userUID,
    "", // no user text
    modeText[selectedMode], // AI/system text
    false, // ✅ never force new chat for mode switch
    {
      mode: selectedMode,
      metadata: { systemMessage: true },
      chatId: window.currentChatId,
    }
  );

  if (savedId) {
    window.currentChatId = savedId;
    sessionStorage.setItem("currentChatId", savedId);
    window.isNewConversation = false;
  }
}
}


    // Optionally, reset detection/humanizer inputs when switching modes
    if (selectedMode === "detect") detectInput.value = "";
    if (selectedMode === "humanize") humanizeInput.value = "";
  });
});


// Run once on page load: always start visually in chat
updateModeUI();

// Optional helper
function getCurrentMode() {
  return currentMode;
}

  function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

function createBubble(message = "", sender = "ai", options = {}, attachments = []) {
  const wrapper = document.createElement("div");
  wrapper.classList.add("chat-wrapper", sender);

  const avatarEl = document.createElement("div");
  avatarEl.className = "avatar";

  if (sender === "ai") {
    avatarEl.style.backgroundImage = "url('Images/veri-logo.png')";
  } else {
    const userAvatar = document.getElementById("user-avatar");
    avatarEl.style.backgroundImage =
      (userAvatar && userAvatar.style.backgroundImage) ||
      "url('Images/veri-logo.png')";
  }

  const bubble = document.createElement("div");
  bubble.classList.add("chat-bubble", sender);

  // Loading state
  if (options.scanning) {
    bubble.classList.add("scanning");
    bubble.innerHTML =
      '<span class="scanning-dots"><span></span><span></span><span></span></span>';
  } else {
    // ✅ Message text
    bubble.textContent = message || "";

    // ✅ Attachments inside bubble (images + file chips)
    if (attachments && attachments.length) {
      const wrap = document.createElement("div");
      wrap.className = "bubble-attachments";

      attachments.forEach((file) => {
        // Images
        if (file.type && file.type.startsWith("image/")) {
          const img = document.createElement("img");
          img.className = "bubble-attachment-img";
          img.src = URL.createObjectURL(file);
          img.alt = file.name || "image";
          wrap.appendChild(img);
        } else {
          // Non-image file chip
          const chip = document.createElement("div");
          chip.className = "bubble-attachment-file";
          chip.textContent = file.name || "file";
          wrap.appendChild(chip);
        }
      });

      bubble.appendChild(wrap);
    }
  }

  wrapper.appendChild(avatarEl);
  wrapper.appendChild(bubble);
  chatContainer.appendChild(wrapper);

  scrollToBottom();

  // ✅ Add copy button for text (won't break images)
  addCopyButton(bubble);

  return bubble;
}

 function addCopyButton(bubbleEl) {
  // Skip if bubble already has a copy button
  if (bubbleEl.querySelector(".copy-btn")) return;

  const btn = document.createElement("button");
  btn.className = "copy-btn";
  btn.title = "Copy text";

  // SVG icon for copy
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#000000" viewBox="0 0 24 24">
      <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1z"/>
      <path d="M20 5H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 18H8V7h12v16z"/>
    </svg>
  `;

  btn.style.marginLeft = "8px";
  btn.style.background = "transparent";
  btn.style.border = "none";
  btn.style.cursor = "pointer";
  btn.style.padding = "0";
  btn.style.display = "inline-flex";
  btn.style.alignItems = "center";

  // Copy text on click
  btn.addEventListener("click", () => {
    const textToCopy = bubbleEl.textContent.trim();
    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy).then(() => {
      btn.title = "Copied to clipboard";
      setTimeout(() => (btn.title = "Copy text"), 1500);
    });
  });

  // Append button inside the bubble
  bubbleEl.appendChild(btn);
}

function escapeHTML(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Detect triple-backtick code blocks: ```lang\n...\n```
function renderAIMessageToHTML(raw = "") {
  const text = String(raw);

  // Split into segments: code blocks + normal text
  const parts = text.split(/```/g);

  // If no code fences, just paragraphs
  if (parts.length === 1) {
    return `<div class="ai-text">${escapeHTML(text).replaceAll("\n", "<br>")}</div>`;
  }

  let html = `<div class="ai-rich">`;

  for (let i = 0; i < parts.length; i++) {
    const chunk = parts[i];

    // Even index => normal text
    if (i % 2 === 0) {
      const safe = escapeHTML(chunk).trim();
      if (safe) {
        html += `<div class="ai-text">${safe.replaceAll("\n", "<br>")}</div>`;
      }
    } else {
      // Odd index => code block: first line might be language
      let code = chunk;
      let lang = "";

      const firstNewline = code.indexOf("\n");
      if (firstNewline !== -1) {
        lang = code.slice(0, firstNewline).trim();
        code = code.slice(firstNewline + 1);
      }

      html += `
        <div class="ai-codeblock">
          ${lang ? `<div class="ai-code-lang">${escapeHTML(lang)}</div>` : ""}
          <pre><code>${escapeHTML(code.trim())}</code></pre>
        </div>
      `;
    }
  }

  html += `</div>`;
  return html;
}


function isImageUrl(url = "") {
  return /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(url);
}

function extractUrls(text = "") {
  const matches = text.match(/https?:\/\/[^\s)]+/g);
  return matches ? matches.map(u => u.replace(/[.,!?)]$/, "")) : [];
}

/**
 * Takes the original reply text and returns:
 * - html: the rendered rich html (text + code blocks)
 * - images: array of detected image URLs
 */
function renderAIWithDetectedMedia(raw = "") {
  const urls = extractUrls(raw);
  const images = urls.filter(isImageUrl);

  // Render code blocks + text first
  let html = renderAIMessageToHTML(raw);

  // Append images below the text/code (ChatGPT-like)
  if (images.length) {
    const imgsHTML = images
      .slice(0, 6) // guard, avoid spam
      .map(
        (u) => `
          <div class="ai-media">
            <img class="ai-img" src="${u}" alt="image" loading="lazy" />
          </div>
        `
      )
      .join("");

    html += `<div class="ai-media-wrap">${imgsHTML}</div>`;
  }

  return { html, images };
}

// ------------------------
// CREDITS MODAL CONTROLS
// ------------------------

function showCreditsModal() {
  const modal = document.getElementById("credits-modal");
  modal.classList.remove("hidden");
}

function closeCreditsModal() {
  const modal = document.getElementById("credits-modal");
  modal.classList.add("hidden");
}


// ------------------------
// CREDIT SYSTEM HELPERS
// ------------------------

async function creditGuard() {
  const uid = sessionStorage.getItem("userUID");
  if (!uid) return true;

  const info = await getCreditInfo(uid);
  if (!info) return true;

  const { usedCredits, maxCredits } = info;

  if (maxCredits !== "unlimited" && usedCredits >= maxCredits) {
    showCreditsModal();
    disableAllInputs();
    return false;
  }

  return true;
}

function disableAllInputs() {
  chatInput.disabled = true;
  sendBtn.disabled = true;
  detectInput.disabled = true;
  runDetectionBtn.disabled = true;
  humanizeInput.disabled = true;
  runHumanizerBtn.disabled = true;
}



  async function typeText(el, text) {
    el.textContent = "";
    const cursor = document.createElement("span");
    cursor.className = "typing-cursor";
    el.appendChild(cursor);

    const length = Math.max(1, text.length);
    const msPerChar = Math.max(4, Math.min(18, Math.floor(900 / length)));
    let i = 0;
    return new Promise((resolve) => {
      function step() {
        if (i < text.length) {
          cursor.remove();
          el.textContent += text[i++];
          el.appendChild(cursor);
          scrollToBottom();
          setTimeout(step, msPerChar);
        } else {
          cursor.remove();
          resolve();
        }
      }
      step();
    });
  }

  // Add message to local memory
function addMessage(sender, text) {
  currentChatMessages.push({
    sender,
    text,
    timestamp: new Date().toISOString(),
    mode: getCurrentMode(), // 🔥 NEW: store the current mode
  });
}


async function compressImage(file, { maxWidth = 1400, quality = 0.8 } = {}) {
  if (!file.type.startsWith("image/")) return file;

  const img = new Image();
  const url = URL.createObjectURL(file);

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = url;
  });

  const scale = Math.min(1, maxWidth / img.width);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);

  URL.revokeObjectURL(url);

  // Convert to JPEG (much smaller than PNG)
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );

  const newName = file.name.replace(/\.(png|webp|bmp)$/i, ".jpg");
  return new File([blob], newName, { type: "image/jpeg" });
}


async function sendPromptToAPI(promptText, files = []) {
  try {
    let res;

    // If files exist → multipart/form-data
if (files && files.length) {
  const form = new FormData();
  form.append("prompt", promptText || "");

  // ✅ compress only images
  for (const f of files) {
    const toSend = f.type.startsWith("image/") ? await compressImage(f) : f;
    form.append("files", toSend);
  }

  res = await fetch("https://verihumanai.onrender.com/api/chat", {
    method: "POST",
    body: form,
  });
    } else {
      // No files → keep JSON (your old behavior)
      const body = { prompt: promptText };
      res = await fetch("https://verihumanai.onrender.com/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    if (!res.ok) {
      let text = `Server error ${res.status}`;
      try {
        const j = await res.json();
        text = j.detail || JSON.stringify(j);
      } catch (e) {
        console.error("Response JSON parse failed:", e);
      }
      throw new Error(text);
    }
    return await res.json();
  } catch (err) {
    console.error("❌ Fetch error:", err);
    throw err;
  }
}

// ------------------------
// CHAT MODE
// ------------------------
async function handleSend() {
  const userUID = sessionStorage.getItem("userUID");
  if (!userUID) return;

  if (!(await creditGuard())) return;

  const text = chatInput.value.trim();
  const filesToSend = (selectedFiles || []).slice(); // ✅ snapshot
  const hasFiles = filesToSend.length > 0;

  // ✅ allow send if either text OR files exist
  if (!text && !hasFiles) return;

  // ✅ Show user bubble with BOTH text + attachments
  const userDisplay = text || (hasFiles ? "" : "");
  createBubble(userDisplay, "user", {}, filesToSend);
  addMessage("user", text || (hasFiles ? "[Sent attachment(s)]" : ""));

  // ✅ Clear UI immediately (feels like message sent)
  chatInput.value = "";
  chatInput.style.height = "auto";
  selectedFiles = [];
  renderAttachmentsPreview();

  const aiBubble = createBubble("", "ai", { scanning: true });
  chatInput.disabled = true;

  try {
    // ✅ send snapshot
    const data = await sendPromptToAPI(text, filesToSend);
    const reply = typeof data.reply === "string" ? data.reply : "[No reply]";

aiBubble.classList.remove("scanning");

// Render text/code + detect image URLs in the reply and preview them
const rendered = renderAIWithDetectedMedia(reply);
aiBubble.innerHTML = rendered.html;

// Add copy button after final HTML is placed
addCopyButton(aiBubble);

addMessage("ai", reply);

    // ✅ Consume credit only after successful reply
    await consumeCredit(userUID);

const savedId = await saveChatToHistory(
  userUID,
  text || (hasFiles ? "[Sent attachment(s)]" : ""),
  reply,
  window.isNewConversation,
  {
    mode: getCurrentMode(),
    metadata: { model: "chat-model" },
    chatId: window.currentChatId,
  }
);

if (savedId) {
  window.currentChatId = savedId;
  sessionStorage.setItem("currentChatId", savedId);
  window.isNewConversation = false;
}


    // Optional: check if usedCredits reached max
    const creditInfo = await getCreditInfo(userUID);
    if (
      creditInfo.maxCredits !== "unlimited" &&
      creditInfo.usedCredits >= creditInfo.maxCredits
    ) {
      showCreditsModal();
      disableAllInputs();
    }

  } catch (err) {
    console.error("❌ Chat send error:", err);
    aiBubble.textContent = "Sorry — something went wrong.";

    // Optional UX: if send fails, you could restore attachments here if you want
    // selectedFiles = filesToSend;
    // renderAttachmentsPreview();
  } finally {
    chatInput.disabled = false;
    chatInput.focus();
  }
}

window.handleSend = handleSend;

// ------------------------
// DETECTION MODE
// ------------------------
runDetectionBtn.addEventListener("click", async () => {
  const userUID = sessionStorage.getItem("userUID");
  if (!userUID) return;

  if (!(await creditGuard())) return;

  const text = detectInput.value.trim();
  if (!text) return;

  createBubble(text, "user");
  addMessage("user", text);

  const aiBubble = createBubble("", "ai", { scanning: true });
  detectInput.value = "";
  detectInput.disabled = true;
  runDetectionBtn.disabled = true;

  try {
    const res = await fetch("https://verihumanai.onrender.com/api/detect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document: text }),
    });

    const data = await res.json();
    aiBubble.classList.remove("scanning");

    const classification = data.document_classification || "UNKNOWN";
    let confidenceScore = 0;
    if (data.explanation) {
      const match = data.explanation.match(/Confidence Score:\s*([\d.]+)%/);
      if (match) confidenceScore = parseFloat(match[1]);
    }
    const explanation = data.explanation || "No explanation provided.";

    // Build result UI
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.alignItems = "center";
    container.style.gap = "10px";
    container.style.fontFamily = "'Exo 2', sans-serif";

    const confidenceEl = document.createElement("div");
    confidenceEl.textContent = `AI Likeliness: ${confidenceScore.toFixed(1)}%`;
    confidenceEl.style.fontSize = "1.3rem";
    confidenceEl.style.fontWeight = "700";
    confidenceEl.style.color = "#8ab6f9";
    container.appendChild(confidenceEl);

    const classEl = document.createElement("div");
    classEl.textContent = `Classification: ${classification}`;
    classEl.style.fontWeight = "600";
    container.appendChild(classEl);

    const explEl = document.createElement("div");
    explEl.textContent = explanation.length > 180 ? explanation.slice(0, 180) + "..." : explanation;
    explEl.style.fontSize = "0.9rem";
    explEl.style.textAlign = "center";
    container.appendChild(explEl);

    if (data.text_stats) {
      const ts = data.text_stats;
      const statsEl = document.createElement("div");
      statsEl.style.fontSize = "0.85rem";
      statsEl.style.textAlign = "center";
      statsEl.innerHTML = `
        • Total Sentences: ${ts.total_sentences}<br>
        • Highlighted as AI: ${ts.highlighted_as_ai}<br>
        ${ts.burstiness != null ? `• Burstiness: ${ts.burstiness}<br>` : ""}
      `;
      container.appendChild(statsEl);
    }

    aiBubble.innerHTML = "";
    aiBubble.appendChild(container);
    aiBubble.classList.add("detect-result");
    addCopyButton(aiBubble);

    addMessage("ai", "[AI Detection Result]");

    // ✅ Consume credit only after AI result
    await consumeCredit(userUID);

const savedId = await saveChatToHistory(
  userUID,
  text,
  JSON.stringify({ classification, confidenceScore, explanation }),
  window.isNewConversation,
  {
    mode: "detect",
    metadata: { classification, confidenceScore },
    chatId: window.currentChatId,
  }
);

if (savedId) {
  window.currentChatId = savedId;
  sessionStorage.setItem("currentChatId", savedId);
  window.isNewConversation = false;
}


    const creditInfo = await getCreditInfo(userUID);
    if (
      creditInfo.maxCredits !== "unlimited" &&
      creditInfo.usedCredits >= creditInfo.maxCredits
    ) {
      showCreditsModal();
      disableAllInputs();
    }

  } catch (err) {
    console.error("❌ Detection error:", err);
    aiBubble.textContent = "Detection failed. Try again.";
  } finally {
    detectInput.disabled = false;
    runDetectionBtn.disabled = false;
    detectInput.focus();
    scrollToBottom();
  }
});





// ------------------------
// HUMANIZER MODE
// ------------------------
runHumanizerBtn.addEventListener("click", async () => {
  const userUID = sessionStorage.getItem("userUID");
  if (!userUID) return;

  if (!(await creditGuard())) return;

  const text = humanizeInput.value.trim();
  if (!text) return;

  createBubble(text, "user");
  addMessage("user", text);

  const aiBubble = createBubble("", "ai", { scanning: true });
  humanizeInput.value = "";
  humanizeInput.disabled = true;
  runHumanizerBtn.disabled = true;

  try {
    const res = await fetch("https://verihumanai.onrender.com/api/humanize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
  throw new Error("Server error");
}

const data = await res.json();
    aiBubble.classList.remove("scanning");
    aiBubble.classList.add("humanizer-ai");

aiBubble.innerHTML = renderAIMessageToHTML(data.humanized_text);
addCopyButton(aiBubble);

    addMessage("ai", data.humanized_text);

    // ✅ Consume credit only after successful reply
    await consumeCredit(userUID);

const savedId = await saveChatToHistory(
  userUID,
  text,
  data.humanized_text,
  window.isNewConversation,
  {
    mode: "humanize",
    metadata: { model: "humanizer-model" },
    chatId: window.currentChatId,
  }
);

if (savedId) {
  window.currentChatId = savedId;
  sessionStorage.setItem("currentChatId", savedId);
  window.isNewConversation = false;
}

if (savedId) window.currentChatId = savedId;
isNewConversation = false;

    humanizerUI.classList.remove("hidden");
    if (!chatContainer.contains(humanizerUI)) {
      chatContainer.appendChild(humanizerUI);
    }

    const creditInfo = await getCreditInfo(userUID);
    if (
      creditInfo.maxCredits !== "unlimited" &&
      creditInfo.usedCredits >= creditInfo.maxCredits
    ) {
      showCreditsModal();
      disableAllInputs();
    }

  } catch (err) {
    console.error("❌ Humanizer error:", err);
    aiBubble.textContent = "Humanizer failed. Try again.";
  } finally {
    humanizeInput.disabled = false;
    runHumanizerBtn.disabled = false;
    humanizeInput.focus();
    scrollToBottom();
  }
});




// ------------------------
// Load previous chat on start
// ------------------------
// ------------------------
// Load previous chat on start
// ------------------------
async function init() {
  const userUID = sessionStorage.getItem("userUID");
  if (!userUID) return;

  try {
    await ensureUserCredits(userUID);

    const allowed = await creditGuard();
    if (!allowed) return;

    // ✅ NEW: getLatestChat now returns { chatId, messages }
    const latest = await getLatestChat(userUID);
    const latestMessages = latest?.messages || [];

    // ✅ store pointers for saving/appending later
    window.currentChatId = latest?.chatId || null;
if (window.currentChatId) sessionStorage.setItem("currentChatId", window.currentChatId);
else sessionStorage.removeItem("currentChatId");

    if (!Array.isArray(latestMessages) || latestMessages.length === 0) {
      isNewConversation = true;
      currentMode = "chat";

      modeButtons.forEach(btn => {
        btn.classList.toggle("active", btn.dataset.mode === currentMode);
      });

      updateModeUI();
      toggleScrollButton();
      return;
    }

    isNewConversation = false;

    latestMessages.forEach((m) => {
      const sender = m.sender === "ai" ? "ai" : "user";
      const bubble = createBubble(m.text, sender);

      if (m.mode === "detect") bubble.classList.add("detect-result");
      if (m.mode === "humanize") bubble.classList.add("humanizer-ai");
      if (m.metadata?.systemMessage) bubble.classList.add("system-message");

      addMessage(sender, m.text);
    });

    const lastModeMessage = latestMessages.slice().reverse().find(m => m.mode);
    currentMode = lastModeMessage?.mode || "chat";

    modeButtons.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.mode === currentMode);
    });

    updateModeUI();
  } catch (err) {
    console.warn("Could not load latest chat:", err);
    currentMode = "chat";
    updateModeUI();
    chatInput?.focus?.();
  }

  toggleScrollButton();
}





// ------------------------
// Start a new chat
// ------------------------
async function startNewChat() {
  const userUID = sessionStorage.getItem("userUID");

  // ✅ Save session snapshot (optional feature you already had)
  if (userUID && Array.isArray(currentChatMessages) && currentChatMessages.length > 0) {
    await saveFullChatSession(userUID, currentChatMessages);
  }

  // ✅ Reset Firestore pointer in firebase-history.js
  resetCurrentChatDoc(); // sets currentChatDocId = null (internal module state)

  // ✅ Reset UI pointer (THIS is what your app should use everywhere now)
  window.currentChatId = null;
  // ✅ Clear shareable chat link from URL
window.history.pushState({}, "", window.location.pathname);
sessionStorage.removeItem("currentChatId");

  // ✅ Reset local UI memory
  chatContainer.innerHTML = "";
  currentChatMessages = [];
window.isNewConversation = true;

  // ✅ Optional: reset current mode to chat (recommended)
  currentMode = "chat";
  localStorage.setItem("verihuman_mode", "chat");

  // Update mode buttons UI
  modeButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === "chat");
  });

  // Update the UI panels (chat input visible, others hidden)
  updateModeUI();

  // Banner
  const msg = document.createElement("div");
  msg.className = "new-chat-banner";
  msg.textContent = "🔹 New Conversation Started 🔹";
  msg.style.color = "#ffffff";
  chatContainer.appendChild(msg);

  // Reset mode inputs
  if (detectInput) detectInput.value = "";
  if (humanizeInput) humanizeInput.value = "";

  scrollToBottom();
}



  // Event listeners for new chat buttons
  newChatBtn?.addEventListener("click", startNewChat);
  newChatBtnMobile?.addEventListener("click", startNewChat);


  // make UI helpers globally accessible to other scripts
  window.createBubble = createBubble;
  window.addMessage = addMessage;
  window.typeText = typeText;
  window.scrollToBottom = scrollToBottom;




  // Start app
  init();


  
(function(){
  function startMatrix(){
    const canvas = document.getElementById("matrixCanvas");
    if (!canvas) return; // prevents crash if canvas is not on this page
    const ctx = canvas.getContext("2d");

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    let fontSize = width > 768 ? 24 : 16;
    ctx.font = `${fontSize}px 'Exo 2', sans-serif`;

    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()';
    const chars = characters.split('');

    let columns = Math.floor(width / fontSize);
    let drops = Array(columns).fill(0);

    // Default particle colors
    let colors = ['#cadcfc', '#8ab6f9', '#00246b'];

    // Overlay element
    const overlay = document.querySelector('.overlay');

    // Expose a function to change particle colors dynamically
    window.updateMatrixColors = function(newColors) {
      if (Array.isArray(newColors) && newColors.length) colors = newColors;
    };

    // Expose a function to change overlay background dynamically
    window.updateOverlayBackground = function(bg) {
      if (overlay) overlay.style.background = bg;
    };

    function draw() {
      ctx.fillStyle = 'rgba(0, 0, 20, 0.05)'; // fading trail
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < drops.length; i++) {
        const text = chars[(Math.random() * chars.length) | 0];
        ctx.fillStyle = colors[(Math.random() * colors.length) | 0];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        drops[i]++;
        if (drops[i] * fontSize > height && Math.random() > 0.975) drops[i] = 0;
      }

      requestAnimationFrame(draw);
    }

    draw();

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;

      fontSize = width > 768 ? 24 : 16;
      ctx.font = `${fontSize}px 'Exo 2', sans-serif`;

      columns = Math.floor(width / fontSize);
      drops = Array(columns).fill(0);
    });
  }

  // Run when DOM exists
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startMatrix);
  } else {
    startMatrix();
  }
})();


const fileBtn = document.querySelector(".file-upload-btn");
const fileInput = document.getElementById("fileInput");
const attachmentsPreview = document.getElementById("attachmentsPreview");

let selectedFiles = []; // holds File objects

fileBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", (e) => {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;

  // Append new picks (you can also replace instead of append if you prefer)
  selectedFiles = selectedFiles.concat(files);

  renderAttachmentsPreview();
  // reset input so user can pick same file again if needed
  fileInput.value = "";
});

function renderAttachmentsPreview() {
  attachmentsPreview.innerHTML = "";

  selectedFiles.forEach((file, idx) => {
    const chip = document.createElement("div");
    chip.className = "attachment-chip";

    // Thumbnail for images
    let thumbHTML = "";
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      thumbHTML = `<img src="${url}" alt="attachment" />`;
    } else {
      thumbHTML = `<div style="width:34px;height:34px;border-radius:8px;background:#8ab6f9;display:flex;align-items:center;justify-content:center;font-family:Exo 2,sans-serif;color:#00246b;">DOC</div>`;
    }

    chip.innerHTML = `
      ${thumbHTML}
      <div style="max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
        ${file.name}
      </div>
      <button type="button" class="attachment-remove" aria-label="Remove file">×</button>
    `;

    chip.querySelector(".attachment-remove").addEventListener("click", () => {
      selectedFiles.splice(idx, 1);
      renderAttachmentsPreview();
    });

    attachmentsPreview.appendChild(chip);
  });
}