const hamburger = document.getElementById("hamburger");
const sideMenu = document.getElementById("sideMenu");
const closeBtn = document.getElementById("closeBtn");
const menuOverlay = document.getElementById("menuOverlay");

// Open menu
hamburger.addEventListener("click", () => {
  sideMenu.classList.add("active");
  menuOverlay.classList.add("active");
});

// Close menu
closeBtn.addEventListener("click", () => {
  sideMenu.classList.remove("active");
  menuOverlay.classList.remove("active");
});

// Close on overlay click
menuOverlay.addEventListener("click", () => {
  sideMenu.classList.remove("active");
  menuOverlay.classList.remove("active");
});


document.addEventListener("DOMContentLoaded", () => {
  const title = document.querySelector(".hero-title");
  const finalText = "VERIHUMAN";
  let iterations = 0;

  const shuffleInterval = setInterval(() => {
    title.textContent = finalText
      .split("")
      .map((letter, index) => {
        if (index < iterations) {
          return finalText[index];
        }
        return String.fromCharCode(65 + Math.floor(Math.random() * 26));
      })
      .join("");

    if (iterations >= finalText.length) {
      clearInterval(shuffleInterval);
    }
    iterations += 1/2; // speed control
  }, 100);

  // Stop after ~5 seconds
  setTimeout(() => {
    clearInterval(shuffleInterval);
    title.textContent = finalText;
  }, 5000);
});
