document.addEventListener("DOMContentLoaded", () => {
  const loaderWrapper = document.getElementById("loader-wrapper");
  const mainContent = document.getElementById("main-content");

  // Ensure main content exists
  if (!mainContent) {
    console.error("No element with id 'main-content' found. Please wrap your page content in <div id='main-content'>");
    return;
  }

  // Check if loader has already been shown
  const loaderShown = sessionStorage.getItem("loaderShown");

  if (loaderShown) {
    // Skip loader
    loaderWrapper.style.display = "none";
    mainContent.style.display = "block";
    return;
  }

  // Mark loader as shown
  sessionStorage.setItem("loaderShown", "true");

  // Ensure loader is visible
  loaderWrapper.style.display = "flex";
  loaderWrapper.style.opacity = "1";
  mainContent.style.display = "none";

  // Wait 5 seconds, then fade out loader
  setTimeout(() => {
    loaderWrapper.style.transition = "opacity 0.5s ease";
    loaderWrapper.style.opacity = "0";

    // Hide loader completely after fade
    setTimeout(() => {
      loaderWrapper.style.display = "none";
      mainContent.style.display = "block";
    }, 500); // match the fade duration
  }, 5000); // 5 seconds display
});
