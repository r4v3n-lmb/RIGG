const form = document.getElementById("preorder-form");
const status = document.getElementById("form-status");
const fullPriceDisplay = document.getElementById("full-price");
const originalPriceDisplay = document.getElementById("original-price");
const counterValues = Array.from(document.querySelectorAll(".counter-value"));
const counterTotals = Array.from(document.querySelectorAll(".counter-total"));
const CURRENCY = "ZAR";
const FULL_PRICE = 499.99;
const MEMBER_PRICE = 449.99;
let isMember = false;
let personalization = null;
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

const formatZar = (amount) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(amount);

const updatePrice = () => {
  if (fullPriceDisplay) {
    fullPriceDisplay.textContent = formatZar(isMember ? MEMBER_PRICE : FULL_PRICE);
  }
  if (originalPriceDisplay) {
    if (isMember) {
      originalPriceDisplay.textContent = formatZar(FULL_PRICE);
      originalPriceDisplay.style.display = "";
    } else {
      originalPriceDisplay.style.display = "none";
    }
  }
  const memberTrigger = document.getElementById("member-trigger");
  const memberBadge = document.getElementById("member-badge");
  if (memberTrigger) memberTrigger.style.display = isMember ? "none" : "";
  if (memberBadge) memberBadge.style.display = isMember ? "" : "none";
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

const PERSONALISE_TYPES = {
  name:   { max: 10, placeholder: "SMITH",     hint: "Your name or nickname" },
  number: { max: 3,  placeholder: "23",        hint: "Your jersey or lucky number" },
  motto:  { max: 15, placeholder: "ZERO QUIT", hint: "A short word or phrase (max 15 chars)" },
};

const updatePersonaliseSection = () => {
  const applied = document.getElementById("personalise-applied");
  const appliedText = document.getElementById("personalise-applied-text");
  const trigger = document.getElementById("personalise-trigger");
  if (personalization) {
    if (appliedText) appliedText.textContent = `"${personalization.text}"`;
    if (applied) applied.style.display = "flex";
    if (trigger) trigger.style.display = "none";
  } else {
    if (applied) applied.style.display = "none";
    if (trigger) trigger.style.display = "";
  }
};

const initCustomiseModal = (() => {
  let initialized = false;
  return () => {
    if (initialized) return;
    initialized = true;
    const modal = document.getElementById("customise-modal");
    if (!modal) return;

    const input = document.getElementById("customise-input");
    const previewText = document.getElementById("bag-preview-text");
    const charCount = document.getElementById("char-count");
    const charMax = document.getElementById("char-max");
    const hint = document.getElementById("customise-hint");
    const bagPreview = document.getElementById("bag-preview");
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
      const config = PERSONALISE_TYPES[activeType];
      if (previewText) {
        previewText.textContent = upper || config.placeholder;
        previewText.style.opacity = upper ? "1" : "0.18";
      }
      if (charCount) charCount.textContent = raw.length;
    };

    const setType = (type) => {
      activeType = type;
      const config = PERSONALISE_TYPES[type];
      if (input) {
        input.maxLength = config.max;
        input.placeholder = config.placeholder;
        input.value = personalization?.type === type ? personalization.text : "";
      }
      if (charMax) charMax.textContent = config.max;
      if (hint) hint.textContent = config.hint;
      if (bagPreview) bagPreview.dataset.type = type;
      modal.querySelectorAll(".type-tab").forEach(tab => {
        tab.classList.toggle("active", tab.dataset.type === type);
      });
      updatePreview();
    };

    modal.querySelectorAll(".type-tab").forEach(tab => {
      tab.addEventListener("click", () => setType(tab.dataset.type));
    });
    input?.addEventListener("input", updatePreview);

    document.getElementById("personalise-trigger")?.addEventListener("click", openModal);
    document.getElementById("personalise-edit")?.addEventListener("click", () => {
      if (personalization) setType(personalization.type);
      openModal();
    });
    document.getElementById("personalise-remove")?.addEventListener("click", () => {
      personalization = null;
      updatePersonaliseSection();
    });
    document.getElementById("customise-close")?.addEventListener("click", closeModal);
    document.getElementById("customise-skip")?.addEventListener("click", () => {
      personalization = null;
      updatePersonaliseSection();
      closeModal();
    });
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

    document.getElementById("customise-confirm")?.addEventListener("click", () => {
      const text = (input?.value || "").trim().toUpperCase();
      if (!text) {
        if (input) { input.style.borderColor = "#f87171"; input.focus(); }
        return;
      }
      if (input) input.style.borderColor = "";
      personalization = { type: activeType, text };
      updatePersonaliseSection();
      closeModal();
    });

    setType("name");
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

const initPricing = () => {
  updatePrice();
  refreshCounter();
  updateCountdown();
  formatSpecs();
  if (!revealsInitialized) {
    setupScrollReveals();
    revealsInitialized = true;
  }
  initMemberModal();
  initCustomiseModal();
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
      price: isMember ? MEMBER_PRICE : FULL_PRICE,
      is_member: isMember,
      personalization: personalization ? { type: personalization.type, text: personalization.text } : null,
      paid: false,
      locale: navigator.language || "en-US",
      region: (navigator.language || "en-US").split("-")[1] || "US",
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

      const yoco = new window.YocoSDK({ publicKey: YOCO_PUBLIC_KEY });
      yoco.showPopup({
        amountInCents: Math.round((isMember ? MEMBER_PRICE : FULL_PRICE) * 100),
        currency: CURRENCY,
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
            if (submitButton) {
              submitButton.disabled = false;
              submitButton.textContent = "ORDER NOW";
            }
            return;
          }

          const chargeResponse = await fetch(CHARGE_YOCO_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: result.id,
              email: data.email,
              docId: docRef.id,
              isMember,
            }),
          });

          if (!chargeResponse.ok) {
            status.textContent = "Payment received, but confirmation failed. Please contact support.";
            status.className = "form-status error";
            setSubmitError();
            if (submitButton) {
              submitButton.disabled = false;
              submitButton.textContent = "ORDER NOW";
            }
            return;
          }

          status.textContent = "Payment received. Your order is confirmed.";
          status.className = "form-status success";
          clearSubmitError();
          await refreshCounter();
          form.reset();
          updatePrice();
        },
      });
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
        "We dispatch within 7–14 business days of your order. You'll receive a shipping notification with tracking once your RIGG is on its way.",
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

