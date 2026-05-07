const form = document.getElementById("preorder-form");
const status = document.getElementById("form-status");
const fullPriceDisplay = document.getElementById("full-price");
const FULL_PRICE = 499.99;
let personalization = null;

const getCurrentPrice = () => FULL_PRICE;
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

// Replace with your live Yoco public key from the Yoco Dashboard → Developers → API Keys
const YOCO_PUBLIC_KEY = "pk_test_REPLACE_WITH_YOUR_YOCO_PUBLIC_KEY";
const CHARGE_YOCO_URL = "https://us-central1-rigg-ae114.cloudfunctions.net/chargeYoco";

let db = null;
if (window.firebase && typeof window.firebase.initializeApp === "function") {
  window.firebase.initializeApp(FIREBASE_CONFIG);
  db = window.firebase.firestore();
}

const formatZar = (amount) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

const updatePrice = () => {
  if (fullPriceDisplay) fullPriceDisplay.textContent = formatZar(getCurrentPrice());
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


const initPricing = () => {
  updatePrice();
  updateCountdown();
  formatSpecs();
  if (!revealsInitialized) {
    setupScrollReveals();
    revealsInitialized = true;
  }
  initBuildModal();
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
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPricing);
  } else {
    initPricing();
  }
  setInterval(updateCountdown, 1000);
} catch (error) {
  // Leave placeholders if something unexpected happens.
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitBtn = form.querySelector('[type="submit"]');
    const resetBtn = () => {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Continue to Yoco →"; }
    };
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Processing…"; }

    // Save personalization to Firestore and capture doc ID
    let docId = null;
    if (db && personalization) {
      try {
        const ref = await db.collection("preorders").add({
          personalization_type: personalization.type,
          personalization_text: personalization.text,
          status: "pending_payment",
          created_at: window.firebase?.firestore?.FieldValue?.serverTimestamp() ?? new Date().toISOString(),
          source: window.location.pathname.includes("lp") ? "lp" : "main",
        });
        docId = ref.id;
      } catch (_) {}
    }

    // Inline Yoco SDK checkout (requires real public key + deployed Cloud Function)
    if (
      YOCO_PUBLIC_KEY !== "pk_test_REPLACE_WITH_YOUR_YOCO_PUBLIC_KEY" &&
      window.YocoSDK
    ) {
      try {
        const yoco = new window.YocoSDK({ publicKey: YOCO_PUBLIC_KEY });
        yoco.showPopup({
          amountInCents: Math.round(getCurrentPrice() * 100),
          currency: "ZAR",
          name: "RIGG Core",
          description: personalization ? `Personalised: ${personalization.text}` : "Sport Carry System",
          callback: async (result) => {
            if (result.error) {
              resetBtn();
              if (status) status.textContent = result.error.message || "Payment failed. Please try again.";
              return;
            }
            try {
              const res = await fetch(CHARGE_YOCO_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token: result.id, docId }),
              });
              if (!res.ok) throw new Error();
              if (submitBtn) submitBtn.textContent = "Order confirmed!";
              if (status) status.textContent = "Payment successful — we'll be in touch shortly.";
            } catch (_) {
              resetBtn();
              if (status) status.textContent = "Something went wrong. Please try again.";
            }
          },
        });
        return;
      } catch (_) {}
    }

    // Fallback: redirect to Yoco payment link
    window.location.href = "https://pay.yoco.com/r/2D9yPL";
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
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (emailInput) { emailInput.style.borderColor = "#f87171"; emailInput.focus(); }
        return;
      }
      if (emailInput) emailInput.style.borderColor = "";
      if (db) {
        try {
          await db.collection("waitlists").add({ product, email, created_at: window.firebase?.firestore?.FieldValue?.serverTimestamp() ?? new Date().toISOString() });
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
  lightboxImg.alt = "";
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
    if (form && form.contains(btn)) return;
    if (btn.closest(".email-fallback, .newsletter-card, .member-modal, .build-modal")) return;

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
  document.addEventListener("DOMContentLoaded", () => {
    wireCtas();
    wireEmailFallback();
    initMobileCta();
    initExitIntent();
    initBagPhoto();
    initBundleBuilder();
    initAmbassadorApply();
  });
} else {
  wireCtas();
  wireEmailFallback();
  initMobileCta();
  initExitIntent();
  initBagPhoto();
  initBundleBuilder();
  initAmbassadorApply();
}
updateOrderCount();

const initVideos = () => {
  document.querySelectorAll("video").forEach((video) => {
    if (video.readyState >= 3) {
      video.classList.add("loaded");
    } else {
      video.addEventListener("canplay", () => video.classList.add("loaded"), { once: true });
    }
    video.querySelectorAll("source").forEach((source) => {
      source.addEventListener("error", () => {
        video.closest("section")?.style.setProperty("display", "none");
      }, { once: true });
    });
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
  const depositSection = document.querySelector(".form");
  if (!depositSection) return;

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

const initMobileCta = () => {
  const bar = document.getElementById("mobile-cta-bar");
  if (!bar) return;
  const preorder = document.getElementById("preorder");
  if (preorder) {
    new IntersectionObserver(
      ([entry]) => bar.classList.toggle("hide", entry.isIntersecting),
      { threshold: 0.2 }
    ).observe(preorder);
  }
};

const initExitIntent = () => {
  const modal = document.getElementById("member-modal");
  if (!modal) return;

  let triggered = false;
  const trigger = () => {
    if (triggered) return;
    triggered = true;
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  document.addEventListener("mouseleave", (e) => { if (e.clientY < 0) trigger(); });
  setTimeout(trigger, 30000);

  const close = () => { modal.classList.remove("active"); document.body.style.overflow = ""; };
  document.getElementById("modal-close")?.addEventListener("click", close);
  document.getElementById("modal-skip")?.addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

  document.getElementById("modal-join")?.addEventListener("click", async () => {
    const emailEl = document.getElementById("modal-email");
    const email = emailEl?.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { emailEl?.focus(); return; }
    if (db) {
      try {
        await db.collection("waitlists").add({
          product: "core", email, discount: true,
          source: "exit_intent", created_at: window.firebase?.firestore?.FieldValue?.serverTimestamp() ?? new Date().toISOString(),
        });
      } catch (_) {}
    }
    const joinBtn = document.getElementById("modal-join");
    if (joinBtn) { joinBtn.textContent = "You're on the list!"; joinBtn.disabled = true; }
    if (emailEl) { emailEl.disabled = true; emailEl.style.opacity = "0.4"; }
    setTimeout(close, 1800);
  });
};

const initBundleBuilder = () => {
  const addons = document.querySelectorAll(".bundle-addon");
  const totalEl = document.getElementById("bundle-total");
  const savingLine = document.getElementById("bundle-saving-line");
  const savingAmountEl = document.getElementById("bundle-saving-amount");
  const emailWrap = document.getElementById("bundle-email-wrap");
  const emailInput = document.getElementById("bundle-email");
  const orderBtn = document.getElementById("bundle-order");
  if (!addons.length || !orderBtn) return;

  const FULL_BUNDLE_DISCOUNT = 30;

  const selected = () => Array.from(addons).filter(el => el.dataset.selected === "true");

  const refresh = () => {
    const sel = selected();
    let total = getCurrentPrice() + sel.reduce((s, el) => s + parseFloat(el.dataset.price), 0);
    const saving = sel.length >= 2 ? FULL_BUNDLE_DISCOUNT : 0;
    total -= saving;

    if (totalEl) {
      totalEl.textContent = `R${total.toFixed(2)}`;
      totalEl.classList.add("updated");
      setTimeout(() => totalEl.classList.remove("updated"), 600);
    }
    if (savingLine) savingLine.style.display = saving > 0 ? "" : "none";
    if (savingAmountEl) savingAmountEl.textContent = `R${saving} off`;
    if (emailWrap) emailWrap.style.display = sel.length > 0 ? "" : "none";
    const label = sel.length > 0
      ? `Order Core + Reserve ${sel.length} accessor${sel.length > 1 ? "ies" : "y"} →`
      : "Order Core →";
    if (orderBtn) orderBtn.textContent = label;
  };

  addons.forEach(row => {
    row.addEventListener("click", (e) => {
      if (e.target.closest("input")) return;
      const isSelected = row.dataset.selected === "true";
      row.dataset.selected = isSelected ? "false" : "true";
      row.classList.toggle("selected", !isSelected);
      const btn = row.querySelector(".bundle-check");
      if (btn) btn.setAttribute("aria-pressed", String(!isSelected));
      refresh();
    });
  });

  orderBtn.addEventListener("click", async () => {
    const sel = selected();
    const email = emailInput?.value.trim();
    if (sel.length > 0 && (!email || !email.includes("@"))) {
      if (emailInput) { emailInput.style.borderColor = "#f87171"; emailInput.focus(); }
      return;
    }
    if (emailInput) emailInput.style.borderColor = "";
    orderBtn.disabled = true;
    orderBtn.textContent = "Processing…";
    if (db) {
      try {
        await db.collection("bundles").add({
          core: true,
          addons: sel.map(el => el.dataset.addon),
          email: email || null,
          status: "pending_payment",
          created_at: window.firebase?.firestore?.FieldValue?.serverTimestamp() ?? new Date().toISOString(),
        });
      } catch (_) {}
    }
    window.location.href = "https://pay.yoco.com/r/2D9yPL";
  });
};

const initAmbassadorApply = () => {
  const btn = document.getElementById("ambassador-apply-btn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const input = document.getElementById("ambassador-email");
    const statusEl = document.getElementById("ambassador-status");
    const email = input?.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { input?.focus(); return; }
    if (db) {
      try {
        await db.collection("ambassadors").add({
          email,
          created_at: window.firebase?.firestore?.FieldValue?.serverTimestamp() ?? new Date().toISOString(),
        });
      } catch (_) {}
    }
    btn.textContent = "Applied!";
    btn.disabled = true;
    if (input) { input.disabled = true; input.style.opacity = "0.4"; }
    if (statusEl) statusEl.textContent = "We'll be in touch — check your inbox.";
  });
};

const initBagPhoto = () => {
  document.querySelectorAll(".bag-photo").forEach((img) => {
    const activate = () => img.classList.add("loaded");
    if (img.complete && img.naturalWidth > 0) {
      activate();
    } else {
      img.addEventListener("load", activate, { once: true });
      img.addEventListener("error", () => { img.style.display = "none"; }, { once: true });
    }
  });
};

const wireEmailFallback = () => {
  document.querySelectorAll(".email-fallback, .newsletter-card").forEach((block) => {
    const input = block.querySelector("input[type='email']");
    const btn = block.querySelector("button");
    if (!input || !btn || btn.dataset.wired) return;
    btn.dataset.wired = "true";
    btn.addEventListener("click", async () => {
      const email = input.value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        input.style.borderColor = "#f87171";
        input.focus();
        return;
      }
      input.style.borderColor = "";
      if (db) {
        try {
          await db.collection("waitlists").add({ product: "core", email, created_at: window.firebase?.firestore?.FieldValue?.serverTimestamp() ?? new Date().toISOString() });
        } catch (_) {}
      }
      btn.textContent = "You're on the list";
      btn.disabled = true;
      input.disabled = true;
      input.style.opacity = "0.4";
    });
  });
};

const updateOrderCount = async () => {
  if (!db) return;
  try {
    const snap = await db.collection("preorders").count().get();
    const count = snap.data().count;
    if (count > 0) {
      document.querySelectorAll(".order-count").forEach((el) => {
        el.textContent = `${count} reserved · `;
        el.style.display = "";
      });
    }
  } catch (_) {}
};

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

