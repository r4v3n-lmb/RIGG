const form = document.getElementById("preorder-form");
const status = document.getElementById("form-status");
const priceDisplay = document.getElementById("price-display");
const fullPriceDisplay = document.getElementById("full-price");
const depositPriceDisplay = document.getElementById("deposit-price");
const originalPriceDisplay = document.getElementById("original-price");
const counterValue = document.querySelector(".counter-value");
const counterTotal = document.querySelector(".counter-total");
const CURRENCY = "ZAR";
const FULL_PRICE = 399.99;
const ORIGINAL_PRICE = 499.99;
const DEPOSIT = 99.99;

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
};

try {
  console.log("RIGG app.js loaded");
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPricing);
  } else {
    initPricing();
  }
  window.addEventListener("load", initPricing);
} catch (error) {
  // Leave placeholders if something unexpected happens.
}

if (form) {
  form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Processing...";
  }
  const data = {
    name: form.name.value.trim(),
    email: form.email.value.trim(),
    currency: CURRENCY,
    quantity: form.quantity.value,
    full_price: FULL_PRICE,
    deposit_amount: DEPOSIT,
    paid: false,
    payment_reference: null,
    locale: navigator.language || "en-US",
    region: (navigator.language || "en-US").split("-")[1] || "US",
  };

  if (!data.name || !data.email) {
    status.textContent = "Please provide your name and email.";
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

    const docRef = await db.collection("preorders").add({
      ...data,
      created_at: new Date().toISOString(),
    });

    const amount = Math.round(DEPOSIT * 100);
    const handler = PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: data.email,
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
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "Pre-order now";
          }
          return;
        }

        status.textContent = "Payment received. Your founders spot is confirmed.";
        await refreshCounter();
        form.reset();
        updatePrice();
      },
        onClose: () => {
          status.textContent = "Payment cancelled. Your reservation is saved but unpaid.";
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "Pre-order now";
          }
        },
      });

      handler.openIframe();
    } catch (error) {
      status.textContent = "Something went wrong. Please try again.";
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Pre-order now";
      }
    }
  });
}
