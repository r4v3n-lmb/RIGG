const form = document.getElementById("preorder-form");
const status = document.getElementById("form-status");
const fullPriceDisplay = document.getElementById("full-price");
const originalPriceDisplay = document.getElementById("original-price");
const REGIONS = {
  ZA: { currency: "ZAR", locale: "en-ZA", flag: "🇿🇦", label: "South Africa",  full: 499.99, member: 449.99 },
  US: { currency: "USD", locale: "en-US", flag: "🇺🇸", label: "United States", full: 45,     member: 40     },
  GB: { currency: "GBP", locale: "en-GB", flag: "🇬🇧", label: "United Kingdom", full: 36,     member: 32     },
  AU: { currency: "AUD", locale: "en-AU", flag: "🇦🇺", label: "Australia",      full: 65,     member: 58     },
  CA: { currency: "CAD", locale: "en-CA", flag: "🇨🇦", label: "Canada",         full: 55,     member: 49     },
  IE: { currency: "EUR", locale: "en-IE", flag: "🇮🇪", label: "Ireland",         full: 42,     member: 38     },
  NZ: { currency: "NZD", locale: "en-NZ", flag: "🇳🇿", label: "New Zealand",    full: 72,     member: 65     },
};
const DEFAULT_REGION = "US";
let activeRegion = "ZA";
let isMember = false;
let personalization = null;

const STRIPE_PUBLIC_KEY = "pk_live_REPLACE_WITH_YOUR_STRIPE_PUBLIC_KEY";
const CREATE_STRIPE_INTENT_URL = "https://us-central1-rigg-ae114.cloudfunctions.net/createStripeIntent";
const CONFIRM_STRIPE_URL = "https://us-central1-rigg-ae114.cloudfunctions.net/confirmStripePayment";

const getCurrentPrice = () => {
  const r = REGIONS[activeRegion];
  return isMember ? r.member : r.full;
};
const launchDateAttr = document.body?.dataset?.launch;
const LAUNCH_TARGET = new Date(launchDateAttr || "2026-04-30T23:59:00+02:00");
let revealsInitialized = false;

