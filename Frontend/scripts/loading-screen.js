document.addEventListener("DOMContentLoaded", () => {
  const loaderWrapper = document.getElementById("loader-wrapper");
  const mainContent = document.getElementById("main-content");

  // Check if loader has already been shown in this session
  const loaderShown = sessionStorage.getItem("loaderShown");

  if (loaderShown) {
    // Loader already shown → skip it
    loaderWrapper.style.display = "none";
    mainContent.style.display = "block";
    return;
  }

  // Mark loader as shown for this session
  sessionStorage.setItem("loaderShown", "true");

  // Show main content after loader disappears
  setTimeout(() => {
    // Fade out loader
    loaderWrapper.style.transition = "opacity 0.5s ease";
    loaderWrapper.style.opacity = "0";

    // After fade out completes, hide it completely
    setTimeout(() => {
      loaderWrapper.style.display = "none";
      mainContent.style.display = "block";
    }, 500); // matches fade duration
  }, 5000); // wait 5 seconds before starting fade
});
