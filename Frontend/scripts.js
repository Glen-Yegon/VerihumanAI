import { getAllChats, getChatById } from "./firebase-history.js";


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


const canvas = document.getElementById("text-particles");
const ctx = canvas.getContext("2d");
let width, height;
const dpr = window.devicePixelRatio || 1;

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;

  // Style size
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";

  // Actual pixel size for crispness
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  // Scale context
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  initTextParticles();
}
window.addEventListener("resize", resize);

class Particle {
  constructor(x, y) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.destX = x;
    this.destY = y;
    this.vx = (Math.random() - 0.5) * 15;
    this.vy = (Math.random() - 0.5) * 15;
    this.size = 2.5;
    this.friction = 0.85;
    this.ease = 0.1;
  }
  update() {
    this.vx *= this.friction;
    this.vy *= this.friction;
    this.x += this.vx;
    this.y += this.vy;

    let dx = this.destX - this.x;
    let dy = this.destY - this.y;

    this.vx += dx * this.ease;
    this.vy += dy * this.ease;
  }
  draw() {
    ctx.fillStyle = "#cadcfc";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

let particles = [];

function initTextParticles() {
  ctx.clearRect(0, 0, width, height);

  // Responsive font size (max 120px, smaller on small screens)
  const fontSize = Math.min(120, width / 10);
  ctx.font = `900 ${fontSize}px Poppins, "Exo 2", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle"; // This centers text vertically

  // Draw the text exactly at center
  ctx.fillText("VERIHUMAN", width / 2.5, height / 2.5);

  const textCoordinates = ctx.getImageData(0, 0, width, height);

  particles = [];
  const gap = 7;

  for (let y = 0; y < height; y += gap) {
    for (let x = 0; x < width; x += gap) {
      let alpha = textCoordinates.data[(y * width + x) * 4 + 3];
      if (alpha > 128) {
        particles.push(new Particle(x, y));
      }
    }
  }
}


function animateTextParticles() {
  ctx.clearRect(0, 0, width, height);
  for (let p of particles) {
    p.update();
    p.draw();
  }
  requestAnimationFrame(animateTextParticles);
}

// Scatter effect on mouse move
window.addEventListener("mousemove", (e) => {
  const mouseX = e.clientX;
  const mouseY = e.clientY;
  const radius = 120;

  particles.forEach(p => {
    const dx = p.x - mouseX;
    const dy = p.y - mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < radius) {
      const force = (radius - dist) / radius;
      p.vx += (dx / dist) * force * 7;
      p.vy += (dy / dist) * force * 7;
    }
  });
});

resize();
animateTextParticles();



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

  // These globals let us talk to scripts.js logic
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

    const chats = await getAllChats(userUID); // 👈 from firebase-history.js
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

      if (chat.id === window.currentChatId) div.classList.add("active");

div.dataset.id = chat.id;
div.addEventListener("click", () => loadChatIntoContainer(chat.id));


      chatHistoryList.appendChild(div);
    });
  }

  async function loadChatIntoContainer(chatId) {
  const userUID = sessionStorage.getItem("userUID");
  if (!userUID) return console.error("❌ No userUID found");

  const chatData = await getChatById(userUID, chatId);
  if (!chatData) return;

 const chatContainer = document.getElementById("chat-container");

  if (!chatContainer) return console.error("❌ chatContainer not found");

  chatContainer.innerHTML = ""; // clear old content

  chatData.messages.forEach((msg) => {
    // Create bubbles like in your handleSend()
    createBubble(msg.content, msg.role === "user" ? "user" : "ai");
  });

  // highlight active chat
  document.querySelectorAll(".chat-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.id === chatId);
  });

  // update global currentChatId
  currentChatId = chatId;
}


  // === Load a specific chat into the chat container ===
  async function loadChat(chat) {
    if (!chatContainer) return;

    window.currentChatId = chat.id;
    window.isNewConversation = false; // this is an existing one
    window.currentChatMessages = chat.messages || [];

    // 🧠 Move this chat to the top (like most recent)
    const chatItem = Array.from(chatHistoryList.children).find(
      (el) => el.dataset.chatId === chat.id
    );
    if (chatItem) {
      chatItem.classList.add("active");
      chatHistoryList.prepend(chatItem);
    }

    // Clear previous chat bubbles
    chatContainer.innerHTML = "";

    // Load all previous messages
    chat.messages.forEach((msg) => {
      createBubble(msg.text, msg.sender === "ai" ? "ai" : "user");
    });

    // Highlight active
    document.querySelectorAll(".chat-item").forEach((item) =>
      item.classList.remove("active")
    );
    chatItem?.classList.add("active");

    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;

    console.log(`📂 Loaded chat: ${chat.title || chat.id}`);
  }

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

  
const historyBtn = document.getElementById('historyBtn');
const chatHistoryModal = document.getElementById('chatHistoryModal');
const closeHistoryBtn = document.getElementById('closeHistoryBtn');
const chatHistoryListModal = document.getElementById('chatHistoryListModal');

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
        div.textContent = chat.title || 'Untitled Chat';
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
}
