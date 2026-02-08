import { supabase } from "../../../utils/api.js";
import { showError, showSuccess, showInfo } from "../../../utils/feedback.js"; // adjust path

let xhr; // keep reference globally

document.getElementById("uploadForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("videoTitle").value;
  const description = document.getElementById("videoDescription").value;
  const credits = parseInt(document.getElementById("videoCredits").value, 10);
  const file = document.getElementById("videoFile").files[0];

  if (!file) {
    showError("Please select a video file.");
    return;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    showError("You must be logged in to upload.");
    return;
  }

  const filePath = `videos/${user.id}/${Date.now()}-${file.name}`;
  const uploadUrl = `${supabase.storage.from("videos").getPublicUrl("").data.publicUrl}/${filePath}`;

  // ✅ Use XMLHttpRequest for progress + cancel
  xhr = new XMLHttpRequest();
  xhr.open("PUT", uploadUrl, true);
  xhr.setRequestHeader("Content-Type", file.type);

  xhr.upload.onprogress = (event) => {
    if (event.lengthComputable) {
      const percent = Math.round((event.loaded / event.total) * 100);
      document.getElementById("uploadProgress").value = percent;
      document.getElementById("progressText").textContent = `${percent}%`;
    }
  };

  xhr.onload = async () => {
    if (xhr.status === 200) {
      const video_url = uploadUrl;

      const { data: video, error: insertError } = await supabase
        .from("videos")
        .insert({
          creator_id: user.id,
          title,
          description,
          video_url,
          cost_credits: credits,
        })
        .select()
        .single();

      if (insertError) {
        showError(`Failed to save video: ${insertError.message}`);
        return;
      }

      await supabase.from("transactions").insert({
        video_id: video.id,
        viewer_id: user.id,
        creator_id: user.id,
        credits_spent: 0,
      });

      showSuccess("Video uploaded successfully!");
      window.location.href = "../../public/feed.html";
    } else {
      showError(`Upload failed: ${xhr.statusText}`);
    }
  };

  xhr.onerror = () => {
    showError("Upload error occurred.");
  };

  xhr.send(file);
});

// ✅ Cancel Upload button
document.getElementById("cancelUploadBtn").addEventListener("click", () => {
  if (xhr) {
    xhr.abort();
    document.getElementById("uploadProgress").value = 0;
    document.getElementById("progressText").textContent = "Cancelled";
    showInfo("Upload cancelled.");
  }
});
