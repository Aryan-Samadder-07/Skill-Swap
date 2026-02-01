import { supabase } from "../Landing Page/src/utils/api.js";
import {
  showError,
  showSuccess,
  showInfo,
} from "../Landing Page/src/utils/feedback.js"; // adjust path

// ✅ Hosted default avatar URL
const DEFAULT_AVATAR =
  "https://ikixyxjmsmgdnmbtwnah.supabase.co/storage/v1/object/public/avatars/defaultpfp.jpg";

// ✅ Modal references
const modal = document.getElementById("profileModal");
const editBtn = document.getElementById("editProfileBtn");
const closeBtn = document.querySelector(".close");

// ✅ Session guard
const {
  data: { user },
} = await supabase.auth.getUser();
if (!user) {
  // Instead of redirecting inside iframe, notify parent
  window.parent.postMessage({ type: "logout" }, "*");
} else {
  // ✅ Modal logic
  editBtn.addEventListener("click", () => {
    modal.style.display = "block";
    modal.removeAttribute("aria-hidden");
    modal.removeAttribute("inert");
    document.getElementById("profileName").focus();
  });

  closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
    modal.setAttribute("inert", "");
    editBtn.focus();
  });

  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
      modal.setAttribute("inert", "");
      editBtn.focus();
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.style.display === "block") {
      modal.style.display = "none";
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

    // ✅ Load transactions after profile
    loadTransactions(user.id);
  }
}

// ✅ Avatar preview
document.getElementById("profileAvatarFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    document.getElementById("avatarPreview").src = URL.createObjectURL(file);
    document.getElementById("avatarPreview").style.display = "block";
  }
});