const countdownEl = document.getElementById("launch-countdown");
const updateCountdown = () => {
  if (!countdownEl) return;

  if (Number.isNaN(LAUNCH_TARGET.getTime())) {
    countdownEl.textContent = "Coming Soon";
    return;
  }

  const diff = LAUNCH_TARGET.getTime() - Date.now();
  if (diff <= 0) {
    countdownEl.textContent = "Live Now";
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
const CHARGE_YOCO_URL =
  "https://us-central1-rigg-ae114.cloudfunctions.net/chargeYoco";
// Yoco Dashboard → Developers → API Keys → Public key
const YOCO_PUBLIC_KEY = "pk_test_REPLACE_WITH_YOUR_YOCO_PUBLIC_KEY";

let db = null;
if (window.firebase && typeof window.firebase.initializeApp === "function") {
  window.firebase.initializeApp(FIREBASE_CONFIG);
  db = window.firebase.firestore();
}

const formatPrice = (amount, regionCode = activeRegion) => {
  const r = REGIONS[regionCode] || REGIONS.ZA;
  return new Intl.NumberFormat(r.locale, {
    style: "currency",
    currency: r.currency,
    minimumFractionDigits: r.currency === "ZAR" ? 2 : 0,
    maximumFractionDigits: r.currency === "ZAR" ? 2 : 0,
  }).format(amount);
};

const updatePrice = () => {
  const r = REGIONS[activeRegion];
  if (fullPriceDisplay) fullPriceDisplay.textContent = formatPrice(getCurrentPrice());
  if (originalPriceDisplay) {
    if (isMember) {
      originalPriceDisplay.textContent = formatPrice(r.full);
      originalPriceDisplay.style.display = "";
    } else {
      originalPriceDisplay.style.display = "none";
    }
  }
  const memberTrigger = document.getElementById("member-trigger");
  const memberBadge = document.getElementById("member-badge");
  if (memberTrigger) memberTrigger.style.display = isMember ? "none" : "";
  if (memberBadge) memberBadge.style.display = isMember ? "" : "none";
  updateRegionUI();
};


const formatSpecs = () => {
  document.querySelectorAll(".spec-value").forEach((el) => {
    // Skip if already formatted or doesn't look like a list
    if (!el.textContent.includes(",") || el.querySelector(".spec-chip")) return;
    
    const items = el.textContent.split(",").map((t) => t.trim()).filter(Boolean);
    if (items.length > 1) {
      el.innerHTML = "";
      el.classList.add("spec-chips");
      items.forEach((text) => {
        const span = document.createElement("span");
        span.className = "spec-chip";
        span.textContent = text;
        el.appendChild(span);
      });
    }
  });
};

const PERSONALISE_TYPES = {
  name:   { max: 10, placeholder: "SMITH",     hint: "Your name or nickname" },
  number: { max: 3,  placeholder: "23",        hint: "Your jersey or lucky number" },
  motto:  { max: 15, placeholder: "ZERO QUIT", hint: "A short word or phrase (max 15 chars)" },
};

const updateBuildSection = () => {
  const applied = document.getElementById("build-applied");
  const appliedText = document.getElementById("build-applied-text");
  const trigger = document.getElementById("build-trigger");

  if (personalization) {
    if (appliedText) appliedText.textContent = `"${personalization.text}"`;
    if (applied) applied.style.display = "flex";
    if (trigger) trigger.style.display = "none";
  } else {
    if (applied) applied.style.display = "none";
    if (trigger) trigger.style.display = "";
  }
};

const detectRegion = async () => {
  try {
    const cached = sessionStorage.getItem("rigg-region");
    if (cached && REGIONS[cached]) return cached;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch("https://ipapi.co/json/", { signal: ctrl.signal });
    clearTimeout(timer);
    const { country_code } = await res.json();
    const code = REGIONS[country_code] ? country_code : DEFAULT_REGION;
    sessionStorage.setItem("rigg-region", code);
    return code;
  } catch {
    return DEFAULT_REGION;
  }
};

const setRegion = (code) => {
  if (!REGIONS[code]) return;
  activeRegion = code;
  sessionStorage.setItem("rigg-region", code);
  updatePrice();
};

const updateRegionUI = () => {
  const r = REGIONS[activeRegion];
  document.querySelectorAll(".region-pill").forEach(el => {
    el.textContent = `${r.flag} ${r.currency}`;
  });
  document.querySelectorAll(".region-option").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.region === activeRegion);
  });
  const modalRegular = document.getElementById("modal-price-regular");
  const modalMember  = document.getElementById("modal-price-member");
  const modalSub     = document.getElementById("modal-sub");
  if (modalRegular) modalRegular.textContent = formatPrice(r.full);
  if (modalMember)  modalMember.textContent  = formatPrice(r.member);
  if (modalSub)     modalSub.textContent     = `Members pay ${formatPrice(r.member)} instead of ${formatPrice(r.full)}. No spam — just launch updates and exclusive drops.`;
};

const initRegionSelector = () => {
  document.querySelectorAll(".region-pill").forEach(pill => {
    pill.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".region-dropdown").forEach(d => d.classList.toggle("active"));
    });
  });
  document.querySelectorAll(".region-option").forEach(btn => {
    btn.addEventListener("click", () => {
      setRegion(btn.dataset.region);
      document.querySelectorAll(".region-dropdown").forEach(d => d.classList.remove("active"));
    });
  });
  document.addEventListener("click", () => {
    document.querySelectorAll(".region-dropdown").forEach(d => d.classList.remove("active"));
  });
  updateRegionUI();
};

let openStripeModal = null;

