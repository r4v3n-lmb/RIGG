const form = document.getElementById("preorder-form");
const status = document.getElementById("form-status");
const priceDisplay = document.getElementById("price-display");
const fullPriceDisplay = document.getElementById("full-price");
const depositPriceDisplay = document.getElementById("deposit-price");
const originalPriceDisplay = document.getElementById("original-price");
const counterValue = document.querySelector(".counter-value");
const counterTotal = document.querySelector(".counter-total");
const CURRENCY = "ZAR";
const FULL_PRICE = 349.99;
const ORIGINAL_PRICE = 599.99;
const DEPOSIT = 149.99;
const LAUNCH_TARGET = new Date("2026-04-30T23:59:00+02:00");

const countdownEl = document.getElementById("launch-countdown");
const updateCountdown = () => {
  if (!countdownEl || Number.isNaN(LAUNCH_TARGET.getTime())) return;
  const diff = LAUNCH_TARGET.getTime() - Date.now();
  if (diff <= 0) {
    countdownEl.textContent = "now";
    return;
  }
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  countdownEl.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBjVRr7gc8YYTmWrlL3qngWayXjMYdI2to",
  authDomain: "rigg-ae114.firebaseapp.com",
  projectId: "rigg-ae114",
  storageBucket: "rigg-ae114.firebasestorage.app",
  messagingSenderId: "22084213263",
  appId: "1:22084213263:web:fd683d467cedd60076a17a",
  measurementId: "G-K29G7PVKYS",
};
const VERIFY_PAYSTACK_URL =
  "https://us-central1-rigg-ae114.cloudfunctions.net/verifyPaystack";
const PAYSTACK_PUBLIC_KEY = "pk_test_f049c52856829d132b67a1a02af013a3bbc1e052";

let db = null;
if (window.firebase && typeof window.firebase.initializeApp === "function") {
  window.firebase.initializeApp(FIREBASE_CONFIG);
  db = window.firebase.firestore();
}

const formatZar = (amount) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(amount);

const updatePrice = () => {
  if (priceDisplay) {
    priceDisplay.textContent = formatZar(DEPOSIT);
  }
  if (fullPriceDisplay) {
    fullPriceDisplay.textContent = formatZar(FULL_PRICE);
  }
  if (depositPriceDisplay) {
    depositPriceDisplay.textContent = formatZar(DEPOSIT);
  }
  if (originalPriceDisplay) {
    originalPriceDisplay.textContent = formatZar(ORIGINAL_PRICE);
  }
};

const getMaxUnits = () => {
  if (!counterTotal) return 50;
  const maxMatch = counterTotal.textContent.match(/\/\s*(\d+)/);
  return maxMatch ? Number.parseInt(maxMatch[1], 10) : 50;
};

const refreshCounter = async () => {
  if (!db || !counterValue) return;
  try {
    const snapshot = await db.collection("preorders").where("paid", "==", true).get();
    const max = getMaxUnits();
    const count = Math.min(snapshot.size ?? 0, max);
    counterValue.textContent = String(count);
  } catch (error) {
    // Keep existing value if count fetch fails.
  }
};

const initPricing = () => {
  if (!priceDisplay) return;
  updatePrice();
  refreshCounter();
  updateCountdown();
};

