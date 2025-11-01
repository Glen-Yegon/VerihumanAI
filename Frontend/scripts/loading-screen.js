document.addEventListener("DOMContentLoaded", () => {
  const loaderWrapper = document.getElementById("loader-wrapper");
  const mainContent = document.getElementById("main-content");
  const loaderShown = sessionStorage.getItem("loaderShown");

  const title = document.getElementById("verihuman-title");

  if (!loaderShown) {
    // Show loader immediately
    loaderWrapper.style.display = "flex";
    mainContent.style.display = "none";

    // Run text animation
    if (title) {
      const text = title.textContent.trim();
      title.textContent = "";
      [...text].forEach((char, index) => {
        const span = document.createElement("span");
        span.textContent = char;
        title.appendChild(span);

        // Optional staggered appearance (cooler effect)
        setTimeout(() => {
          span.style.opacity = "1";
        }, index * 100);
      });
    }

    // Wait exactly 5 seconds before doing anything
    setTimeout(() => {
      const userUID = sessionStorage.getItem("userUID");

      // Hide loader
      loaderWrapper.style.display = "none";

      // Mark as shown
      sessionStorage.setItem("loaderShown", "true");

      if (!userUID) {
        // Redirect after loader finishes
        window.location.href = "sign.html";
      } else {
        mainContent.style.display = "block";
      }
    }, 5000);
  } else {
    // Loader already shown → skip it and show main content instantly
    loaderWrapper.style.display = "none";
    mainContent.style.display = "block";
  }
});


    document.addEventListener("DOMContentLoaded", () => {
  const title = document.getElementById("verihuman-title");
  const text = title.textContent.trim();
  title.textContent = "";
  [...text].forEach(char => {
    const span = document.createElement("span");
    span.textContent = char;
    title.appendChild(span);
  });
});