const initStripeModal = () => {
  const modal = document.getElementById("stripe-modal");
  if (!modal || STRIPE_PUBLIC_KEY.includes("REPLACE") || !window.Stripe) return;

  const stripe = window.Stripe(STRIPE_PUBLIC_KEY);
  const elements = stripe.elements();
  const cardEl = elements.create("card", {
    style: {
      base: {
        color: "#f5f5f5",
        fontFamily: "'Sora', sans-serif",
        fontSize: "15px",
        fontSmoothing: "antialiased",
        "::placeholder": { color: "#b4b4b4" },
      },
      invalid: { color: "#ff6d6d" },
    },
  });
  let cardMounted = false;

  openStripeModal = ({ data, docRef, submitButton, setSubmitError, clearSubmitError }) => {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
    if (!cardMounted) { cardEl.mount("#stripe-card-element"); cardMounted = true; }

    const payBtn       = document.getElementById("stripe-pay-btn");
    const stripeStatus = document.getElementById("stripe-status");
    const stripeAmount = document.getElementById("stripe-amount");
    if (stripeAmount) stripeAmount.textContent = formatPrice(getCurrentPrice());
    if (stripeStatus) stripeStatus.textContent = "";
    if (payBtn) payBtn.textContent = `Pay ${formatPrice(getCurrentPrice())}`;

    const closeModal = () => {
      modal.classList.remove("active");
      document.body.style.overflow = "";
      if (submitButton) { submitButton.disabled = false; submitButton.textContent = "ORDER NOW"; }
    };
    document.getElementById("stripe-close")?.addEventListener("click", closeModal, { once: true });
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); }, { once: true });

    if (payBtn) {
      payBtn.addEventListener("click", async () => {
        payBtn.disabled = true;
        payBtn.textContent = "Processing...";
        if (stripeStatus) stripeStatus.textContent = "";
        try {
          const intentRes = await fetch(CREATE_STRIPE_INTENT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: Math.round(getCurrentPrice() * 100),
              currency: REGIONS[activeRegion].currency.toLowerCase(),
              docId: docRef.id,
              isMember,
              email: data.email,
            }),
          });
          const { clientSecret, error: intentError } = await intentRes.json();
          if (intentError) throw new Error(intentError);

          const { paymentIntent, error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
              card: cardEl,
              billing_details: {
                name: `${data.name} ${data.surname}`.trim() || undefined,
                email: data.email || undefined,
              },
            },
          });

          if (confirmError) {
            if (stripeStatus) { stripeStatus.textContent = confirmError.message; stripeStatus.className = "form-status error"; }
            payBtn.disabled = false;
            payBtn.textContent = `Pay ${formatPrice(getCurrentPrice())}`;
            return;
          }

          if (paymentIntent.status === "succeeded") {
            await fetch(CONFIRM_STRIPE_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paymentIntentId: paymentIntent.id, docId: docRef.id }),
            });
            modal.classList.remove("active");
            document.body.style.overflow = "";
            if (status) { status.textContent = "Payment received. Your order is confirmed."; status.className = "form-status success"; }
            clearSubmitError();
            form.reset();
            updatePrice();
            if (submitButton) { submitButton.disabled = false; submitButton.textContent = "ORDER NOW"; }
          }
        } catch {
          if (stripeStatus) { stripeStatus.textContent = "Payment failed. Please try again."; stripeStatus.className = "form-status error"; }
          payBtn.disabled = false;
          payBtn.textContent = `Pay ${formatPrice(getCurrentPrice())}`;
        }
      }, { once: true });
    }
  };
};

