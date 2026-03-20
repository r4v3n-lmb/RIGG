const form = document.getElementById("preorder-form");
const status = document.getElementById("form-status");
const priceDisplay = document.getElementById("price-display");
const fullPriceDisplay = document.getElementById("full-price");
const depositPriceDisplay = document.getElementById("deposit-price");
const originalPriceDisplay = document.getElementById("original-price");
const fullPriceHighlights = document.querySelectorAll('[data-price="full"]');
const originalPriceHighlights = document.querySelectorAll('[data-price="original"]');
const depositPriceHighlights = document.querySelectorAll('[data-price="deposit"]');
const counterValues = Array.from(document.querySelectorAll(".counter-value"));
const counterTotals = Array.from(document.querySelectorAll(".counter-total"));
const CURRENCY = "ZAR";
const FULL_PRICE = 399.99;
const ORIGINAL_PRICE = 599.99;
const DEPOSIT = 150.0;
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
  fullPriceHighlights.forEach((el) => {
    el.textContent = formatZar(FULL_PRICE);
  });
  originalPriceHighlights.forEach((el) => {
    el.textContent = formatZar(ORIGINAL_PRICE);
  });
  depositPriceHighlights.forEach((el) => {
    el.textContent = formatZar(DEPOSIT);
  });
};

const getMaxUnits = () => {
  const totalEl = counterTotals[0];
  if (!totalEl) return 50;
  const maxMatch = totalEl.textContent.match(/\/\s*(\d+)/);
  return maxMatch ? Number.parseInt(maxMatch[1], 10) : 50;
};

const refreshCounter = async () => {
  if (!db || !counterValues.length) return;
  try {
    const snapshot = await db.collection("preorders").where("paid", "==", true).get();
    const max = getMaxUnits();
    const count = Math.min(snapshot.size ?? 0, max);
    const remaining = max - count;
    counterValues.forEach((el) => {
      el.textContent = String(remaining);
      el.classList.remove("updated");
      void el.offsetWidth; // Force reflow to restart animation
      el.classList.add("updated");
    });
  } catch (error) {
    // Keep existing value if count fetch fails.
  }
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

const initPricing = () => {
  if (!priceDisplay) return;
  updatePrice();
  refreshCounter();
  updateCountdown();
  formatSpecs();
  if (!revealsInitialized) {
    setupScrollReveals();
    revealsInitialized = true;
  }
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
      submitButton.textContent = "RESERVE";
      }
      return;
    }

    status.textContent = "Submitting your reservation...";
    status.className = "form-status submitting";

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
            status.className = "form-status error";
            setSubmitError();
            if (submitButton) {
              submitButton.disabled = false;
              submitButton.textContent = "RESERVE";
            }
            return;
          }

          status.textContent = "Payment received. Your founders spot is confirmed.";
          status.className = "form-status success";
          clearSubmitError();
          await refreshCounter();
          form.reset();
          updatePrice();
        },
        onClose: () => {
          status.textContent = "Payment cancelled. Your reservation is saved but unpaid.";
          status.className = "form-status error";
          clearSubmitError();
          if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "RESERVE";
          }
        },
      });

      handler.openIframe();
    } catch (error) {
      status.textContent = "";
      status.className = "form-status";
      setSubmitError();
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "RESERVE";
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
    card.addEventListener("click", () => toggleCard(card));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleCard(card);
      }
    });
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
    tag.textContent = "Magnetic Gym Caddy & Organizer";
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
        "We are targeting to begin shipping Founder's Edition units in Late Q2 2024. You will receive a shipping notification when your order is on the way.",
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
      "Instantly snap RIGG to any gym rack, keeping your gear off the floor and exactly where you need it. No more bending down or searching for your bottle.",
    "Everything in Reach":
      "Dedicated slots for your phone, wallet, keys, and bottle mean no more fumbling. Everything has its place, so you can focus on your workout.",
    "Built Tough":
      "Constructed with a scratch-proof shell and water-resistant materials, RIGG is designed to handle the toughest gym environments, day in and day out.",
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

const enhanceFounderIdentity = () => {
  const pricingCard = document.querySelector(".pricing-card");
  if (pricingCard && !pricingCard.querySelector(".founder-explainer")) {
    const explainer = document.createElement("div");
    explainer.className = "founder-explainer";
    explainer.innerHTML = `
      <p>
        <strong>Become a Co-Creator</strong>
        Founders receive a sequentially numbered unit from the first batch and gain voting rights on future ecosystem modules. You help shape what we build next.
      </p>
    `;

    // Insert before the pricing meta (deposit/social proof section)
    const metaSection = pricingCard.querySelector(".pricing-meta");
    if (metaSection) {
      pricingCard.insertBefore(explainer, metaSection);
    } else {
      pricingCard.appendChild(explainer);
    }
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", enhanceFounderIdentity);
} else {
  enhanceFounderIdentity();
}
