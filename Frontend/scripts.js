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




const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const closeSidebar = document.getElementById("closeSidebar");
const menuToggle = document.querySelector(".menu-toggle");

// Desktop expand/collapse
sidebarToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  sidebar.classList.toggle("expanded");
  sidebarToggle.querySelector(".toggle-symbol").textContent =
    sidebar.classList.contains("expanded") ? "<" : ">";
});

// Mobile: open sidebar with hamburger menu
menuToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  sidebar.classList.add("expanded");
});

// Close button
closeSidebar.addEventListener("click", () => {
  sidebar.classList.remove("expanded");
  sidebarToggle.querySelector(".toggle-symbol").textContent = ">";
});

// Close on outside click
document.addEventListener("click", (e) => {
  if (
    sidebar.classList.contains("expanded") &&
    !sidebar.contains(e.target) &&
    e.target !== sidebarToggle &&
    e.target !== menuToggle
  ) {
    sidebar.classList.remove("expanded");
    sidebarToggle.querySelector(".toggle-symbol").textContent = ">";
  }
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

  