const initBuildModal = (() => {
  let initialized = false;
  return () => {
    if (initialized) return;
    initialized = true;
    const modal = document.getElementById("build-modal");
    if (!modal) return;

    const input = document.getElementById("build-text-input");
    const previewText = document.getElementById("build-preview-text");
    const charCount = document.getElementById("char-count");
    const charMax = document.getElementById("char-max");
    const hint = document.getElementById("build-hint");
    const bagPreview = document.getElementById("build-bag-preview");
    let activeType = "name";

    const openModal = () => {
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
      setTimeout(() => input?.focus(), 100);
    };

    const closeModal = () => {
      modal.classList.remove("active");
      document.body.style.overflow = "";
    };

    const updatePreview = () => {
      const raw = input?.value || "";
      const upper = raw.toUpperCase();
      const cfg = PERSONALISE_TYPES[activeType];
      if (previewText) {
        previewText.textContent = upper || cfg.placeholder;
        previewText.style.opacity = upper ? "1" : "0.18";
      }
      if (charCount) charCount.textContent = raw.length;
    };

    const setPersonaliseType = (type) => {
      activeType = type;
      const cfg = PERSONALISE_TYPES[type];
      if (input) {
        input.maxLength = cfg.max;
        input.placeholder = cfg.placeholder;
        input.value = personalization?.type === type ? personalization.text : "";
      }
      if (charMax) charMax.textContent = cfg.max;
      if (hint) hint.textContent = cfg.hint;
      if (bagPreview) bagPreview.dataset.type = type;
      modal.querySelectorAll(".type-tab").forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.type === type);
      });
      updatePreview();
    };

    modal.querySelectorAll(".type-tab").forEach((tab) => {
      tab.addEventListener("click", () => setPersonaliseType(tab.dataset.type));
    });
    input?.addEventListener("input", updatePreview);

    document.getElementById("build-trigger")?.addEventListener("click", openModal);
    document.getElementById("build-edit")?.addEventListener("click", () => {
      if (personalization) setPersonaliseType(personalization.type);
      openModal();
    });

    document.getElementById("build-remove")?.addEventListener("click", () => {
      personalization = null;
      if (input) input.value = "";
      setPersonaliseType("name");
      updateBuildSection();
    });

    document.getElementById("build-close")?.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
    document.getElementById("build-skip")?.addEventListener("click", closeModal);

    document.getElementById("build-confirm")?.addEventListener("click", () => {
      const text = (input?.value || "").trim().toUpperCase();
      personalization = text ? { type: activeType, text } : null;
      updateBuildSection();
      closeModal();
    });

    setPersonaliseType("name");
  };
})();

const initMemberModal = () => {
  const modal = document.getElementById("member-modal");
  if (!modal) return;

  const openModal = () => {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    modal.classList.remove("active");
    document.body.style.overflow = "";
    localStorage.setItem("rigg-modal-seen", "1");
  };

  document.getElementById("modal-close")?.addEventListener("click", closeModal);
  document.getElementById("modal-skip")?.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  document.getElementById("member-trigger")?.addEventListener("click", openModal);

  document.getElementById("modal-join")?.addEventListener("click", async () => {
    const emailInput = document.getElementById("modal-email");
    const email = emailInput?.value.trim();
    if (!email || !email.includes("@")) {
      if (emailInput) {
        emailInput.classList.add("input-error");
        emailInput.focus();
      }
      return;
    }
    emailInput?.classList.remove("input-error");
    if (db) {
      try {
        await db.collection("members").doc(email).set({ email, joined_at: new Date().toISOString() });
      } catch (_) {}
    }
    isMember = true;
    updatePrice();
    closeModal();
  });

  if (!localStorage.getItem("rigg-modal-seen")) {
    setTimeout(openModal, 2500);
  }
};

const initPricing = async () => {
  activeRegion = await detectRegion();
  updatePrice();
  updateCountdown();
  formatSpecs();
  if (!revealsInitialized) {
    setupScrollReveals();
    revealsInitialized = true;
  }
  initMemberModal();
  initBuildModal();
  initRegionSelector();
  initStripeModal();
};

