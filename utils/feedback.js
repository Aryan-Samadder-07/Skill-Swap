// feedback.js

export function showToast(
  message,
  type = "info",
  containerId = "toastContainer",
) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Toast container "${containerId}" not found.`);
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Auto-remove after 3s with fade-out
  setTimeout(() => {
    toast.style.animation = "fadeOutToast 0.3s forwards";
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300); // remove after fade-out completes
  }, 3000);
}

export function showError(message, containerId = "toastContainer") {
  // Log once, no recursion
  console.error("Error:", message);
  showToast(message, "error", containerId);
}

export function showSuccess(message, containerId = "toastContainer") {
  console.log("Success:", message);
  showToast(message, "success", containerId);
}

export function showInfo(message, containerId = "toastContainer") {
  console.log("Info:", message);
  showToast(message, "info", containerId);
}
