// feed.js
import { supabase, logout } from "../../../utils/api.js";
import { safeAddListener, safeAddListeners } from "../../../utils/dom.js";
import { showError, showSuccess, showInfo } from "../../../utils/feedback.js";

// ✅ Centralized paths
const LANDING_PATH = "../../index.html";
const PLAY_PATH = "../../public/play.html";

document.addEventListener("DOMContentLoaded", async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    showError("You must be logged in to view the feed.");
    window.location.href = LANDING_PATH;
    return;
  }

  loadFeed(user);

  // ✅ Logout button
  safeAddListener("#logoutBtn", "click", async () => {
    const { error } = await logout();
    if (error) {
      showError(`Logout failed: ${error.message}`);
    } else {
      showInfo("You've been logged out. See you soon!");
      window.location.href = LANDING_PATH;
    }
  });

  // ✅ Listen for logout messages from dashboard iframe
  window.addEventListener("message", (event) => {
    if (event.data.type === "logout") {
      showInfo("Session ended. Redirecting to login...");
      window.location.href = LANDING_PATH;
    }
  });
});

async function loadFeed(user) {
  const { data: videos, error } = await supabase
    .from("videos")
    .select("id, title, description, video_url, cost_credits, creator_id");

  if (error) {
    console.error("Feed error:", error.message);
    showError("Failed to load feed. Please try again later.");
    return;
  }

  const list = document.getElementById("videoList");
  if (!list) return;
  list.innerHTML = "";

  videos.forEach((video) => {
    const card = document.createElement("div");
    card.className = "video-card";
    card.innerHTML = `
      <h3>${video.title}</h3>
      <p>${video.description || ""}</p>
      <p>Cost: ${video.cost_credits} credits</p>
      <button data-id="${video.id}" data-cost="${video.cost_credits}" data-creator="${video.creator_id}">
        Watch
      </button>
    `;
    list.appendChild(card);
  });

  // ✅ Attach watch handlers
  safeAddListeners(".video-card button", "click", async (e) => {
    const videoId = e.target.dataset.id;
    const costCredits = parseInt(e.target.dataset.cost, 10);
    const creatorId = e.target.dataset.creator;

    const { error: deductError } = await supabase.rpc("deduct_credits", {
      user_id: user.id,
      amount: costCredits,
    });

    if (deductError) {
      showError("Not enough credits to watch this video.");
      return;
    }

    await supabase.rpc("add_credits", {
      user_id: creatorId,
      amount: costCredits,
    });

    await supabase.from("transactions").insert({
      video_id: videoId,
      viewer_id: user.id,
      creator_id: creatorId,
      credits_spent: costCredits,
    });

    showSuccess("Credits deducted. Opening video...");
    window.open(`${PLAY_PATH}?video=${videoId}`, "_blank");
  });
}
