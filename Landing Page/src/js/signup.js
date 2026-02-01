// signup.js
import { supabase } from "../utils/api.js";
import { safeAddListener } from "../utils/dom.js";
import { showError, showSuccess, showInfo } from "../utils/feedback.js";

const BASE_URL = "https://ikixyxjmsmgdnmbtwnah.functions.supabase.co";
const LOGIN_PATH = "login.html";

document.addEventListener("DOMContentLoaded", () => {
  // ✅ Real-time validation rules
  const validators = {
    name: (val) => val.length >= 2 || "Name must be at least 2 characters.",
    email: (val) => /\S+@\S+\.\S+/.test(val) || "Enter a valid email address.",
    password: (val) =>
      val.length >= 8 || "Password must be at least 8 characters.",
    otp: (val) => val.length === 6 || "OTP must be 6 digits.",
  };

  // Attach input listeners for simple fields
  Object.keys(validators).forEach((field) => {
    const input = document.querySelector(`[name="${field}"]`);
    const errorEl = document.getElementById(`${field}Error`);
    if (input && errorEl) {
      input.addEventListener("input", () => {
        const result = validators[field](input.value.trim());
        if (result === true) {
          errorEl.textContent = "✅ Looks good!";
          errorEl.style.color = "#4caf50";
        } else {
          errorEl.textContent = result;
          errorEl.style.color = "#f44336";
        }
      });
    }
  });

  // ✅ Debounced username availability check
  const usernameInput = document.querySelector('[name="username"]');
  const usernameError = document.getElementById("usernameError");
  let usernameTimer;

  if (usernameInput && usernameError) {
    usernameInput.addEventListener("input", () => {
      clearTimeout(usernameTimer);
      usernameError.textContent = "Checking availability...";
      usernameError.style.color = "#2196f3"; // blue info

      usernameTimer = setTimeout(async () => {
        const val = usernameInput.value.trim();
        if (val.length < 3) {
          usernameError.textContent = "Username must be at least 3 characters.";
          usernameError.style.color = "#f44336";
          return;
        }

        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("username")
            .eq("username", val)
            .maybeSingle();

          if (error) {
            console.error("Username check error:", error);
            usernameError.textContent = "Error checking username.";
            usernameError.style.color = "#f44336";
          } else if (data) {
            usernameError.textContent = "Username is already taken.";
            usernameError.style.color = "#f44336";
          } else {
            usernameError.textContent = "✅ Username available!";
            usernameError.style.color = "#4caf50";
          }
        } catch (err) {
          console.error("Username check failed:", err);
          usernameError.textContent = "Error checking username.";
          usernameError.style.color = "#f44336";
        }
      }, 300); // debounce delay
    });
  }

  // ✅ Send OTP
  safeAddListener("#sendOtpBtn", "click", async () => {
    const emailInput = document.querySelector('[name="email"]');
    const emailError = document.getElementById("emailError");

    if (emailError) emailError.textContent = "";

    if (!emailInput.value.trim()) {
      if (emailError) {
        emailError.textContent = "Email is required.";
        emailError.style.color = "#f44336";
      }
      showError("Please enter your email first.", "toastContainer");
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput.value.trim() }),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result?.error || `Server error: ${response.status}`);

      if (result.success) {
        showSuccess(
          "OTP sent to your email. Check your inbox.",
          "toastContainer",
        );
        const otpSection = document.getElementById("otpSection");
        if (otpSection) otpSection.style.display = "block";
        if (emailError) {
          emailError.textContent = "✅ OTP sent!";
          emailError.style.color = "#4caf50";
        }
      } else {
        showError("Failed to send OTP.", "toastContainer");
      }
    } catch (err) {
      showError("Error sending OTP. Please try again.", "toastContainer");
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

    let hasError = false;

    // Run validators before submit
    for (const field of Object.keys(validators)) {
      const input = this.querySelector(`[name="${field}"]`);
      const errorEl = document.getElementById(`${field}Error`);
      if (input && errorEl) {
        const result = validators[field](input.value.trim());
        if (result !== true) {
          errorEl.textContent = result;
          errorEl.style.color = "#f44336";
          hasError = true;
        } else {
          errorEl.textContent = "✅ Looks good!";
          errorEl.style.color = "#4caf50";
        }
      }
    }

    // Username check before submit
    if (username.length < 3) {
      usernameError.textContent = "Username must be at least 3 characters.";
      usernameError.style.color = "#f44336";
      hasError = true;
    } else {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", username)
        .maybeSingle();

      if (data) {
        usernameError.textContent = "Username is already taken.";
        usernameError.style.color = "#f44336";
        hasError = true;
      } else {
        usernameError.textContent = "✅ Username available!";
        usernameError.style.color = "#4caf50";
      }
    }

    if (hasError) {
      showError("Please fix the highlighted errors.", "toastContainer");
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
          showSuccess(
            "Account created successfully! You can now log in.",
            "toastContainer",
          );
        } else {
          showInfo(
            "Account already exists. Profile linked successfully!",
            "toastContainer",
          );
        }
        window.location.href = LOGIN_PATH;
      } else {
        showError(`Signup failed: ${result.error}`, "toastContainer");
      }
    } catch (err) {
      showError("Error completing signup. Please try again.", "toastContainer");
      console.error("Signup error:", err);
    }
  });
});