try {
  console.log("RIGG app.js loaded");
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPricing);
  } else {
    initPricing();
  }
  window.addEventListener("load", initPricing);
  setInterval(updateCountdown, 1000);
} catch (error) {
  // Leave placeholders if something unexpected happens.
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const setSubmitError = () => {
      if (submitButton) {
        submitButton.classList.add("error");
      }
    };
    const clearSubmitError = () => {
      if (submitButton) {
        submitButton.classList.remove("error");
      }
    };
    clearSubmitError();
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Processing...";
    }
    const nameInput = form.querySelector('[name="name"]');
    const surnameInput = form.querySelector('[name="surname"]');
    const emailInput = form.querySelector('[name="email"]');
    const numberInput = form.querySelector('[name="number"]');
    const data = {
      name: nameInput ? nameInput.value.trim() : "",
      surname: surnameInput ? surnameInput.value.trim() : "",
      email: emailInput ? emailInput.value.trim() : "",
      number: numberInput ? numberInput.value.trim() : "",
      currency: CURRENCY,
      full_price: FULL_PRICE,
      deposit_amount: DEPOSIT,
      paid: false,
      payment_reference: null,
      locale: navigator.language || "en-US",
      region: (navigator.language || "en-US").split("-")[1] || "US",
    };

    if (!data.email && !data.number) {
      status.textContent = "Please provide an email or number.";
      setSubmitError();
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Pre-order now";
      }
      return;
    }

    status.textContent = "Submitting your pre-order...";

    try {
      if (!db) {
        throw new Error("Firestore not available.");
      }
      if (!window.PaystackPop) {
        throw new Error("Paystack not available.");
      }

      const reference = `RIGG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      data.payment_reference = reference;
      const digits = data.number.replace(/\D/g, "");
      const paystackEmail = data.email || `noreply.rigg+${digits || "contact"}@gmail.com`;

      const docRef = await db.collection("preorders").add({
        ...data,
        created_at: new Date().toISOString(),
      });

      const amount = Math.round(DEPOSIT * 100);
      const handler = PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: paystackEmail,
        amount,
        currency: CURRENCY,
        ref: reference,
        callback: async (response) => {
          const verifyResponse = await fetch(VERIFY_PAYSTACK_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              reference: response.reference,
              email: data.email,
              docId: docRef.id,
            }),
          });

          if (!verifyResponse.ok) {
            status.textContent = "Payment received, but verification failed. Please contact support.";
            setSubmitError();
            if (submitButton) {
              submitButton.disabled = false;
              submitButton.textContent = "Pre-order now";
            }
            return;
          }

          status.textContent = "Payment received. Your founders spot is confirmed.";
          clearSubmitError();
          await refreshCounter();
          form.reset();
          updatePrice();
        },
        onClose: () => {
          status.textContent = "Payment cancelled. Your reservation is saved but unpaid.";
          clearSubmitError();
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "Pre-order now";
          }
        },
      });

      handler.openIframe();
    } catch (error) {
      status.textContent = "";
      setSubmitError();
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Pre-order now";
      }
    }
  });
}

const navLinks = Array.from(document.querySelectorAll(".nav-link"));
const sectionMap = navLinks
  .map((link) => {
    const id = link.getAttribute("href")?.replace("#", "");
    const section = id ? document.getElementById(id) : null;
    return section ? { link, section } : null;
  })
  .filter(Boolean);

if (sectionMap.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const match = sectionMap.find((item) => item.section === entry.target);
        if (!match) return;
        if (entry.isIntersecting) {
          navLinks.forEach((link) => link.classList.remove("active"));
          match.link.classList.add("active");
        }
      });
    },
    { rootMargin: "-40% 0px -50% 0px", threshold: 0.1 },
  );

  sectionMap.forEach((item) => observer.observe(item.section));
}

const addonsToggle = document.querySelector(".addons-toggle");
const addonsPanel = document.getElementById("ecosystem-panel");
if (addonsToggle && addonsPanel) {
  addonsToggle.addEventListener("click", () => {
    const isOpen = addonsToggle.getAttribute("aria-expanded") === "true";
    addonsToggle.setAttribute("aria-expanded", String(!isOpen));
    if (isOpen) {
      addonsPanel.hidden = true;
    } else {
      addonsPanel.hidden = false;
    }
  });
}

const ecosystemCards = Array.from(document.querySelectorAll(".ecosystem-card"));
if (ecosystemCards.length) {
  const toggleCard = (card) => {
    const isExpanded = card.classList.contains("expanded");
    ecosystemCards.forEach((item) => {
      item.classList.remove("expanded");
      item.setAttribute("aria-expanded", "false");
    });
    if (!isExpanded) {
      card.classList.add("expanded");
      card.setAttribute("aria-expanded", "true");
    }
  };

  ecosystemCards.forEach((card) => {
    card.addEventListener("click", () => toggleCard(card));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleCard(card);
      }
    });
  });
}
