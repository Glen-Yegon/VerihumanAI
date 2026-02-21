import { getAllChats, getChatById } from "../firebase-config/firebase-history.js";
import { deleteChatHistory } from "../firebase-config/firebase-history.js";


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



document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const closeSidebar = document.getElementById("closeSidebar");
  const menuToggle = document.querySelector(".menu-toggle");
  const chatHistoryList = document.getElementById("chatHistoryList");
  const chatContainer = document.getElementById("chat-container");
  const userAvatar = document.getElementById("user-avatar");

  // globals
  window.currentChatId = null;
  window.currentChatMessages = [];
  window.isNewConversation = false;

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

// if using module imports:
// import { getChatById } from './firebase-history.js';
// import { createBubble } from './ui.js';

async function loadChatIntoContainer(chatId) {
  const userUID = sessionStorage.getItem("userUID");
  if (!userUID) {
    console.error("❌ No userUID found");
    return;
  }

  // Update URL (shareable) without reloading
  const newUrl = `${window.location.origin}${window.location.pathname}?chat=${encodeURIComponent(chatId)}`;
  window.history.pushState({ chatId }, "", newUrl);

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

  // Clear existing UI and local memory (if using)
  chatContainer.innerHTML = "";
  // if you keep currentChatMessages globally, set it:
  if (window.currentChatMessages && Array.isArray(window.currentChatMessages)) {
    window.currentChatMessages.length = 0;
  } else {
    window.currentChatMessages = [];
  }

  // Render messages
  chatData.messages.forEach((msg) => {
    // if createBubble is global:
    if (typeof window.createBubble === "function") {
      window.createBubble(msg.content, msg.role === "user" ? "user" : "ai");
    } else if (typeof createBubble === "function") {
      createBubble(msg.content, msg.role === "user" ? "user" : "ai");
    } else {
      // fallback simple rendering to avoid crash
      const p = document.createElement("div");
      p.textContent = `${msg.role}: ${msg.content}`;
      chatContainer.appendChild(p);
    }

    // keep local copy
    window.currentChatMessages.push({
      sender: msg.role === "user" ? "user" : "ai",
      text: msg.content,
      timestamp: new Date().toISOString(),
    });
  });

  // store current chatID in memory for later saves
  window.currentChatId = chatId;

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