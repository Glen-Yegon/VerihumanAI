const hamburger = document.getElementById("hamburger");
const sideMenu = document.getElementById("sideMenu");
const closeBtn = document.getElementById("closeBtn");
const menuOverlay = document.getElementById("menuOverlay");

// Open menu
hamburger.addEventListener("click", () => {
  sideMenu.classList.add("active");
  menuOverlay.classList.add("active");
});

// Close menu
closeBtn.addEventListener("click", () => {
  sideMenu.classList.remove("active");
  menuOverlay.classList.remove("active");
});

// Close on overlay click
menuOverlay.addEventListener("click", () => {
  sideMenu.classList.remove("active");
  menuOverlay.classList.remove("active");
});


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
    KES: 20,
    USD: 0.2
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

  // Track last edited field to avoid infinite loop
  let lastEdited = "amount"; // "amount" | "credits"

  const formatMoney = (currency, value) => {
    if (!isFinite(value)) value = 0;

    if (currency === "KES") {
      // Whole numbers look cleaner for KES
      const v = Math.round(value);
      return `KES ${v.toLocaleString()}`;
    }

    // USD with 2 decimals
    const v = Math.round(value * 100) / 100;
    return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const clampToZero = (n) => (isFinite(n) && n > 0 ? n : 0);

  const parseNumber = (val) => {
    // allow commas
    const cleaned = (val || "").toString().replace(/,/g, "").trim();
    if (cleaned === "") return NaN;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
  };

  const getCurrency = () => currencyHidden.value === "USD" ? "USD" : "KES";

  const updateRateUI = () => {
    const c = getCurrency();
    const rate = PRICE_PER_CREDIT[c];

    amountPrefix.textContent = c === "KES" ? "KES" : "$";
    rateChip.textContent = c === "KES" ? `KES ${rate} / credit` : `$${rate} / credit`;

    // Helpful micro-copy tweaks
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

    // Update the other field (rounded down to avoid giving extra)
    creditsInput.value = amountInput.value.trim() === "" ? "" : String(Math.floor(credits));
    updateSummary(Math.floor(credits), amount);
  };

  const computeFromCredits = () => {
    const c = getCurrency();
    const rate = PRICE_PER_CREDIT[c];

    const credits = clampToZero(parseNumber(creditsInput.value));
    const amount = credits * rate;

    // Update amount field
    amountInput.value = creditsInput.value.trim() === "" ? "" : (c === "KES" ? String(Math.round(amount)) : String(amount.toFixed(2)));
    updateSummary(credits, amount);
  };

  const recalc = () => {
    if (lastEdited === "credits") computeFromCredits();
    else computeFromAmount();
  };

  // Currency toggle
  segButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      segButtons.forEach(b => {
        b.classList.remove("is-active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-selected", "true");

      currencyHidden.value = btn.dataset.currency === "USD" ? "USD" : "KES";
      updateRateUI();

      // Recalculate based on last edited field to preserve user's intent
      recalc();
    });
  });

  // Inputs
  amountInput.addEventListener("input", () => {
    lastEdited = "amount";
    computeFromAmount();
  });

  creditsInput.addEventListener("input", () => {
    lastEdited = "credits";
    computeFromCredits();
  });

  // Initialize UI
  updateRateUI();
  updateSummary(0, 0);

  // Pay button placeholder
  document.getElementById("payBtn").addEventListener("click", () => {
    // We'll add real checkout logic later
    const c = getCurrency();
    const rate = PRICE_PER_CREDIT[c];
    const credits = clampToZero(parseNumber(creditsInput.value));
    const amount = credits * rate;

    alert(`Checkout coming next.\n\nCurrency: ${c}\nCredits: ${Math.floor(credits)}\nAmount: ${formatMoney(c, amount)}`);
  });
})();