// ✅ Save profile changes
document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();

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
    const filePath = `avatars/${user.id}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (!uploadError) {
      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);
      avatar_url = publicUrlData.publicUrl;
    } else {
      console.error("Avatar upload error:", uploadError.message);
      showError(`Failed to upload avatar: ${uploadError.message}`);
    }
  }

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
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
      document.getElementById("userEmail").textContent = updated.email || "";
      document.getElementById("userUsername").textContent =
        updated.username || "";
      document.getElementById("userCredits").textContent = updated.credits ?? 0;
      document.getElementById("userBio").textContent = updated.bio || "";
      document.getElementById("userPhone").textContent = updated.phone || "";
      document.getElementById("userAvatar").src =
        updated.avatar_url || DEFAULT_AVATAR;
    }

    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
    modal.setAttribute("inert", "");
    editBtn.focus();
  }
});
/* 
// ✅ Logout button
document.getElementById("logoutBtn").addEventListener("click", async () => {
  const { error } = await logout();
  if (error) {
    console.error("Logout error:", error.message);
    showError(`Logout failed: ${error.message}`);
  } else {
    showInfo("You’ve been logged out. See you soon!");
    // Notify parent feed page instead of redirecting inside iframe
    window.parent.postMessage({ type: "logout" }, "*");
  }
});
 */

/* // ✅ Transactions logic
let allTransactions = [];
let currentPage = 1;
const pageSize = 5; // show 5 transactions per page

async function loadTransactions(userId) {
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("created_at, credits_spent, video_id, viewer_id, creator_id, videos(title)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Transactions fetch error:", error.message);
    showError("Failed to load transactions. Please try again later.");
    return;
  }

  allTransactions = transactions;
  renderTransactions(userId, "all");
}

function renderTransactions(userId, filter) {
  const tbody = document.querySelector("#transactionsTable tbody");
  tbody.innerHTML = "";

  let filtered = allTransactions;
  if (filter === "viewer") {
    filtered = allTransactions.filter(tx => tx.viewer_id === userId);
  } else if (filter === "creator") {
    filtered = allTransactions.filter(tx => tx.creator_id === userId);
  }

  // ✅ Calculate totals
  let totalSpent = 0;
  let totalEarned = 0;
    filtered.forEach(tx => {
    if (tx.viewer_id === userId) totalSpent += tx.credits_spent;
    if (tx.creator_id === userId) totalEarned += tx.credits_spent;
  });
  document.getElementById("totalSpent").textContent = `Total Spent: ${totalSpent}`;
  document.getElementById("totalEarned").textContent = `Total Earned: ${totalEarned}`;

  // ✅ Pagination logic
  const totalPages = Math.ceil(filtered.length / pageSize);
  if (currentPage > totalPages) currentPage = totalPages || 1;

  const start = (currentPage - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);

  if (paginated.length === 0) {
    showInfo("No transactions found for this filter.");
  }

  paginated.forEach(tx => {
    const row = document.createElement("tr");
    const role = tx.viewer_id === userId ? "Viewer" : "Creator";
    row.innerHTML = `
      <td>${new Date(tx.created_at).toLocaleString()}</td>
      <td>${tx.videos?.title || "Unknown"}</td>
      <td>${role}</td>
      <td>${tx.credits_spent}</td>
    `;
    tbody.appendChild(row);
  });

  // ✅ Update page info
  document.getElementById("pageInfo").textContent = `Page ${currentPage} of ${totalPages}`;
}

// ✅ Pagination controls
document.getElementById("prevPage").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderTransactions(user.id, "all");
  } else {
    showInfo("You are already on the first page.");
  }
});

document.getElementById("nextPage").addEventListener("click", () => {
  const totalPages = Math.ceil(allTransactions.length / pageSize);
  if (currentPage < totalPages) {
    currentPage++;
    renderTransactions(user.id, "all");
  } else {
    showInfo("You are already on the last page.");
  }
});

// ✅ Filter button handlers
document.getElementById("filterAll").addEventListener("click", () => {
  currentPage = 1;
  renderTransactions(user.id, "all");
});
document.getElementById("filterViewer").addEventListener("click", () => {
  currentPage = 1;
  renderTransactions(user.id, "viewer");
});
document.getElementById("filterCreator").addEventListener("click", () => {
  currentPage = 1;
  renderTransactions(user.id, "creator");
});

// ✅ Download CSV button
document.getElementById("downloadCsvBtn").addEventListener("click", () => {
  if (!allTransactions || allTransactions.length === 0) {
    showError("No transactions available to export.");
    return;
  }

  // Build CSV content
  const headers = ["Date", "Video", "Role", "Credits"];
  const rows = allTransactions.map(tx => {
    const role = tx.viewer_id === user.id ? "Viewer" : "Creator";
    return [
      new Date(tx.created_at).toLocaleString(),
      tx.videos?.title || "Unknown",
      role,
      tx.credits_spent
    ];
  });

  const csvContent = [headers, ...rows]
    .map(row => row.map(val => `"${val}"`).join(","))
    .join("\n");

  // Create downloadable blob
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  // Trigger download
  const link = document.createElement("a");
  link.href = url;
  link.download = "transactions.csv";
  link.click();

  // Cleanup
  URL.revokeObjectURL(url);

  showSuccess("Transactions exported as CSV.");
});

// ✅ Download Excel (XLSX) button
document.getElementById("downloadXlsxBtn").addEventListener("click", () => {
  if (!allTransactions || allTransactions.length === 0) {
    showError("No transactions available to export.");
    return;
  }

  // Build worksheet data
  const worksheetData = [
    ["Date", "Video", "Role", "Credits"],
    ...allTransactions.map(tx => {
      const role = tx.viewer_id === user.id ? "Viewer" : "Creator";
      return [
        new Date(tx.created_at).toLocaleString(),
        tx.videos?.title || "Unknown",
        role,
        tx.credits_spent
      ];
    })
  ];

  // Create workbook and worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

  // Export to file
  XLSX.writeFile(workbook, "transactions.xlsx");

  showSuccess("Transactions exported as Excel file.");
}); */
