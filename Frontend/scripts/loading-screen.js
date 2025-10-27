document.addEventListener("DOMContentLoaded", () => {
  const loaderWrapper = document.getElementById("loader-wrapper");
  const mainContent = document.getElementById("main-content");

  // Check if loader was already shown in this session
  const loaderShown = sessionStorage.getItem("loaderShown");

  if (!loaderShown) {
    // Show loader for first visit
    loaderWrapper.style.display = "flex"; // ensure loader is visible

    setTimeout(() => {
      const userUID = sessionStorage.getItem("userUID");

      // Hide loader
      loaderWrapper.style.display = "none";

      // Mark loader as shown for this session
      sessionStorage.setItem("loaderShown", "true");

      if (!userUID) {
        // Not logged in → redirect to sign.html
        window.location.href = "sign.html";
      } else {
        // Logged in → show main content
        mainContent.style.display = "block";
      }
    }, 5000); // 5 seconds delay
  } else {
    // Loader already shown → skip it and show main content
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