const setupScrollReveals = () => {
  const groups = [
    {
      selector: ".card, .gallery-track img, .ecosystem-card, .spec-card",
      reveal: "up",
    },
    {
      selector:
        ".section h2, .section p.lead, .hero h1, .hero p, .pricing-card, .founder-meta, .founder-pricing",
      reveal: "left",
    },
    {
      selector: ".hero-media, .media-full, .addons-panel, .form",
      reveal: "block",
    },
  ];

  const elements = [];
  groups.forEach(({ selector, reveal }) => {
    document.querySelectorAll(selector).forEach((el) => {
      if (el.classList.contains("reveal")) return;
      el.classList.add("reveal");
      el.dataset.reveal = reveal;
      elements.push(el);
    });
  });

  if (!elements.length) return;
  if (!("IntersectionObserver" in window)) {
    elements.forEach((el) => el.classList.add("in-view"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in-view");
        obs.unobserve(entry.target);
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
  );

  elements.forEach((el) => observer.observe(el));
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
      currency: REGIONS[activeRegion].currency,
      price: getCurrentPrice(),
      region: activeRegion,
      is_member: isMember,
      personalization: personalization ? { type: personalization.type, text: personalization.text } : null,
      paid: false,
    };

    if (!data.email && !data.number) {
      status.textContent = "Please provide an email or number.";
      setSubmitError();
      if (submitButton) {
        submitButton.disabled = false;
      submitButton.textContent = "ORDER NOW";
      }
      return;
    }

    status.textContent = "Submitting your reservation...";
    status.className = "form-status submitting";

    try {
      if (!db) {
        throw new Error("Firestore not available.");
      }
      if (!window.YocoSDK) {
        throw new Error("Yoco not available.");
      }

      const docRef = await db.collection("preorders").add({
        ...data,
        created_at: new Date().toISOString(),
      });

      if (activeRegion === "ZA") {
        const yoco = new window.YocoSDK({ publicKey: YOCO_PUBLIC_KEY });
        yoco.showPopup({
          amountInCents: Math.round(getCurrentPrice() * 100),
          currency: "ZAR",
          name: "RIGG Core",
          description: [
            isMember ? "Member price" : null,
            personalization ? `Personalised: ${personalization.text}` : null,
            "RIGG Core",
          ].filter(Boolean).join(" · "),
          callback: async (result) => {
            if (result.error) {
              status.textContent = "Payment cancelled. Your reservation is saved but unpaid.";
              status.className = "form-status error";
              clearSubmitError();
              if (submitButton) { submitButton.disabled = false; submitButton.textContent = "ORDER NOW"; }
              return;
            }
            const chargeResponse = await fetch(CHARGE_YOCO_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: result.id, email: data.email, docId: docRef.id, isMember }),
            });
            if (!chargeResponse.ok) {
              status.textContent = "Payment received, but confirmation failed. Please contact support.";
              status.className = "form-status error";
              setSubmitError();
              if (submitButton) { submitButton.disabled = false; submitButton.textContent = "ORDER NOW"; }
              return;
            }
            status.textContent = "Payment received. Your order is confirmed.";
            status.className = "form-status success";
            clearSubmitError();
            form.reset();
            updatePrice();
          },
        });
      } else if (typeof openStripeModal === "function") {
        openStripeModal({ data, docRef, submitButton, setSubmitError, clearSubmitError });
      } else {
        status.textContent = "International checkout coming soon — we'll notify you when available.";
        status.className = "form-status";
        if (submitButton) { submitButton.disabled = false; submitButton.textContent = "ORDER NOW"; }
      }
    } catch (error) {
      status.textContent = "";
      status.className = "form-status";
      setSubmitError();
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "ORDER NOW";
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

const siteHeader = document.querySelector(".site-header");
const announcementBar = document.querySelector(".announcement");
const updateHeaderState = () => {
  if (!siteHeader) return;
  siteHeader.classList.toggle("is-scrolled", window.scrollY > 10);
};
const updateAnnouncementHeight = () => {
  if (!announcementBar) return;
  document.documentElement.style.setProperty(
    "--announce-height",
    `${announcementBar.offsetHeight}px`,
  );
};
updateAnnouncementHeight();
updateHeaderState();
window.addEventListener("scroll", updateHeaderState, { passive: true });
window.addEventListener("resize", updateAnnouncementHeight);
window.addEventListener("load", updateAnnouncementHeight);

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
    card.addEventListener("click", (e) => {
      if (e.target.closest(".detail-notify, .detail-cta")) return;
      toggleCard(card);
    });
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleCard(card);
      }
    });
  });

  document.querySelectorAll(".detail-notify-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const product = btn.dataset.product;
      const emailInput = btn.closest(".detail-notify")?.querySelector(".detail-email");
      const email = emailInput?.value.trim();
      if (!email || !email.includes("@")) {
        if (emailInput) { emailInput.style.borderColor = "#f87171"; emailInput.focus(); }
        return;
      }
      if (emailInput) emailInput.style.borderColor = "";
      if (db) {
        try {
          await db.collection("waitlists").add({ product, email, created_at: new Date().toISOString() });
        } catch (_) {}
      }
      btn.textContent = "You're on the list";
      btn.disabled = true;
      if (emailInput) { emailInput.disabled = true; emailInput.style.opacity = "0.4"; }
    });
  });

  document.querySelectorAll(".detail-email").forEach((input) => {
    input.addEventListener("click", (e) => e.stopPropagation());
  });
}

