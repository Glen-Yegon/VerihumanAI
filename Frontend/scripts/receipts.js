import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { app } from "../firebase-config/firebase.min";

const auth = getAuth(app);
const db = getFirestore(app);

const backBtn = document.getElementById("backBtn");
const printPageBtn = document.getElementById("printPageBtn");

const statTotalReceipts = document.getElementById("statTotalReceipts");
const statVerifiedReceipts = document.getElementById("statVerifiedReceipts");
const statTotalCredits = document.getElementById("statTotalCredits");
const statTotalSpend = document.getElementById("statTotalSpend");

const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const currencyFilter = document.getElementById("currencyFilter");
const sourceFilter = document.getElementById("sourceFilter");
const sortFilter = document.getElementById("sortFilter");
const dateFrom = document.getElementById("dateFrom");
const dateTo = document.getElementById("dateTo");
const resetFiltersBtn = document.getElementById("resetFiltersBtn");

const loadingState = document.getElementById("loadingState");
const errorState = document.getElementById("errorState");
const errorText = document.getElementById("errorText");
const emptyState = document.getElementById("emptyState");
const receiptsSection = document.getElementById("receiptsSection");
const receiptsGrid = document.getElementById("receiptsGrid");
const toolbarText = document.getElementById("toolbarText");
const resultsCount = document.getElementById("resultsCount");

const receiptModal = document.getElementById("receiptModal");
const modalBackdrop = document.getElementById("modalBackdrop");
const closeModalBtn = document.getElementById("closeModalBtn");
const printReceiptBtn = document.getElementById("printReceiptBtn");
const downloadReceiptBtn = document.getElementById("downloadReceiptBtn");

const modalStatusBadge = document.getElementById("modalStatusBadge");
const modalAmountBig = document.getElementById("modalAmountBig");
const modalReference = document.getElementById("modalReference");
const modalEmail = document.getElementById("modalEmail");
const modalUid = document.getElementById("modalUid");
const modalStatus = document.getElementById("modalStatus");
const modalCurrency = document.getElementById("modalCurrency");
const modalAmount = document.getElementById("modalAmount");
const modalAmountMinor = document.getElementById("modalAmountMinor");
const modalCredits = document.getElementById("modalCredits");
const modalPaidAt = document.getElementById("modalPaidAt");
const modalSource = document.getElementById("modalSource");
const modalProcessed = document.getElementById("modalProcessed");
const modalDocId = document.getElementById("modalDocId");
const modalChannel = document.getElementById("modalChannel");
const modalGatewayResponse = document.getElementById("modalGatewayResponse");
const modalPaystackPaidAt = document.getElementById("modalPaystackPaidAt");
const modalAuthorization = document.getElementById("modalAuthorization");
const pageLoader = document.getElementById("pageLoader");
const sendReceiptBtn = document.getElementById("sendReceiptBtn");


const API_BASE =
  window.location.hostname.includes("localhost") ||
  window.location.hostname.includes("127.0.0.1")
    ? "http://127.0.0.1:8000"
    : "https://verihumanai.onrender.com";
  

let allReceipts = [];
let filteredReceipts = [];
let selectedReceipt = null;


function showPageLoader() {
  pageLoader?.classList.remove("hidden");
}

function hidePageLoader() {
  pageLoader?.classList.add("hidden");
}

function removeSkeletons() {
  [
    statTotalReceipts,
    statVerifiedReceipts,
    statTotalCredits,
    statTotalSpend,
    toolbarText
  ].forEach((el) => {
    el?.classList.remove("skeleton");
  });
}

function safeText(value, fallback = "—") {
  const text = (value ?? "").toString().trim();
  return text ? text : fallback;
}

function normalizeStatus(status) {
  const s = (status || "").toString().trim().toLowerCase();
  if (!s) return "unknown";
  return s;
}

function getStatusClass(status) {
  const s = normalizeStatus(status);

  if (["success"].includes(s)) return "status-success";
  if (["pending"].includes(s)) return "status-pending";
  if (["failed", "abandoned"].includes(s)) return "status-failed";
  return "status-default";
}

