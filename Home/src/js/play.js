import { supabase, logout } from "../../../utils/api.js";
import { safeAddListener } from "../../../utils/dom.js";
import { showError, showSuccess, showInfo } from "../../../utils/feedback.js";

document.addEventListener("DOMContentLoaded", async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

  await loadVideo(user, videoId);

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

async function loadVideo(user, videoId) {
  const { data: video, error } = await supabase
    .from("videos")
    .select(
      "id, title, description, mega_file_url, cost_credits, creator_id, profiles(username)",
    )
    .eq("id", videoId)
    .eq("status", "ready") // ✅ only allow ready videos
    .single();

  if (error || !video) {
    console.error("Video load error:", error?.message);
    showError("Failed to load video. Returning to feed...");
    window.location.href = "feed.html";
    return;
  }

  // Deduct credits from viewer
  const { error: deductError } = await supabase.rpc("deduct_credits", {
    user_id: user.id,
    amount: video.cost_credits,
  });
  if (deductError) {
    showError("Not enough credits to watch this video.");
    window.location.href = "feed.html";
    return;
  }

  // Add credits to creator
  await supabase.rpc("add_credits", {
    user_id: video.creator_id,
    amount: video.cost_credits,
  });

  // Record transaction
  await supabase.from("transactions").insert({
    video_id: video.id,
    viewer_id: user.id,
    creator_id: video.creator_id,
    credits_spent: video.cost_credits,
  });

  // Populate UI
  const playerEl = document.getElementById("videoPlayer");
  const titleEl = document.getElementById("videoTitle");
  const descEl = document.getElementById("videoDescription");
  const creatorEl = document.getElementById("videoCreator");
  const costEl = document.getElementById("videoCost");

  if (playerEl) {
    // ✅ Direct playback from MEGA link
    playerEl.src = video.mega_file_url;
    playerEl.load();
    showSuccess("Credits deducted. Video ready to play!", "toastContainer");
  }
  if (titleEl) titleEl.textContent = video.title;
  if (descEl) descEl.textContent = video.description || "";
  if (creatorEl)
    creatorEl.textContent = video.profiles?.username || video.creator_id;
  if (costEl) costEl.textContent = video.cost_credits;
}