const initFaqToggles = () => {
  const faqItems = Array.from(document.querySelectorAll(".faq-item"));
  const toggleFaq = (item) => {
    const isExpanded = item.classList.toggle("expanded");
    item.setAttribute("aria-expanded", isExpanded);
  };

  faqItems.forEach((item) => {
    if (item.dataset.bound) return;
    item.dataset.bound = "true";
    item.setAttribute("aria-expanded", "false");
    const question = item.querySelector(".faq-question");
    if (question) {
      question.addEventListener("click", () => toggleFaq(item));
      question.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleFaq(item);
        }
      });
    }
  });
};

const galleryTrack = document.querySelector(".gallery-track");
if (galleryTrack) {
  // Duplicate gallery items for seamless scroll animation
  const galleryItems = Array.from(galleryTrack.children);
  galleryItems.forEach((item) => {
    const clone = item.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    galleryTrack.appendChild(clone);
  });

  // Lightbox logic
  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  const lightboxImg = document.createElement("img");
  lightbox.appendChild(lightboxImg);
  document.body.appendChild(lightbox);

  galleryTrack.addEventListener("click", (e) => {
    if (e.target.tagName === "IMG") {
      lightboxImg.src = e.target.src;
      lightbox.classList.add("active");
      galleryTrack.classList.add("paused");
      document.body.style.overflow = "hidden";
    }
  });

  lightbox.addEventListener("click", () => {
    lightbox.classList.remove("active");
    galleryTrack.classList.remove("paused");
    document.body.style.overflow = "";
  });
}

const wireCtas = () => {
  const candidates = document.querySelectorAll(".button, a[href='#preorder-form']");
  candidates.forEach((btn) => {
    if (form && form.contains(btn)) return; // Skip actual submit button

    const text = btn.textContent.toLowerCase();
    const shouldWire =
      btn.getAttribute("href") === "#preorder-form" ||
      text.includes("reserve") ||
      text.includes("notify") ||
      text.includes("claim");

    if (shouldWire) {
      btn.addEventListener("click", (e) => {
        // If it's a link to something else, don't hijack
        if (btn.tagName === "A") {
          const href = btn.getAttribute("href");
          if (href && href !== "#" && href !== "#preorder-form") return;
        }

        e.preventDefault();
        if (form) {
          form.scrollIntoView({ behavior: "smooth", block: "center" });
          const input = form.querySelector("input");
          if (input) setTimeout(() => input.focus({ preventScroll: true }), 500);
        }
      });
    }
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", wireCtas);
} else {
  wireCtas();
}

const initVideos = () => {
  const videos = document.querySelectorAll("video");
  videos.forEach((video) => {
    if (video.readyState >= 3) {
      video.classList.add("loaded");
    } else {
      video.addEventListener("canplay", () => video.classList.add("loaded"), { once: true });
    }
  });
};

window.addEventListener("load", initVideos);

const initSmoothScrollFeedback = () => {
  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const id = link.getAttribute("href").substring(1);
    if (!id) return;

    const target = document.getElementById(id);
    if (target) {
      target.classList.remove("section-highlight");
      void target.offsetWidth; // Force reflow
      target.classList.add("section-highlight");
    }
  });
};

initSmoothScrollFeedback();