function formatMoney(currency, amount) {
  const value = Number(amount || 0);
  const cur = (currency || "KES").toUpperCase();

  if (cur === "USD") {
    return `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  return `KES ${Math.round(value).toLocaleString()}`;
}

function extractTimestamp(value) {
  if (!value) return null;

  try {
    if (typeof value.toDate === "function") return value.toDate().getTime();
    if (value.seconds) return value.seconds * 1000;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function formatDateTime(value) {
  const ts = extractTimestamp(value);
  if (!ts) return "No date";

  return new Date(ts).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getISODateOnly(value) {
  const ts = extractTimestamp(value);
  if (!ts) return "";
  return new Date(ts).toISOString().split("T")[0];
}

function showLoading() {
  loadingState.classList.remove("hidden");
  errorState.classList.add("hidden");
  emptyState.classList.add("hidden");
  receiptsSection.classList.add("hidden");
}

function showError(message) {
  loadingState.classList.add("hidden");
  errorState.classList.remove("hidden");
  emptyState.classList.add("hidden");
  receiptsSection.classList.add("hidden");
  errorText.textContent = message || "Something went wrong.";
}

function showEmpty() {
  loadingState.classList.add("hidden");
  errorState.classList.add("hidden");
  emptyState.classList.remove("hidden");
  receiptsSection.classList.add("hidden");
}

function showReceipts() {
  loadingState.classList.add("hidden");
  errorState.classList.add("hidden");
  emptyState.classList.add("hidden");
  receiptsSection.classList.remove("hidden");
}

function computeStats(receipts) {
  const totalReceipts = receipts.length;
  const verifiedReceipts = receipts.filter(
    (r) => normalizeStatus(r.status) === "success"
  ).length;

  const totalCredits = receipts.reduce(
    (sum, r) => sum + Number(r.creditsAdded || 0),
    0
  );

  const totalKES = receipts
    .filter((r) => (r.currency || "").toUpperCase() === "KES")
    .reduce((sum, r) => sum + Number(r.amountMajor || 0), 0);

  const totalUSD = receipts
    .filter((r) => (r.currency || "").toUpperCase() === "USD")
    .reduce((sum, r) => sum + Number(r.amountMajor || 0), 0);

  statTotalReceipts.textContent = totalReceipts.toLocaleString();
  statVerifiedReceipts.textContent = verifiedReceipts.toLocaleString();
  statTotalCredits.textContent = Math.round(totalCredits).toLocaleString();

  if (totalKES > 0 && totalUSD > 0) {
    statTotalSpend.textContent = `KES ${Math.round(totalKES).toLocaleString()} + $${totalUSD.toFixed(2)}`;
  } else if (totalUSD > 0) {
    statTotalSpend.textContent = `$${totalUSD.toFixed(2)}`;
  } else {
    statTotalSpend.textContent = `KES ${Math.round(totalKES).toLocaleString()}`;
  }
}

function renderReceipts(receipts) {
  receiptsGrid.innerHTML = "";

  receipts.forEach((receipt) => {
    const status = normalizeStatus(receipt.status);
    const statusClass = getStatusClass(status);

    const card = document.createElement("article");
    card.className = "receipt-card";
    card.tabIndex = 0;

    card.innerHTML = `
      <div class="receipt-top">
        <div>
          <div class="receipt-reference">${safeText(receipt.reference)}</div>
          <div class="receipt-date">${formatDateTime(receipt.paidAt)}</div>
        </div>
        <span class="status-badge ${statusClass}">${safeText(status)}</span>
      </div>

      <div class="receipt-metrics">
        <div class="metric-box">
          <span>Amount</span>
          <strong>${formatMoney(receipt.currency, receipt.amountMajor)}</strong>
        </div>

        <div class="metric-box">
          <span>Credits</span>
          <strong>${Math.round(Number(receipt.creditsAdded || 0)).toLocaleString()}</strong>
        </div>
      </div>

      <div class="receipt-bottom">
        <p>${safeText(receipt.email)}</p>
        <span class="view-link">View receipt →</span>
      </div>
    `;

    card.addEventListener("click", () => openReceiptModal(receipt));
    card.addEventListener("keypress", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openReceiptModal(receipt);
      }
    });

    receiptsGrid.appendChild(card);
  });
}

function applyFilters() {
  const search = searchInput.value.trim().toLowerCase();
  const status = statusFilter.value.toLowerCase();
  const currency = currencyFilter.value.toUpperCase();
  const source = sourceFilter.value.toLowerCase();
  const sort = sortFilter.value;
  const from = dateFrom.value;
  const to = dateTo.value;

  filteredReceipts = allReceipts.filter((receipt) => {
    const paystack = receipt.paystack || {};
    const channel = (paystack.channel || "").toString().toLowerCase();
    const gatewayResponse = (paystack.gateway_response || "").toString().toLowerCase();

    const searchPool = [
      receipt.reference,
      receipt.email,
      receipt.uid,
      receipt.status,
      receipt.currency,
      receipt.source,
      receipt.amountMajor,
      receipt.amountMinor,
      receipt.creditsAdded,
      channel,
      gatewayResponse
    ]
      .map((v) => (v ?? "").toString().toLowerCase())
      .join(" ");

    const statusOk = status === "all" || normalizeStatus(receipt.status) === status;
    const currencyOk = currency === "ALL" || (receipt.currency || "").toUpperCase() === currency;
    const sourceOk = source === "all" || (receipt.source || "").toLowerCase() === source;
    const searchOk = !search || searchPool.includes(search);

    const receiptDate = getISODateOnly(receipt.paidAt);
    const fromOk = !from || (receiptDate && receiptDate >= from);
    const toOk = !to || (receiptDate && receiptDate <= to);

    return statusOk && currencyOk && sourceOk && searchOk && fromOk && toOk;
  });

  filteredReceipts.sort((a, b) => {
    const aTime = extractTimestamp(a.paidAt) || 0;
    const bTime = extractTimestamp(b.paidAt) || 0;
    const aAmount = Number(a.amountMajor || 0);
    const bAmount = Number(b.amountMajor || 0);
    const aCredits = Number(a.creditsAdded || 0);
    const bCredits = Number(b.creditsAdded || 0);

    switch (sort) {
      case "oldest":
        return aTime - bTime;
      case "amount_high":
        return bAmount - aAmount;
      case "amount_low":
        return aAmount - bAmount;
      case "credits_high":
        return bCredits - aCredits;
      case "credits_low":
        return aCredits - bCredits;
      case "newest":
      default:
        return bTime - aTime;
    }
  });

  resultsCount.textContent = `${filteredReceipts.length} shown`;

  if (allReceipts.length === 0) {
    toolbarText.textContent = "No saved receipts yet.";
    showEmpty();
    return;
  }

  if (filteredReceipts.length === 0) {
    toolbarText.textContent = "No receipts matched your filters.";
    showEmpty();
    return;
  }

  toolbarText.textContent = `Showing ${filteredReceipts.length} of ${allReceipts.length} receipt${allReceipts.length === 1 ? "" : "s"}.`;
  renderReceipts(filteredReceipts);
  showReceipts();
}

function resetFilters() {
  searchInput.value = "";
  statusFilter.value = "all";
  currencyFilter.value = "all";
  sourceFilter.value = "all";
  sortFilter.value = "newest";
  dateFrom.value = "";
  dateTo.value = "";
  applyFilters();
}

function getAuthorizationLabel(paystack = {}) {
  const authData = paystack.authorization || {};
  const channel = safeText(paystack.channel, "—");
  const brand = safeText(authData.brand, "");
  const authCode = safeText(authData.authorization_code, "");
  const last4 = safeText(authData.last4, "");

  const pieces = [channel];

  if (brand !== "—" && brand !== "") pieces.push(brand);
  if (last4 !== "—" && last4 !== "") pieces.push(`**** ${last4}`);
  if (authCode !== "—" && authCode !== "") pieces.push(authCode);

  return pieces.join(" • ") || "—";
}

function openReceiptModal(receipt) {
  selectedReceipt = receipt;
  
  if (sendReceiptBtn) {
  sendReceiptBtn.disabled = false;
  sendReceiptBtn.textContent = `Send to ${safeText(receipt.email, "Email")}`;
}

  const paystack = receipt.paystack || {};
  const status = normalizeStatus(receipt.status);
  const statusClass = getStatusClass(status);

  modalStatusBadge.className = `status-badge ${statusClass}`;
  modalStatusBadge.textContent = safeText(status);

  modalAmountBig.textContent = formatMoney(receipt.currency, receipt.amountMajor);
  modalReference.textContent = safeText(receipt.reference);
  modalEmail.textContent = safeText(receipt.email);
  modalUid.textContent = safeText(receipt.uid);
  modalStatus.textContent = safeText(status);
  modalCurrency.textContent = safeText(receipt.currency);
  modalAmount.textContent = formatMoney(receipt.currency, receipt.amountMajor);
  modalAmountMinor.textContent = safeText(receipt.amountMinor);
  modalCredits.textContent = `${Math.round(Number(receipt.creditsAdded || 0)).toLocaleString()} credits`;
  modalPaidAt.textContent = formatDateTime(receipt.paidAt);
  modalSource.textContent = safeText(receipt.source);
  modalProcessed.textContent = receipt.processed === true ? "Yes" : "No";
  modalDocId.textContent = safeText(receipt.docId);
  modalChannel.textContent = safeText(paystack.channel);
  modalGatewayResponse.textContent = safeText(paystack.gateway_response);
  modalPaystackPaidAt.textContent = safeText(paystack.paid_at);
  modalAuthorization.textContent = getAuthorizationLabel(paystack);

  receiptModal.classList.remove("hidden");
  receiptModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeReceiptModal() {
  receiptModal.classList.add("hidden");
  receiptModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function downloadSelectedReceipt() {
  if (!selectedReceipt) return;

  const blob = new Blob([JSON.stringify(selectedReceipt, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${selectedReceipt.reference || "receipt"}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function sendSelectedReceiptToEmail() {
  try {
    const user = auth.currentUser;

    if (!user) {
      alert("Please sign in first.");
      return;
    }

    if (!selectedReceipt || !selectedReceipt.reference) {
      alert("No receipt selected.");
      return;
    }

    sendReceiptBtn.disabled = true;
    const originalText = sendReceiptBtn.textContent;
    sendReceiptBtn.textContent = "Sending...";

    const token = await user.getIdToken();

    const res = await fetch(
      `${API_BASE}/api/receipts/send/${encodeURIComponent(selectedReceipt.reference)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          uid: user.uid
        })
      }
    );

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.detail || data.message || "Failed to send receipt email.");
    }

    alert(data.message || "Receipt sent successfully.");
    sendReceiptBtn.textContent = originalText;
    sendReceiptBtn.disabled = false;
  } catch (error) {
    console.error("Send receipt email error:", error);
    alert(error.message || "Failed to send receipt email.");
    if (sendReceiptBtn) {
      sendReceiptBtn.textContent = "Send to Email";
      sendReceiptBtn.disabled = false;
    }
  }
}

