import { supabase, logout } from "../../../utils/api.js";
import { safeAddListener } from "../../../utils/dom.js";
import { showError, showSuccess, showInfo } from "../../../utils/feedback.js";

// ✅ Centralized paths
const LANDING_PATH = "../../index.html";
const PLAY_PATH = "play.html";

document.addEventListener("DOMContentLoaded", async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    showError("You must be logged in to view the feed.");
    window.location.href = LANDING_PATH;
    return;
  }

  // Show skeletons immediately
  showSkeletons();

  // Load feed
  await loadFeed(user);

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
  const list = document.getElementById("videoList");
  if (!list) return;

  // ✅ Fetch ready videos (now using mega_file_url instead of mux_playback_id)
  const { data: readyVideos, error: readyError } = await supabase
    .from("videos")
    .select(
      "id, title, description, thumbnail_url, cost_credits, creator_id, mega_file_url, status",
    )
    .eq("status", "ready");

  // ✅ Fetch processing videos
  const { data: processingVideos, error: processingError } = await supabase
    .from("videos")
    .select(
      "id, title, description, thumbnail_url, cost_credits, creator_id, status",
    )
    .in("status", ["uploaded", "processing"]);

  if (readyError || processingError) {
    console.error(
      "Feed error:",
      readyError?.message || processingError?.message,
    );
    showError("Failed to load feed. Please try again later.");
    return;
  }

  list.innerHTML = "";

  // ✅ Section: Ready Videos
  if (readyVideos?.length) {
    const readyHeader = document.createElement("h2");
    readyHeader.textContent = "Ready to Watch";
    list.appendChild(readyHeader);

    readyVideos.forEach((video, index) => {
      const card = document.createElement("div");
      card.className = "video-card fade-in";
      card.style.animationDelay = `${index * 0.1}s`;

      const link = document.createElement("a");
      // Pass video.id to play.html, which will fetch mega_file_url
      link.href = `${PLAY_PATH}?video=${video.id}`;

      const thumb = document.createElement("img");
      thumb.src = video.thumbnail_url || "default-thumbnail.jpg";
      thumb.alt = video.title;
      thumb.className = "video-thumb";

      const overlay = document.createElement("div");
      overlay.className = "overlay";

      link.appendChild(thumb);
      link.appendChild(overlay);

      const title = document.createElement("h3");
      title.textContent = video.title;

      const desc = document.createElement("p");
      desc.textContent = video.description || "";

      const cost = document.createElement("p");
      cost.textContent = `Cost: ${video.cost_credits} credits`;

      card.appendChild(link);
      card.appendChild(title);
      card.appendChild(desc);
      card.appendChild(cost);

      list.appendChild(card);
    });
  }

  // ✅ Section: Processing Videos
  if (processingVideos?.length) {
    const processingHeader = document.createElement("h2");
    processingHeader.textContent = "Processing Videos";
    list.appendChild(processingHeader);

    processingVideos.forEach((video, index) => {
      const card = document.createElement("div");
      card.className = "video-card processing fade-in";
      card.style.animationDelay = `${index * 0.1}s`;

      const thumb = document.createElement("img");
      thumb.src = video.thumbnail_url || "default-thumbnail.jpg";
      thumb.alt = video.title;
      thumb.className = "video-thumb";

      const title = document.createElement("h3");
      title.textContent = video.title;

      const desc = document.createElement("p");
      desc.textContent = video.description || "";

      const status = document.createElement("p");
      status.textContent = "⏳ Processing... Please check back later.";

      card.appendChild(thumb);
      card.appendChild(title);
      card.appendChild(desc);
      card.appendChild(status);

      list.appendChild(card);
    });
  }
}

// ✅ Skeleton shimmer placeholders
function showSkeletons(count = 6) {
  const list = document.getElementById("videoList");
  if (!list) return;
  list.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const card = document.createElement("div");
    card.className = "video-card skeleton";
    card.innerHTML = `
      <div class="skeleton-thumb"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
    `;
    list.appendChild(card);
  }
}
