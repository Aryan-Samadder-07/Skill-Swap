// credits.js
import { supabase } from "../utils/api.js";
import { showError, showSuccess, showInfo } from "../utils/feedback.js";

let allTransactions = [];
let currentPage = 1;
const pageSize = 10; // show 10 transactions per page

// ✅ Load transactions for a given user
export async function loadTransactions(userId) {
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select(
      "created_at, credits_spent, video_id, viewer_id, creator_id, videos(title)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Transactions fetch error:", error.message);
    showError(
      "Failed to load transactions. Please try again later.",
      "toastContainerCredits",
    );
    return;
  }

  allTransactions = transactions || [];
  renderTransactions(userId, "all");
}

// ✅ Render transactions with filter + pagination
function renderTransactions(userId, filter) {
  const tbody = document.querySelector("#transactionsTable tbody");
  tbody.innerHTML = "";

  let filtered = allTransactions;
  if (filter === "viewer") {
    filtered = allTransactions.filter((tx) => tx.viewer_id === userId);
  } else if (filter === "creator") {
    filtered = allTransactions.filter((tx) => tx.creator_id === userId);
  }

  // Totals
  let totalSpent = 0;
  let totalEarned = 0;
  filtered.forEach((tx) => {
    if (tx.viewer_id === userId) totalSpent += tx.credits_spent;
    if (tx.creator_id === userId) totalEarned += tx.credits_spent;
  });
  document.getElementById("totalSpent").textContent =
    `Total Spent: ${totalSpent}`;
  document.getElementById("totalEarned").textContent =
    `Total Earned: ${totalEarned}`;

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize);
  if (currentPage > totalPages) currentPage = totalPages || 1;

  const start = (currentPage - 1) * pageSize;
  const paginated = filtered.slice(start, start + pageSize);

  if (paginated.length === 0) {
    showInfo("No transactions found for this filter.", "toastContainerCredits");
  }

  paginated.forEach((tx) => {
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

  document.getElementById("pageInfo").textContent =
    `Page ${currentPage} of ${totalPages}`;
}

// ✅ Pagination controls
document.getElementById("prevPage").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderTransactions(window.userId, "all");
  } else {
    showInfo("You are already on the first page.", "toastContainerCredits");
  }
});

document.getElementById("nextPage").addEventListener("click", () => {
  const totalPages = Math.ceil(allTransactions.length / pageSize);
  if (currentPage < totalPages) {
    currentPage++;
    renderTransactions(window.userId, "all");
  } else {
    showInfo("You are already on the last page.", "toastContainerCredits");
  }
});

// ✅ Filter buttons
document.getElementById("filterAll").addEventListener("click", () => {
  currentPage = 1;
  renderTransactions(window.userId, "all");
});
document.getElementById("filterViewer").addEventListener("click", () => {
  currentPage = 1;
  renderTransactions(window.userId, "viewer");
});
document.getElementById("filterCreator").addEventListener("click", () => {
  currentPage = 1;
  renderTransactions(window.userId, "creator");
});

// ✅ Export CSV
document.getElementById("downloadCsvBtn").addEventListener("click", () => {
  if (!allTransactions || allTransactions.length === 0) {
    showError("No transactions available to export.", "toastContainerCredits");
    return;
  }

  const headers = ["Date", "Video", "Role", "Credits"];
  const rows = allTransactions.map((tx) => {
    const role = tx.viewer_id === window.userId ? "Viewer" : "Creator";
    return [
      new Date(tx.created_at).toLocaleString(),
      tx.videos?.title || "Unknown",
      role,
      tx.credits_spent,
    ];
  });

  const csvContent = [headers, ...rows]
    .map((row) => row.map((val) => `"${val}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "transactions.csv";
  link.click();

  URL.revokeObjectURL(url);
  showSuccess("Transactions exported as CSV.", "toastContainerCredits");
});

// ✅ Export Excel
document.getElementById("downloadXlsxBtn").addEventListener("click", () => {
  if (!allTransactions || allTransactions.length === 0) {
    showError("No transactions available to export.", "toastContainerCredits");
    return;
  }

  const worksheetData = [
    ["Date", "Video", "Role", "Credits"],
    ...allTransactions.map((tx) => {
      const role = tx.viewer_id === window.userId ? "Viewer" : "Creator";
      return [
        new Date(tx.created_at).toLocaleString(),
        tx.videos?.title || "Unknown",
        role,
        tx.credits_spent,
      ];
    }),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

  XLSX.writeFile(workbook, "transactions.xlsx");
  showSuccess("Transactions exported as Excel file.", "toastContainerCredits");
});
