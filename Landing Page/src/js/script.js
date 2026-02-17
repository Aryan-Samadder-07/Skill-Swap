// Handle "Get Started" button navigation
document.getElementById("getStarted")?.addEventListener("click", () => {
  window.location.href = "Landing Page/public/signup.html";
});

// Smooth scroll for navigation links
document.querySelectorAll("nav a").forEach((link) => {
  link.addEventListener("click", (e) => {
    if (link.getAttribute("href").startsWith("#")) {
      e.preventDefault();
      const targetId = link.getAttribute("href").substring(1);
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
    }
  });
});

// Simple animation for hero text
window.addEventListener("DOMContentLoaded", () => {
  const heroText = document.querySelector(".hero-text");
  heroText.style.opacity = 0;
  setTimeout(() => {
    heroText.style.transition = "opacity 1.5s ease-in-out";
    heroText.style.opacity = 1;
  }, 300);
});