async function loadReceipts(user) {
  try {
    showPageLoader();
    showLoading();

    const receiptsRef = collection(db, "payments", user.uid, "receipts");
    const receiptsQuery = query(receiptsRef, orderBy("paidAt", "desc"));
    const snapshot = await getDocs(receiptsQuery);

    allReceipts = snapshot.docs.map((doc) => ({
      docId: doc.id,
      ...doc.data()
    }));

    computeStats(allReceipts);
    applyFilters();
    removeSkeletons();
  } catch (error) {
    console.error("Failed to load receipts:", error);
    removeSkeletons();
    showError(error.message || "Failed to load receipts.");
  } finally {
    hidePageLoader();
  }
}


backBtn?.addEventListener("click", () => {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = "profile.html";
  }
});

printPageBtn?.addEventListener("click", () => window.print());
resetFiltersBtn?.addEventListener("click", resetFilters);

searchInput?.addEventListener("input", applyFilters);
statusFilter?.addEventListener("change", applyFilters);
currencyFilter?.addEventListener("change", applyFilters);
sourceFilter?.addEventListener("change", applyFilters);
sortFilter?.addEventListener("change", applyFilters);
dateFrom?.addEventListener("change", applyFilters);
dateTo?.addEventListener("change", applyFilters);

closeModalBtn?.addEventListener("click", closeReceiptModal);
modalBackdrop?.addEventListener("click", closeReceiptModal);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !receiptModal.classList.contains("hidden")) {
    closeReceiptModal();
  }
});

printReceiptBtn?.addEventListener("click", () => window.print());
downloadReceiptBtn?.addEventListener("click", downloadSelectedReceipt);
sendReceiptBtn?.addEventListener("click", sendSelectedReceiptToEmail);

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    toolbarText.textContent = "Please sign in first.";
    showError("You must be signed in to view your receipts.");
    return;
  }

  toolbarText.textContent = `Loading receipts for ${user.email || "your account"}...`;
  await loadReceipts(user);
});