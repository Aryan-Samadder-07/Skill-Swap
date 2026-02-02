import { supabase } from "../Landing Page/src/utils/api.js";
import {
  showError,
  showSuccess,
  showInfo,
} from "../Landing Page/src/utils/feedback.js";

const DEFAULT_AVATAR =
  "https://ikixyxjmsmgdnmbtwnah.supabase.co/storage/v1/object/public/avatars/defaultpfp.jpg";

document.addEventListener("DOMContentLoaded", async () => {
  const modal = document.getElementById("profileModal");
  const editBtn = document.getElementById("editProfileBtn");
  const closeBtn = document.querySelector(".close");

  // ✅ Guard against missing DOM elements
  if (!modal || !editBtn || !closeBtn) {
    console.error("Profile modal elements not found in DOM");
    return;
  }

  // ✅ Session guard
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    window.parent.postMessage({ type: "logout" }, "*");
    return;
  }

  // ✅ Modal logic using classList toggle
  editBtn.addEventListener("click", () => {
    modal.classList.remove("hidden"); // show modal
    modal.removeAttribute("aria-hidden");
    modal.removeAttribute("inert");
    document.getElementById("profileName").focus();
  });

  closeBtn.addEventListener("click", () => {
    modal.classList.add("hidden"); // hide modal
    modal.setAttribute("aria-hidden", "true");
    modal.setAttribute("inert", "");
    editBtn.focus();
  });

  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.add("hidden"); // hide modal
      modal.setAttribute("aria-hidden", "true");
      modal.setAttribute("inert", "");
      editBtn.focus();
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) {
      modal.classList.add("hidden"); // hide modal
      modal.setAttribute("aria-hidden", "true");
      modal.setAttribute("inert", "");
      editBtn.focus();
    }
  });

  // ✅ Ensure profile exists
  let { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("name, email, username, credits, bio, phone, avatar_url")
    .eq("id", user.id)
    .single();

  if (fetchError) {
    console.error("Profile fetch error:", fetchError.message);
    showError("Failed to fetch profile. Please try again later.");
  }

  if (!profile) {
    const { error: upsertError } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || "",
      username: user.user_metadata?.username || "",
      credits: 0,
    });

    if (upsertError) {
      console.error("Profile upsert error:", upsertError.message);
      showError(`Failed to create profile: ${upsertError.message}`);
    } else {
      ({ data: profile } = await supabase
        .from("profiles")
        .select("name, email, username, credits, bio, phone, avatar_url")
        .eq("id", user.id)
        .single());
    }
  }

  // ✅ Populate DOM
  if (profile) {
    document.getElementById("userName").textContent = profile.name || "";
    document.getElementById("userEmail").textContent =
      profile.email || user.email;
    document.getElementById("userUsername").textContent =
      profile.username || "";
    document.getElementById("userCredits").textContent = profile.credits ?? 0;
    document.getElementById("userBio").textContent = profile.bio || "";
    document.getElementById("userPhone").textContent = profile.phone || "";
    document.getElementById("userAvatar").src =
      profile.avatar_url || DEFAULT_AVATAR;

    // Pre-fill modal form
    document.getElementById("profileName").value = profile.name || "";
    document.getElementById("profileEmail").value = profile.email || user.email;
    document.getElementById("profileUsername").value = profile.username || "";
    document.getElementById("profileBio").value = profile.bio || "";
    document.getElementById("profilePhone").value = profile.phone || "";

    if (typeof loadTransactions === "function") {
      loadTransactions(user.id);
    }
  }

  // ✅ Avatar preview
  document
    .getElementById("profileAvatarFile")
    .addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        document.getElementById("avatarPreview").src =
          URL.createObjectURL(file);
        document.getElementById("avatarPreview").style.display = "block";
      }
    });

  // ✅ Save profile changes
  document
    .getElementById("profileForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      console.log("Save button clicked"); // Debug

      const name = document.getElementById("profileName").value;
      const username = document.getElementById("profileUsername").value;
      const bio = document.getElementById("profileBio").value;
      const phone = document.getElementById("profilePhone").value;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      let avatar_url = null;
      const fileInput = document.getElementById("profileAvatarFile");

      if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        // ✅ FIXED: remove extra "avatars/" prefix
        const filePath = `${user.id}/${Date.now()}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          console.error("Avatar upload error:", uploadError.message);
          showError(`Failed to upload avatar: ${uploadError.message}`);
          return; // stop execution if upload fails
        }

        const { data } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);
        avatar_url = data.publicUrl;
      }

      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email,
        name,
        username,
        bio,
        phone,
        ...(avatar_url && { avatar_url }),
      });

      if (error) {
        console.error("Profile upsert error:", error.message);
        showError(`Failed to update profile: ${error.message}`);
      } else {
        showSuccess("Profile updated successfully!");

        const { data: updated } = await supabase
          .from("profiles")
          .select("name, email, username, credits, bio, phone, avatar_url")
          .eq("id", user.id)
          .single();

        if (updated) {
          document.getElementById("userName").textContent = updated.name || "";
          document.getElementById("userEmail").textContent =
            updated.email || "";
          document.getElementById("userUsername").textContent =
            updated.username || "";
          document.getElementById("userCredits").textContent =
            updated.credits ?? 0;
          document.getElementById("userBio").textContent = updated.bio || "";
          document.getElementById("userPhone").textContent =
            updated.phone || "";
          document.getElementById("userAvatar").src =
            updated.avatar_url || DEFAULT_AVATAR;
        }

        // ✅ Hide modal consistently
        modal.classList.add("hidden");
        modal.setAttribute("aria-hidden", "true");
        modal.setAttribute("inert", "");
        editBtn.focus();
      }
    });
});
