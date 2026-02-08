// feedback.js
export function showToast(message, type = "info", containerId = "toastContainer") {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Toast container "${containerId}" not found.`);
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Auto-remove after 3s
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

export function showError(message, containerId = "toastContainer") {
  console.error(message);
  showToast(message, "error", containerId);
}

export function showSuccess(message, containerId = "toastContainer") {
  console.log(message);
  showToast(message, "success", containerId);
}

export function showInfo(message, containerId = "toastContainer") {
  showToast(message, "info", containerId);
}