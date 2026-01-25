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


// FAQ Accordion
const faqItems = document.querySelectorAll(".faq-item");

faqItems.forEach((item) => {
  const question = item.querySelector(".faq-question");
  question.addEventListener("click", () => {
    // Collapse others
    faqItems.forEach((other) => {
      if (other !== item) other.classList.remove("active");
    });
    // Toggle current
    item.classList.toggle("active");
  });
});
