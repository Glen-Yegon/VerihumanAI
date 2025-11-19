document.addEventListener("DOMContentLoaded", () => {
  const loaderWrapper = document.getElementById("loader-wrapper");
  const mainContent = document.getElementById("main-content");

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
