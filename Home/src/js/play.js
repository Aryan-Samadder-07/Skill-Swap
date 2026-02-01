import { supabase, logout } from "../../../Landing Page/src/utils/api.js";
import { safeAddListener } from "../../../Landing Page/src/utils/dom.js";
import { showError, showSuccess, showInfo } from "../../../shared/feedback.js"; // adjust path

document.addEventListener("DOMContentLoaded", async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    showError("You must be logged in to view videos.");
    window.location.href = "../../../Landing Page/public/login.html";
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const videoId = params.get("video");
  if (!videoId) {
    showError("No video selected. Redirecting to feed...");
    window.location.href = "feed.html";
    return;
  }

  loadVideo(videoId);

  // ✅ Logout button
  safeAddListener("#logoutBtn", "click", async () => {
    const { error } = await logout();
    if (error) {
      showError(`Logout failed: ${error.message}`);
    } else {
      showInfo("You’ve been logged out. See you soon!");
      window.location.href = "../../../Landing Page/public/login.html";
    }
  });
});

async function loadVideo(videoId) {
  const { data: video, error } = await supabase
    .from("videos")
    .select("title, description, video_url, cost_credits, creator_id, profiles(username)")
    .eq("id", videoId)
    .single();

  if (error || !video) {
    console.error("Video load error:", error?.message);
    showError("Failed to load video. Returning to feed...");
    window.location.href = "feed.html";
    return;
  }

  const sourceEl = document.getElementById("videoSource");
  const playerEl = document.getElementById("videoPlayer");
  const titleEl = document.getElementById("videoTitle");
  const descEl = document.getElementById("videoDescription");
  const creatorEl = document.getElementById("videoCreator");
  const costEl = document.getElementById("videoCost");

  if (sourceEl && playerEl) {
    sourceEl.src = video.video_url;
    playerEl.load();
    showInfo("Video loaded successfully.");
  }
  if (titleEl) titleEl.textContent = video.title;
  if (descEl) descEl.textContent = video.description || "";
  if (creatorEl) creatorEl.textContent = video.profiles?.username || video.creator_id;
  if (costEl) costEl.textContent = video.cost_credits;
}