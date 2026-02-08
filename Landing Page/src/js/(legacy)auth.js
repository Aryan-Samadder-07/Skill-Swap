import { login, logout, supabase } from "../utils/api.js";
import { safeAddListener } from "../utils/dom.js";
import { showError, showSuccess, showInfo } from "../utils/feedback.js"; // old path

const USE_LOCAL = false;
const BASE_URL = USE_LOCAL
  ? "http://localhost:8000"
  : "https://ikixyxjmsmgdnmbtwnah.functions.supabase.co";

document.addEventListener("DOMContentLoaded", () => {
  // ✅ Login form
  safeAddListener("#loginForm", "submit", async function (e) {
    e.preventDefault();

    const email = this.querySelector('[name="email"]').value.trim();
    const password = this.querySelector('[name="password"]').value.trim();

    if (!email || !password) {
      showError("Please enter both email and password.");
      return;
    }

    const { user, error } = await login(email, password);

    if (error) {
      showError(`Login failed: ${error.message}`);
    } else {
      showSuccess(`Welcome back, ${user?.email}!`);
      window.location.href = "../../Home/public/feed.html";
    }
  });

  // ✅ Send OTP
  safeAddListener("#sendOtpBtn", "click", async () => {
    const email = document.querySelector('[name="email"]').value.trim();

    if (!email) {
      showError("Please enter your email first.");
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok)
        throw new Error(result?.error || `Server error: ${response.status}`);

      if (result.success) {
        showSuccess("OTP sent to your email. Check your inbox.");
        const otpSection = document.getElementById("otpSection");
        if (otpSection) otpSection.style.display = "block";
      } else {
        showError("Failed to send OTP.");
      }
    } catch (err) {
      showError("Error sending OTP. Please try again.");
      console.error("Send OTP error:", err);
    }
  });

  // ✅ Signup form
  safeAddListener("#signupForm", "submit", async function (e) {
    e.preventDefault();

    const name = this.querySelector('[name="name"]').value.trim();
    const username = this.querySelector('[name="username"]').value.trim();
    const email = this.querySelector('[name="email"]').value.trim();
    const password = this.querySelector('[name="password"]').value.trim();
    const otp = this.querySelector('[name="otp"]').value.trim();

    if (!name || !username || !email || !password || !otp) {
      showError("All fields are required.");
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, password, name, username }),
      });

      const result = await response.json();

      if (!response.ok)
        throw new Error(result?.error || `Server error: ${response.status}`);

      if (result.success) {
        if (result.data?.user?.created_at) {
          showSuccess("Account created successfully! You can now log in.");
        } else {
          showInfo("Account already exists. Profile linked successfully!");
        }
        window.location.href = "login.html";
      } else {
        showError(`Signup failed: ${result.error}`);
      }
    } catch (err) {
      showError("Error completing signup. Please try again.");
      console.error("Signup error:", err);
    }
  });

  /*   // ✅ Logout
  safeAddListener("#logoutBtn", "click", async () => {
    const { error } = await logout();
    if (error) {
      showError(`Logout failed: ${error.message}`);
    } else {
      showInfo("You’ve been logged out. See you soon!");
      window.location.href = "login.html";
    }
  }); */

  // ✅ Session check
  (async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session && window.location.pathname.includes("login.html")) {
      showInfo("Already logged in, redirecting to dashboard...");
      window.location.href = "../../Home/public/feed.html";
    }
  })();
});
