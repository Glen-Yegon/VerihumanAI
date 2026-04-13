import {
  getAllChats,
  getChatById,
  deleteChatHistory,
  setCurrentChatDocId,
} from "../firebase-config/firebase-history.js";


window.addEventListener("DOMContentLoaded", () => {
    // Animate sidebar for desktop
    if (window.innerWidth > 768) {
        gsap.from(".sidebar", {
            x: "-100%",
            opacity: 0,
            duration: 2.5,
            ease: "power2.out"
        });
    }

    // Animate navbar for mobile
    if (window.innerWidth <= 768) {
        gsap.from(".mobile-header", {
            y: "-100%",
            opacity: 0,
            duration: 2.5,
            ease: "power2.out"
        });
    }
});




document.addEventListener("DOMContentLoaded", () => {
    const typingElement = document.getElementById("ai-typing");
    const chatBubble = document.querySelector(".ai-welcome-container");

    if (!typingElement || !chatBubble) return; // Safety check

    // ✅ Check if the bubble has already been shown in this session
    if (sessionStorage.getItem("aiWelcomeShown")) return;

const messages = [
    "Welcome to VeriHuman AI.",
    "VeriHuman AI lets you chat with AI, detect AI-generated content, and humanize text.",
    "Sign in to save conversations, manage credits, and securely access personalized features."
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



document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const closeSidebar = document.getElementById("closeSidebar");
  const menuToggle = document.querySelector(".menu-toggle");
  const chatHistoryList = document.getElementById("chatHistoryList");
  const chatContainer = document.getElementById("chat-container");
  const userAvatar = document.getElementById("user-avatar");

  // globals
window.currentChatId = window.currentChatId ?? null;
window.currentChatMessages = window.currentChatMessages ?? [];
window.isNewConversation = window.isNewConversation ?? false;

  if (!chatHistoryList || !chatContainer) {
    console.error("❌ Missing sidebar or chat container!");
    return;
  }

  // === Sidebar Toggle Logic ===
  sidebarToggle?.addEventListener("click", (e) => {
    e.stopPropagation();
    sidebar.classList.toggle("expanded");
    sidebarToggle.querySelector(".toggle-symbol").textContent =
      sidebar.classList.contains("expanded") ? "<" : ">";
    chatHistoryList.style.display = sidebar.classList.contains("expanded")
      ? "flex"
      : "none";
  });

  menuToggle?.addEventListener("click", (e) => {
    e.stopPropagation();
    sidebar.classList.add("expanded");
    chatHistoryList.style.display = "flex";
  });

  closeSidebar?.addEventListener("click", () => {
    sidebar.classList.remove("expanded");
    chatHistoryList.style.display = "none";
    sidebarToggle.querySelector(".toggle-symbol").textContent = ">";
  });

  // ✅ NEW: Close sidebar when avatar is clicked
  userAvatar?.addEventListener("click", (e) => {
    e.stopPropagation();
    sidebar.classList.remove("expanded");
    chatHistoryList.style.display = "none";
    sidebarToggle.querySelector(".toggle-symbol").textContent = ">";
  });

  document.addEventListener("click", (e) => {
    if (
      sidebar.classList.contains("expanded") &&
      !sidebar.contains(e.target) &&
      e.target !== sidebarToggle &&
      e.target !== menuToggle
    ) {
      sidebar.classList.remove("expanded");
      chatHistoryList.style.display = "none";
      sidebarToggle.querySelector(".toggle-symbol").textContent = ">";
    }
  });



// === Load chat history from Firestore ===
async function loadChatHistory() {
  const userUID = sessionStorage.getItem("userUID");
  if (!userUID) return;

  const chats = await getAllChats(userUID); // from firebase-history.js
  allChats = chats; // store all chats for search filtering

  chatHistoryList.innerHTML = "";

  if (!chats || chats.length === 0) {
    chatHistoryList.innerHTML =
      "<p style='padding:10px;color:gray;'>No conversations yet</p>";
    return;
  }

  chats.forEach((chat) => {
    const div = document.createElement("div");
    div.classList.add("chat-item");
    div.dataset.chatId = chat.id;
    div.textContent = chat.title || "Untitled Chat";

    div.addEventListener("click", () => loadChatIntoContainer(chat.id));

    chatHistoryList.appendChild(div);
  });
}

function renderDetectBubbleFromHistory(rawContent, chatContainer) {
  const wrapper = document.createElement("div");
  wrapper.classList.add("chat-wrapper", "ai");

  const avatarEl = document.createElement("div");
  avatarEl.className = "avatar";
  avatarEl.style.backgroundImage = "url('Images/veri-logo.png')";

  const bubble = document.createElement("div");
  bubble.classList.add("chat-bubble", "ai", "detect-result");

  let parsed = null;
  try { parsed = JSON.parse(rawContent); } catch (e) {}

  const rd = parsed?.renderData;

  if (!rd) {
    bubble.textContent = rawContent;
    wrapper.appendChild(avatarEl);
    wrapper.appendChild(bubble);
    chatContainer.appendChild(wrapper);
    return;
  }

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const pct = (n) => `${clamp(Number(n || 0), 0, 100).toFixed(1)}%`;

  function labelToFriendly(c) {
    if (c === "AI_ONLY") return "AI-written";
    if (c === "HUMAN_ONLY") return "Human-written";
    if (c === "MIXED") return "Mixed / Uncertain";
    return "Uncertain";
  }

  function confidenceLabel(aiPct, words) {
    if (words < 100) return "Low confidence (text is short)";
    if (aiPct >= 90 || aiPct <= 10) return "High confidence";
    if (aiPct >= 75 || aiPct <= 25) return "Medium confidence";
    return "Low–Medium confidence";
  }

  function explainSignals(features = {}) {
    const ttr = Number(features.ttr ?? 0);
    const rep = Number(features.rep_bigram_ratio ?? 0);
    const burst = Number(features.burstiness ?? 0);
    const bullets = [];
    if (ttr && ttr < 0.38) bullets.push("Vocabulary variety looks low (more repetitive wording).");
    else if (ttr) bullets.push("Vocabulary variety looks normal.");
    if (rep > 0.1) bullets.push("Repeated phrasing patterns show up across sentences.");
    else bullets.push("Not much repeated phrasing detected.");
    if (burst && burst < 0.2) bullets.push("Sentence lengths are very uniform (often AI-like).");
    else if (burst) bullets.push("Sentence length variation looks natural.");
    return bullets.slice(0, 4);
  }

  const {
    classification, confidenceScore, aiPct, humanPct,
    words, totalSentences, highlightedCount, engine,
    features = {}, sentences = []
  } = rd;

  const container = document.createElement("div");
  container.style.cssText = "display:flex;flex-direction:column;gap:12px;font-family:'Exo 2',sans-serif;width:100%";

  // Header
  const header = document.createElement("div");
  header.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:6px";
  const title = document.createElement("div");
  title.textContent = "AI Detection Result";
  title.style.cssText = "font-weight:800;font-size:1.05rem";
  header.appendChild(title);
  if (words < 100) {
    const warn = document.createElement("div");
    warn.textContent = "⚠️ Short text (under 100 words). The result may be less accurate.";
    warn.style.cssText = "font-size:0.9rem;opacity:0.9;text-align:center";
    header.appendChild(warn);
  }
  container.appendChild(header);

  // Score
  const scoreWrap = document.createElement("div");
  scoreWrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:4px";
  const scoreEl = document.createElement("div");
  scoreEl.textContent = `AI likelihood: ${pct(aiPct)}`;
  scoreEl.style.cssText = "font-size:1.35rem;font-weight:900;color:#8ab6f9";
  const classEl = document.createElement("div");
  classEl.textContent = `Overall: ${labelToFriendly(classification)} • ${confidenceLabel(aiPct, words)}`;
  classEl.style.cssText = "font-weight:600;text-align:center";
  const metaEl = document.createElement("div");
  metaEl.textContent = `Engine: ${engine} • ${words} words • ${totalSentences} sentences`;
  metaEl.style.cssText = "font-size:0.85rem;opacity:0.85;text-align:center";
  scoreWrap.append(scoreEl, classEl, metaEl);
  container.appendChild(scoreWrap);

  // Prob cards
  const probsWrap = document.createElement("div");
  probsWrap.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:8px";
  function probCard(label, value) {
    const box = document.createElement("div");
    box.style.cssText = "border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:10px;text-align:center";
    const l = document.createElement("div");
    l.textContent = label;
    l.style.cssText = "font-size:0.85rem;opacity:0.85";
    const v = document.createElement("div");
    v.textContent = pct(value);
    v.style.cssText = "font-size:1.05rem;font-weight:800";
    box.append(l, v);
    return box;
  }
  probsWrap.append(probCard("AI", aiPct), probCard("Human", humanPct));
  container.appendChild(probsWrap);

  // Why section
  const whyWrap = document.createElement("div");
  whyWrap.style.cssText = "border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:12px";
  const whyTitle = document.createElement("div");
  whyTitle.textContent = "Why this score?";
  whyTitle.style.cssText = "font-weight:800;margin-bottom:8px";
  whyWrap.appendChild(whyTitle);
  const ul = document.createElement("ul");
  ul.style.cssText = "margin:0;padding-left:18px;line-height:1.35";
  explainSignals(features).forEach(b => {
    const li = document.createElement("li");
    li.textContent = b;
    ul.appendChild(li);
  });
  whyWrap.appendChild(ul);
  container.appendChild(whyWrap);

  // Top sentences
  const top = sentences
    .filter(s => s && typeof s.sentence === "string")
    .map(s => ({ text: s.sentence.trim(), ai: Number(s.generated_prob ?? 0) }))
    .sort((a, b) => b.ai - a.ai)
    .slice(0, 5);

  if (top.length) {
    const topWrap = document.createElement("div");
    topWrap.style.cssText = "border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:12px";
    const topTitle = document.createElement("div");
    topTitle.textContent = "Top sentences driving the score";
    topTitle.style.cssText = "font-weight:800;margin-bottom:10px";
    topWrap.appendChild(topTitle);
    top.forEach(s => {
      const row = document.createElement("div");
      row.style.cssText = "padding:10px;border-radius:10px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.10)";
      const badge = document.createElement("div");
      badge.textContent = `Sentence AI: ${pct(clamp(s.ai * 100, 0, 100))}`;
      badge.style.cssText = "font-size:0.82rem;opacity:0.9";
      const sent = document.createElement("div");
      sent.textContent = s.text;
      sent.style.cssText = "margin-top:6px;font-size:0.95rem;line-height:1.35";
      row.append(badge, sent);
      topWrap.appendChild(row);
    });
    container.appendChild(topWrap);
  }

  // Note
  const guide = document.createElement("div");
  guide.style.cssText = "border:1px dashed rgba(255,255,255,0.18);border-radius:12px;padding:12px;font-size:0.9rem;opacity:0.95";
  guide.innerHTML = `<strong>Note:</strong> AI detection is not perfect. Editing, templates, and non-native English can change results.<br><br><strong>Tip:</strong> For a more reliable scan, use a longer excerpt (150–300+ words).`;
  container.appendChild(guide);

  // Footer
  const footer = document.createElement("div");
  footer.style.cssText = "font-size:0.85rem;opacity:0.85;text-align:center";
  footer.innerHTML = `• Sentences flagged as AI-like: ${highlightedCount}`;
  container.appendChild(footer);

  bubble.appendChild(container);
  wrapper.appendChild(avatarEl);
  wrapper.appendChild(bubble);
  chatContainer.appendChild(wrapper);
}


function renderHumanizeBubbleFromHistory(rawContent, chatContainer) {
  const wrapper = document.createElement("div");
  wrapper.classList.add("chat-wrapper", "ai");

  const avatarEl = document.createElement("div");
  avatarEl.className = "avatar";
  avatarEl.style.backgroundImage = "url('Images/veri-logo.png')";

  const bubble = document.createElement("div");
  bubble.classList.add("chat-bubble", "ai", "humanizer-ai");

  function escapeHTML(str = "") {
    return str
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function simpleRender(text) {
    const parts = String(text).split(/```/g);
    let html = `<div class="ai-rich">`;
    parts.forEach((chunk, i) => {
      if (i % 2 === 0) {
        const safe = escapeHTML(chunk).trim();
        if (safe) {
          safe.split(/\n\s*\n/).forEach(p => {
            html += `<p class="ai-text">${p.replace(/\n/g, "<br>").trim()}</p>`;
          });
        }
      } else {
        let code = chunk, lang = "";
        const nl = code.indexOf("\n");
        if (nl !== -1) { lang = code.slice(0, nl).trim(); code = code.slice(nl + 1); }
        html += `<div class="ai-codeblock">${lang ? `<div class="ai-code-lang">${escapeHTML(lang)}</div>` : ""}<pre><code>${escapeHTML(code.trim())}</code></pre></div>`;
      }
    });
    html += `</div>`;
    return html;
  }

  bubble.innerHTML = simpleRender(rawContent);
  wrapper.appendChild(avatarEl);
  wrapper.appendChild(bubble);
  chatContainer.appendChild(wrapper);
}

// if using module imports:
// import { getChatById } from './firebase-history.js';
// import { createBubble } from './ui.js';
async function loadChatIntoContainer(chatId) {
  const userUID = sessionStorage.getItem("userUID");
  if (!userUID) {
    console.error("❌ No userUID found");
    return;
  }

  // ✅ Mark as NOT a new conversation (prevents creating new chat doc on next save)
  window.isNewConversation = false;

  // ✅ Store current chat ID globally (UI pointer)
  window.currentChatId = chatId;

  // ✅ Keep in sessionStorage if you use it elsewhere (optional)
  sessionStorage.setItem("currentChatId", chatId);

  // Update URL (shareable) without reloading
  const newUrl = `${window.location.origin}${window.location.pathname}?chat=${encodeURIComponent(chatId)}`;
  window.history.pushState({ chatId }, "", newUrl);

  // ✅ Sync firebase-history.js internal pointer so saveChatToHistory appends to this chat
  // You must add `setCurrentChatDocId()` export in firebase-history.js (see step 2 below)
  try {
    if (typeof setCurrentChatDocId === "function") setCurrentChatDocId(chatId);
  } catch (e) {
    console.warn("⚠️ Could not sync currentChatDocId in firebase-history.js:", e);
  }

  // Fetch chat data
  let chatData;
  try {
    chatData = await getChatById(userUID, chatId);
  } catch (err) {
    console.error("Error fetching chat:", err);
    return;
  }

  if (!chatData) {
    console.warn("Chat not found:", chatId);
    return;
  }

  const chatContainer = document.getElementById("chat-container");
  if (!chatContainer) {
    console.error("❌ chat-container element not found");
    return;
  }

  // Clear UI + local memory
  chatContainer.innerHTML = "";

  if (window.currentChatMessages && Array.isArray(window.currentChatMessages)) {
    window.currentChatMessages.length = 0;
  } else {
    window.currentChatMessages = [];
  }

  // Render messages (with mode styling if present)
// Render messages (with mode styling if present)
  (chatData.messages || []).forEach((msg) => {
    const sender = msg.role === "user" ? "user" : "ai";
    const type = msg.metadata?.type || msg.mode || "chat";

    if (sender === "ai" && type === "detect") {
      renderDetectBubbleFromHistory(msg.content, chatContainer);
    } else if (sender === "ai" && type === "humanize") {
      renderHumanizeBubbleFromHistory(msg.content, chatContainer);
    } else {
      let bubble;
      if (typeof window.createBubble === "function") {
        bubble = window.createBubble(msg.content, sender);
      } else if (typeof createBubble === "function") {
        bubble = createBubble(msg.content, sender);
      } else {
        const p = document.createElement("div");
        p.textContent = `${msg.role}: ${msg.content}`;
        chatContainer.appendChild(p);
        bubble = null;
      }
      if (bubble && msg.metadata?.systemMessage) {
        bubble.classList.add("system-message");
      }
    }

    window.currentChatMessages.push({
      sender,
      text: msg.content,
      timestamp: msg.timestamp || new Date().toISOString(),
      mode: msg.mode || "chat",
      metadata: msg.metadata || {},
    });
  });

  // scroll to bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

window.loadChatIntoContainer = loadChatIntoContainer;




window.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const chatId = params.get("chat");

  if (chatId) {
    console.log("🔗 Chat link detected:", chatId);
    await loadChatIntoContainer(chatId);
  }
});





  // Initial load
  loadChatHistory();

  // Optional: Refresh chat list automatically when a new chat starts
  window.refreshChatHistory = loadChatHistory;
});




document.querySelectorAll('a[href="#"]').forEach(link => {
    link.addEventListener('click', e => e.preventDefault());
});



window.addEventListener("beforeunload", (e) => {
  console.log("⚠️ Page is unloading!", e);
});


const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault(); // ⛔ stop any reload/submit
    sendBtn.click();    // simulate click on Send button
  }
});


/* 
  document.addEventListener("DOMContentLoaded", () => {
    const links = document.querySelectorAll("a");
    const transition = document.getElementById("page-transition");

    // Function to disable transition when user uses back/forward
    window.addEventListener("pageshow", (event) => {
      const comingFromHistory =
        event.persisted ||
        window.performance.getEntriesByType("navigation")[0]?.type === "back_forward";

      if (comingFromHistory) {
        transition.classList.remove("active"); // No transition on back/forward
        sessionStorage.removeItem("transitioning");
      } else {
        // Normal link-based navigation
        if (sessionStorage.getItem("transitioning") === "true") {
          sessionStorage.setItem("transitioning", "false");
          transition.classList.remove("active"); // Fade in after animation
        } else {
          transition.classList.remove("active"); // Initial page load
        }
      }
    });

    links.forEach(link => {
      const href = link.getAttribute("href");
      if (href && !href.startsWith("#") && !href.startsWith("http")) {
        link.addEventListener("click", e => {
          e.preventDefault();
          sessionStorage.setItem("transitioning", "true");
          transition.classList.add("active");

          setTimeout(() => {
            window.location.href = href;
          }, 1500); // Match your CSS animation duration
        });
      }
    });
  });
*/

let chatIdPendingDelete = null;

const historyBtn = document.getElementById('historyBtn');
const chatHistoryModal = document.getElementById('chatHistoryModal');
const closeHistoryBtn = document.getElementById('closeHistoryBtn');
const chatHistoryListModal = document.getElementById('chatHistoryListModal');
const deleteConfirmModal = document.getElementById("deleteConfirmModal");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");


if (historyBtn && chatHistoryModal && closeHistoryBtn && chatHistoryListModal) {
  // Open Modal
  historyBtn.addEventListener('click', async () => {
    chatHistoryModal.classList.add('active');

    // Clear old list before refetching
    chatHistoryListModal.innerHTML = "<p style='color:gray;'>Loading...</p>";

    // Fetch user UID
    const userUID = sessionStorage.getItem('userUID');
    if (!userUID) {
      chatHistoryListModal.innerHTML = "<p style='color:red;'>User not found.</p>";
      return;
    }

    try {
      // 🔥 Fetch chat history dynamically from Firestore
      const chats = await getAllChats(userUID);
      chatHistoryListModal.innerHTML = '';

      if (!chats || chats.length === 0) {
        chatHistoryListModal.innerHTML = "<p style='color:gray;'>No conversations yet.</p>";
        return;
      }

      // Create chat items for modal
      chats.forEach(chat => {
        const div = document.createElement('div');
        div.classList.add('history-modal-item'); // ✅ unique to modal (no conflict)
        const titleSpan = document.createElement("span");
titleSpan.textContent = chat.title || "Untitled Chat";
div.appendChild(titleSpan);

        div.dataset.id = chat.id;

        // Highlight currently open chat (optional)
        const currentChatId = sessionStorage.getItem('currentChatId');
        if (chat.id === currentChatId) div.classList.add('active');

        div.addEventListener('click', async () => {
          await loadChatIntoContainer(chat.id);
          sessionStorage.setItem('currentChatId', chat.id);

          // Visually mark it active
          document.querySelectorAll('.history-modal-item').forEach(item => item.classList.remove('active'));
          div.classList.add('active');

          // Close modal after selection (especially for mobile)
          chatHistoryModal.classList.remove('active');
        });

        const deleteBtn = document.createElement("button");
deleteBtn.innerHTML = "🗑";
deleteBtn.classList.add("history-delete-btn");

deleteBtn.addEventListener("click", (e) => {
  e.stopPropagation(); // prevent opening chat
  chatIdPendingDelete = chat.id;
  deleteConfirmModal.classList.add("active");
});

div.appendChild(deleteBtn);


        chatHistoryListModal.appendChild(div);
      });
    } catch (err) {
      console.error('❌ Error loading chat history:', err);
      chatHistoryListModal.innerHTML = "<p style='color:red;'>Failed to load chats.</p>";
    }
  });

  // Close Modal (button)
  closeHistoryBtn.addEventListener('click', () => {
    chatHistoryModal.classList.remove('active');
  });

  // Close Modal (click outside content)
  chatHistoryModal.addEventListener('click', (e) => {
    if (e.target === chatHistoryModal) {
      chatHistoryModal.classList.remove('active');
    }
  });

  cancelDeleteBtn.addEventListener("click", () => {
  chatIdPendingDelete = null;
  deleteConfirmModal.classList.remove("active");
});

confirmDeleteBtn.addEventListener("click", async () => {
  if (!chatIdPendingDelete) return;

  const userUID = sessionStorage.getItem("userUID");
  await deleteChatHistory(userUID, chatIdPendingDelete);

  // Cleanup if current chat was deleted
  if (sessionStorage.getItem("currentChatId") === chatIdPendingDelete) {
    sessionStorage.removeItem("currentChatId");
  }

  chatIdPendingDelete = null;
  deleteConfirmModal.classList.remove("active");

  // Refresh history UI
  historyBtn.click();
});

}

// DOM Elements
const searchWrapper = document.getElementById("searchWrapper");
const searchBar = document.getElementById("searchBar");
const searchInput = document.getElementById("searchInput");
const closeSearchBtn = document.getElementById("closeSearchBtn");
const chatHistoryList = document.getElementById("chatHistoryList"); // your history container

// Keep a backup of all chats
let allChats = []; // will populate after fetching chat history

// Initialize search after loading chats
function initializeSearch(chats) {
  allChats = chats; // store original list
  renderChatList(allChats);
}

// Filter function
function filterChats(query) {
  const filtered = allChats.filter(chat =>
    chat.title.toLowerCase().includes(query.toLowerCase())
  );
  renderChatList(filtered);
}

// Render chat list (reusable)
function renderChatList(chats) {
  chatHistoryList.innerHTML = "";

  if (!chats.length) {
    chatHistoryList.innerHTML = `<p style="padding:10px;color:gray;">No chats found</p>`;
    return;
  }

  chats.forEach((chat) => {
    const div = document.createElement("div");
    div.classList.add("chat-item"); 
    div.dataset.chatId = chat.id;
    div.textContent = chat.title || "Untitled Chat";

    // Click handler
    div.addEventListener("click", () => loadChatIntoContainer(chat.id));

    chatHistoryList.appendChild(div);
  });
}

// -------------------
// EVENT LISTENERS
// -------------------

// Open search bar
searchWrapper.addEventListener("click", (e) => {
  if (!searchWrapper.classList.contains("active")) {
    searchWrapper.classList.add("active");
    searchInput.focus();
  }
});

// Close search bar
closeSearchBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  searchWrapper.classList.remove("active");
  searchInput.value = "";
  renderChatList(allChats); // reset to full list
});

// Live filter as user types
searchInput.addEventListener("input", (e) => {
  filterChats(e.target.value);
});

chatInput.addEventListener("input", () => {
  chatInput.style.height = "auto";                 // reset
  chatInput.style.height = chatInput.scrollHeight + "px"; // expand
});