// login.js
import { login, supabase } from "../../../utils/api.js";
import { safeAddListener } from "../../../utils/dom.js";
import { showError, showSuccess, showInfo } from "../../../utils/feedback.js";

// ✅ Centralized paths
const FEED_PATH = "../../Home/public/feed.html";

document.addEventListener("DOMContentLoaded", () => {
  // ✅ Login form
  safeAddListener("#loginForm", "submit", async function (e) {
    e.preventDefault();

    const emailInput = this.querySelector('[name="email"]');
    const passwordInput = this.querySelector('[name="password"]');
    const emailError = document.getElementById("emailError");
    const passwordError = document.getElementById("passwordError");

    // Reset inline errors
    if (emailError) emailError.textContent = "";
    if (passwordError) passwordError.textContent = "";

    let hasError = false;

    if (!emailInput.value.trim()) {
      if (emailError) emailError.textContent = "Email is required.";
      hasError = true;
    }
    if (!passwordInput.value.trim()) {
      if (passwordError) passwordError.textContent = "Password is required.";
      hasError = true;
    }

    if (hasError) {
      showError("Please fix the highlighted errors.", "toastContainerAuth");
      return;
    }

    const { user, error } = await login(
      emailInput.value.trim(),
      passwordInput.value.trim(),
    );

    if (error) {
      showError(`Login failed: ${error.message}`, "toastContainerAuth");
    } else {
      showSuccess(`Welcome back, ${user?.email}!`, "toastContainerAuth");
      window.location.href = FEED_PATH;
    }
  });

  // ✅ Session check
  (async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      showInfo(
        "Already logged in, redirecting to feed...",
        "toastContainerAuth",
      );
      window.location.href = FEED_PATH;
    }
  })();
});
