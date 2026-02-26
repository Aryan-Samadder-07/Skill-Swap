import { supabase } from "../../../utils/api.js";
import { safeAddListener } from "../../../utils/dom.js";
import { showError, showSuccess, showInfo } from "../../../utils/feedback.js";

const BASE_URL = "http://localhost:3000"; // Node.js MEGA service
const EDGE_URL =
  "https://ikixyxjmsmgdnmbtwnah.supabase.co/functions/v1/mega-ingest"; // Supabase Edge Function

document.addEventListener("DOMContentLoaded", () => {
  safeAddListener("#uploadForm", "submit", async function (e) {
    e.preventDefault();

    const title = this.querySelector("#videoTitle").value.trim();
    const description = this.querySelector("#videoDescription").value.trim();
    const credits = parseInt(this.querySelector("#videoCredits").value, 10);
    const file = this.querySelector("#videoFile").files[0];

    const progressBar = document.getElementById("uploadProgress");
    const progressText = document.getElementById("progressText");
    const resultBox = document.getElementById("uploadResult");

    if (!file) {
      showError("Please select a video file.", "toastContainer");
      return;
    }

    try {
      progressText.textContent = "Preparing upload...";
      progressBar.value = 20;

      // Step 1: Generate a unique videoId
      const videoId = crypto.randomUUID();

      // Step 2: Call Edge Function to insert metadata (no JWT required)
      const edgeResp = await fetch(EDGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          title,
          description,
          creator_id: user.id || "anonymous", // or session.user.id if you want to track users
          cost_credits: credits,
        }),
      });

      const edgeData = await edgeResp.json();
      if (!edgeData.success) {
        throw new Error(edgeData.error || "Metadata insert failed");
      }

      progressBar.value = 40;
      progressText.textContent = "Generating thumbnail...";

      // Step 3: Capture thumbnail frame
      const thumbnailBlob = await new Promise((resolve, reject) => {
        const videoEl = document.createElement("video");
        videoEl.src = URL.createObjectURL(file);
        videoEl.currentTime = 2;
        videoEl.muted = true;
        videoEl.playsInline = true;

        videoEl.onloadeddata = () => {
          const canvas = document.createElement("canvas");
          canvas.width = videoEl.videoWidth;
          canvas.height = videoEl.videoHeight;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to generate thumbnail"));
          }, "image/jpeg");
        };

        videoEl.onerror = reject;
      });

      progressBar.value = 60;
      progressText.textContent = "Uploading to Node service...";

      // Step 4: Send video + thumbnail to Node backend
      const formData = new FormData();
      formData.append("file", file, file.name);
      formData.append("videoId", videoId);
      formData.append("thumbnail", thumbnailBlob, `thumb-${Date.now()}.jpg`);

      const response = await fetch(`${BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || `Upload error: ${response.status}`);
      }

      progressBar.value = 80;
      progressText.textContent = "Finalizing upload...";

      // Step 5: Poll Supabase for status
      pollVideoStatus(videoId, progressBar, progressText, resultBox);
    } catch (err) {
      showError(`Error: ${err.message}`, "toastContainer");
      console.error("Upload error:", err);
    }
  });

  safeAddListener("#cancelUploadBtn", "click", () => {
    const progressBar = document.getElementById("uploadProgress");
    const progressText = document.getElementById("progressText");
    progressBar.value = 0;
    progressText.textContent = "Cancelled";
    showInfo("Upload cancelled.", "toastContainer");
  });
});

async function pollVideoStatus(videoId, progressBar, progressText, resultBox) {
  const interval = setInterval(async () => {
    const { data, error } = await supabase
      .from("videos")
      .select("status, video_url, thumbnail_url")
      .eq("id", videoId)
      .single();

    if (error) {
      console.error("Polling error:", error);
      clearInterval(interval);
      return;
    }

    if (data.status === "ready") {
      clearInterval(interval);
      progressBar.value = 100;
      progressText.textContent = "Upload complete";
      showSuccess("Video uploaded to MEGA successfully!", "toastContainer");

      if (resultBox) {
        resultBox.innerHTML = `
          <p><strong>Upload finished!</strong></p>
          <p>Video ID: ${videoId}</p>
          <p>MEGA URL: ${data.video_url}</p>
          <p>Thumbnail: ${data.thumbnail_url}</p>
        `;
      }
    } else {
      progressText.textContent = `Status: ${data.status}...`;
    }
  }, 5000);
}
