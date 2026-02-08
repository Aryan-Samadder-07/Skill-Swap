/**
 * Safely attach an event listener to a single element by CSS selector.
 * @param {string} selector - CSS selector (e.g. "#id", ".class")
 * @param {string} event - Event type (e.g. "click", "submit")
 * @param {Function} handler - Callback function
 */
export function safeAddListener(selector, event, handler) {
  const el = document.querySelector(selector);
  if (el) {
    el.addEventListener(event, handler);
  } else {
    console.warn(`Element "${selector}" not found. Skipping ${event} listener.`);
  }
}

/**
 * Safely attach event listeners to multiple elements by CSS selector.
 * @param {string} selector - CSS selector (e.g. ".video-card button")
 * @param {string} event - Event type
 * @param {Function} handler - Callback function
 */
export function safeAddListeners(selector, event, handler) {
  const els = document.querySelectorAll(selector);
  if (els.length > 0) {
    els.forEach(el => el.addEventListener(event, handler));
  } else {
    console.warn(`No elements found for "${selector}". Skipping ${event} listeners.`);
  }
}