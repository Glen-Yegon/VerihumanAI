import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { app } from "../firebase-config/firebase.js";

const auth = getAuth(app);
// ✅ OPTIONAL (recommended): auto-switch between local + render without breaking anything
const API_BASE =
  window.location.hostname.includes("localhost") ||
  window.location.hostname.includes("127.0.0.1")
    ? "http://127.0.0.1:8001"
    : "https://verihumanai.onrender.com";

function showPaymentSuccessModal(message = "Payment successful. Your credits have been updated. You can view them on your profile page.") {
  let modal = document.getElementById("payment-success-modal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "payment-success-modal";
    modal.innerHTML = `
      <div class="payment-success-modal__card">
        <div class="payment-success-modal__icon">✓</div>
        <h3>Payment Successful</h3>
        <p>${message}</p>
      </div>
    `;
    document.body.appendChild(modal);
  }

  modal.classList.add("show");

  setTimeout(() => {
    modal.classList.remove("show");
    window.location.href = "index.html";
  }, 4500);
}

async function initializeBackendPayment({ uid, email, currency, credits}) {
  const res = await fetch(`${API_BASE}/api/payments/initialize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
body: JSON.stringify({
  uid,
  email,
  currency,
  credits,
}),
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.detail || data.error || "Failed to initialize payment");
  }

  return data;
}

async function verifyBackendPayment(reference) {
  const res = await fetch(`${API_BASE}/api/payments/verify/${encodeURIComponent(reference)}`, {
    method: "GET",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail || data.error || "Failed to verify payment");
  }

  return data;
}

const hamburger = document.getElementById("hamburger");
const sideMenu = document.getElementById("sideMenu");
const closeBtn = document.getElementById("closeBtn");
const menuOverlay = document.getElementById("menuOverlay");

if (hamburger && sideMenu && closeBtn && menuOverlay) {
  hamburger.addEventListener("click", () => {
    sideMenu.classList.add("active");
    menuOverlay.classList.add("active");
  });

  closeBtn.addEventListener("click", () => {
    sideMenu.classList.remove("active");
    menuOverlay.classList.remove("active");
  });

  menuOverlay.addEventListener("click", () => {
    sideMenu.classList.remove("active");
    menuOverlay.classList.remove("active");
  });
}


document.addEventListener("DOMContentLoaded", () => {
  const title = document.querySelector(".hero-title");
  const finalText = "VERIHUMAN";
  let iterations = 0;

  const shuffleInterval = setInterval(() => {
    title.textContent = finalText
      .split("")
      .map((letter, index) => {
        if (index < iterations) {
          return finalText[index];
        }
        return String.fromCharCode(65 + Math.floor(Math.random() * 26));
      })
      .join("");

    if (iterations >= finalText.length) {
      clearInterval(shuffleInterval);
    }
    iterations += 1/2; // speed control
  }, 100);

  // Stop after ~5 seconds
  setTimeout(() => {
    clearInterval(shuffleInterval);
    title.textContent = finalText;
  }, 5000);
});

(() => {
  const PRICE_PER_CREDIT = {
    KES: 10,
    USD: 0.1
  };

  const currencyHidden = document.getElementById("currency");
  const segButtons = Array.from(document.querySelectorAll(".vh-seg__btn"));
  const rateChip = document.getElementById("rateChip");

  const amountInput = document.getElementById("amountInput");
  const creditsInput = document.getElementById("creditsInput");

  const amountPrefix = document.getElementById("amountPrefix");
  const summaryPrimary = document.getElementById("summaryPrimary");
  const summarySecondary = document.getElementById("summarySecondary");

  const tipLine = document.getElementById("tipLine");
  const payBtn = document.getElementById("payBtn");

  // Track last edited field to avoid infinite loop
  let lastEdited = "amount"; // "amount" | "credits"

  const formatMoney = (currency, value) => {
    if (!isFinite(value)) value = 0;

    if (currency === "KES") {
      const v = Math.round(value);
      return `KES ${v.toLocaleString()}`;
    }

    const v = Math.round(value * 100) / 100;
    return `$${v.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const clampToZero = (n) => (isFinite(n) && n > 0 ? n : 0);

  const parseNumber = (val) => {
    const cleaned = (val || "").toString().replace(/,/g, "").trim();
    if (cleaned === "") return NaN;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
  };

  const getCurrency = () => (currencyHidden.value === "USD" ? "USD" : "KES");

  const updateRateUI = () => {
    const c = getCurrency();
    const rate = PRICE_PER_CREDIT[c];

    amountPrefix.textContent = c === "KES" ? "KES" : "$";
    rateChip.textContent = c === "KES" ? `KES ${rate} / credit` : `$${rate} / credit`;

    tipLine.innerHTML =
      c === "KES"
        ? `Most students top up <strong>50–200 credits</strong> for a full assignment session.`
        : `Most users top up <strong>50–200 credits</strong> for a full work session.`;
  };

  const updateSummary = (credits, amount) => {
    const c = getCurrency();
    const creditsRounded = Math.floor(clampToZero(credits));

    summaryPrimary.innerHTML = `You’ll get <strong>${creditsRounded.toLocaleString()} credits</strong>`;
    summarySecondary.innerHTML = `for <strong>${formatMoney(c, amount)}</strong>`;
  };

  const computeFromAmount = () => {
    const c = getCurrency();
    const rate = PRICE_PER_CREDIT[c];

    const amount = clampToZero(parseNumber(amountInput.value));
    const credits = amount / rate;

    creditsInput.value = amountInput.value.trim() === "" ? "" : String(Math.floor(credits));
    updateSummary(Math.floor(credits), amount);
  };

  const computeFromCredits = () => {
    const c = getCurrency();
    const rate = PRICE_PER_CREDIT[c];

    const credits = clampToZero(parseNumber(creditsInput.value));
    const amount = credits * rate;

    amountInput.value =
      creditsInput.value.trim() === ""
        ? ""
        : (c === "KES" ? String(Math.round(amount)) : String(amount.toFixed(2)));

    updateSummary(credits, amount);
  };

  const recalc = () => {
    if (lastEdited === "credits") computeFromCredits();
    else computeFromAmount();
  };

  segButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      segButtons.forEach((b) => {
        b.classList.remove("is-active");
        b.setAttribute("aria-selected", "false");
      });

      btn.classList.add("is-active");
      btn.setAttribute("aria-selected", "true");

      currencyHidden.value = btn.dataset.currency === "USD" ? "USD" : "KES";
      updateRateUI();
      recalc();
    });
  });

  amountInput.addEventListener("input", () => {
    lastEdited = "amount";
    computeFromAmount();
  });

  creditsInput.addEventListener("input", () => {
    lastEdited = "credits";
    computeFromCredits();
  });

  updateRateUI();
  updateSummary(0, 0);

  if (!payBtn) return;

  payBtn.addEventListener("click", async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("Please sign in first.");
        return;
      }

      const c = getCurrency();
      const rate = PRICE_PER_CREDIT[c];
      const credits = Math.floor(clampToZero(parseNumber(creditsInput.value)));
      const amount = credits * rate;

      if (c === "USD" && amount < 1) {
  alert("Minimum USD payment is $1.00.");
  return;
}

      if (!credits || credits <= 0) {
        alert("Please enter a valid credit amount.");
        return;
      }

      if (!amount || amount <= 0) {
        alert("Please enter a valid amount.");
        return;
      }

      payBtn.disabled = true;
      payBtn.textContent = "Processing...";

const init = await initializeBackendPayment({
  uid: user.uid,
  email: user.email,
  currency: c,
  credits,
});

      if (typeof PaystackPop === "undefined") {
        throw new Error("Paystack SDK failed to load. Please refresh the page.");
      }

      const popup = new PaystackPop();
      popup.resumeTransaction(init.access_code);

      const reference = init.reference;
      let verified = false;
      const maxChecks = 20;
      let checks = 0;

      const interval = setInterval(async () => {
        checks += 1;

        try {
          const verify = await verifyBackendPayment(reference);

          if (verify.ok === true) {
            verified = true;
            clearInterval(interval);
            showPaymentSuccessModal();
            return;
          }

          console.log("Payment status:", verify.status || "unknown");
        } catch (err) {
          console.error("Verification error:", err.message);
        }

        if (checks >= maxChecks && !verified) {
          clearInterval(interval);
          payBtn.disabled = false;
          payBtn.textContent = "Pay Now";
          alert("Payment is still processing. If payment completes, your credits will update shortly.");
        }
      }, 3000);

    } catch (error) {
      console.error("Payment error:", error);
      payBtn.disabled = false;
      payBtn.textContent = "Pay Now";
      alert(error.message || "Payment failed");
    }
  });
})();