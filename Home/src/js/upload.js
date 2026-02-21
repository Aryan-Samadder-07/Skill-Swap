import { supabase } from "../../../utils/api.js";
import { showError, showSuccess, showInfo } from "../../../utils/feedback.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("uploadForm");
  const cancelBtn = document.getElementById("cancelUploadBtn");
  const progressBar = document.getElementById("uploadProgress");
  const progressText = document.getElementById("progressText");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("Upload form submitted");

    const title = document.getElementById("videoTitle").value;
    const description = document.getElementById("videoDescription").value;
    const credits = parseInt(document.getElementById("videoCredits").value, 10);
    const file = document.getElementById("videoFile").files[0];

    if (!file) {
      showError("Please select a video file.");
      console.log("No file selected");
      return;
    }
    console.log("File selected:", file.name);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      showError("You must be logged in to upload.");
      console.log("User not logged in");
      return;
    }
    console.log("User:", user.id);

    try {
      const filePath = `${user.id}/${Date.now()}-${encodeURIComponent(file.name)}`;
      console.log("Uploading to path:", filePath);

      const { data, error } = await supabase.storage
        .from("videos")
        .upload(filePath, file);

      if (error) {
        showError(`Upload failed: ${error.message}`);
        console.error("Upload error:", error);
        return;
      }

      progressBar.value = 100;
      progressText.textContent = "100%";

      const { data: publicUrlData } = supabase.storage
        .from("videos")
        .getPublicUrl(filePath);

      const video_url = publicUrlData.publicUrl;
      console.log("Public URL:", video_url);

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
        console.error("Insert error:", insertError);
        return;
      }

      await supabase.from("transactions").insert({
        video_id: video.id,
        viewer_id: user.id,
        creator_id: user.id,
        credits_spent: 0,
      });

      showSuccess("Video uploaded successfully!");
      console.log("Upload complete, redirecting...");
      window.location.href = "../../public/feed.html";
    } catch (err) {
      showError(`Unexpected error: ${err.message}`);
      console.error("Unexpected error:", err);
    }
  });

  cancelBtn.addEventListener("click", () => {
    progressBar.value = 0;
    progressText.textContent = "Cancelled";
    showInfo("Upload cancelled.");
    console.log("Upload cancelled");
  });
});