const clarifyProduct = () => {
  const heroHeader = document.querySelector(".hero h1");
  if (heroHeader && !document.querySelector(".product-tagline")) {
    const tag = document.createElement("div");
    tag.className = "product-tagline";
    tag.textContent = "RIGG Core — Sport Carry System";
    heroHeader.parentNode.insertBefore(tag, heroHeader);
  }
};

window.addEventListener("DOMContentLoaded", clarifyProduct);

const populateFAQ = () => {
  const note = document.querySelector(".deposit-note");
  if (!note) return;
  const depositSection = note.parentElement;

  const faqs = [
    {
      label: "Shipping?",
      question: "When will my order ship?",
      answer:
        "We dispatch within 1–2 weeks of your order. You'll receive a shipping notification with tracking once your RIGG is on its way.",
    },
    {
      label: "Delays?",
      question: "What happens if there are delays?",
      answer:
        "We are working hard to meet our shipping target. If any delays occur, we will communicate updates promptly via email and on our website.",
    },
    {
      label: "Refunds?",
      question: "Is my deposit refundable?",
      answer:
        "Yes. If you change your mind for any reason before your unit ships, you can request a full refund of your deposit. No questions asked.",
    },
  ];

  const pillsContainer = document.createElement("div");
  pillsContainer.className = "trust-pills";

  const answerBox = document.createElement("div");
  answerBox.className = "trust-answer";

  faqs.forEach((faq) => {
    const btn = document.createElement("button");
    btn.textContent = faq.label;
    btn.type = "button";
    btn.addEventListener("click", () => {
      const isSame = answerBox.textContent === faq.answer && answerBox.style.display === "block";
      pillsContainer.querySelectorAll("button").forEach(b => b.classList.remove("active"));
      if (isSame) {
        answerBox.style.display = "none";
      } else {
        btn.classList.add("active");
        answerBox.textContent = faq.answer;
        answerBox.style.display = "block";
      }
    });
    pillsContainer.appendChild(btn);
  });

  depositSection.appendChild(pillsContainer);
  depositSection.appendChild(answerBox);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", populateFAQ);
} else {
  populateFAQ();
}



const simplifyTerminology = () => {
  const headings = document.querySelectorAll("h2");
  headings.forEach((h2) => {
    if (h2.textContent.includes("Ecosystem Roadmap")) {
      h2.textContent = "Roadmap";
    }
  });
};

window.addEventListener("DOMContentLoaded", simplifyTerminology);

const clarifySpecs = () => {
  const specCards = document.querySelectorAll(".spec-card");
  specCards.forEach((card) => {
    const text = card.textContent.toLowerCase();
    if (text.includes("scratch-proof") && !card.querySelector(".spec-note")) {
      const note = document.createElement("span");
      note.className = "spec-note";
      note.textContent = "Body & Docking Interface";
      card.appendChild(note);
    } else if (text.includes("magnetic") && !card.querySelector(".spec-note")) {
      const note = document.createElement("span");
      note.className = "spec-note";
      note.textContent = "Universal (Bare Steel & Rubber)";
      card.appendChild(note);
    }
  });
};

window.addEventListener("DOMContentLoaded", clarifySpecs);

const addFeatureDetails = () => {
  const featureCards = document.querySelectorAll("#features .card");
  const details = {
    "Magnetic Dock":
      "Snap RIGG to any metal surface — gym rack, court fence, frame, or bar. Your gear stays exactly where you need it, whatever sport you play.",
    "Everything in Reach":
      "Phone, wallet, keys, bottle — all within arm's reach without being on your body. Grab what you need between sets, plays, or laps without breaking stride.",
    "Built Tough":
      "Scratch-proof shell. Water-resistant lining. Wipe clean in seconds. Built for gym floors, court-side conditions, and outdoor training environments alike.",
  };

  featureCards.forEach((card) => {
    const titleEl = card.querySelector("h3");
    const descEl = card.querySelector("p");
    if (titleEl && descEl) {
      const titleText = titleEl.textContent.trim();
      if (details[titleText]) {
        descEl.textContent = details[titleText];
      }
    }
  });
};

window.addEventListener("DOMContentLoaded", addFeatureDetails);

