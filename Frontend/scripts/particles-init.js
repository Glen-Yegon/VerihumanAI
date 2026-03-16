document.addEventListener("DOMContentLoaded", function () {

  function initParticles() {
    if (!window.particlesJS) {
      // If CDN not ready yet, try again in 50ms
      setTimeout(initParticles, 50);
      return;
    }

    const container = document.getElementById("particles-js");
    if (!container) return;

    particlesJS("particles-js", {
      particles: {
        number: {
          value: 160,  // slightly lower for instant paint
          density: { enable: true, value_area: 800 }
        },
        color: { value: "#8ab6f9" },
        shape: { type: "circle" },
        opacity: { value: 0.5, random: true },
        size: { value: 3, random: true },
        line_linked: {
          enable: true,
          distance: 150,
          color: "#8ab6f9",
          opacity: 0.3,
          width: 1
        },
        move: {
          enable: true,
          speed: 2,
          random: true,
          out_mode: "out"
        }
      },
      interactivity: {
        detect_on: "canvas",
        events: {
          onhover: { enable: true, mode: "repulse" },
          onclick: { enable: true, mode: "push" },
          resize: true
        },
        modes: {
          repulse: { distance: 100 },
          push: { particles_nb: 4 }
        }
      },
      retina_detect: true
    });
  }

  initParticles();
});
