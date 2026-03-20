# RIGG Project Issues & Improvements

## 🧑‍💻 Development & Technical

- [ ] **Gallery Images:** Ensure final gallery images have unique paths. Currently, the JavaScript duplication logic works, but we need unique source assets to prevent visual repetition.
- [x] **Video Section:** Gracefully handle the video loading state. Ensure the player doesn't look broken before assets load.
- [x] **Wiring:** Verify all "Notify me" / "Reserve" buttons across the page are wired to the main reservation form.
- [x] **Countdown:** Verify timezone handling (`app.js` uses ISO with offset, but double-check Safari support). Ensure a fallback string renders if the date calc fails.
- [x] **Live Counter:** Although the counter is dynamic (Firestore), users perceive it as static HTML. Consider adding a subtle "live" indicator or loading animation to prove it's real data.

## 🎨 UI/UX & Design

- [x] **CTA Consolidation:** Reduce competing CTAs ("Reserve", "Learn More", "Claim"). Prioritize "Reserve" as the primary action; style "Learn More" as a secondary/ghost button.
- [x] **Form Accessibility:** Verify `styles.css` floating labels correspond to semantic `<label>` tags in HTML for accessibility and correct mobile keyboard behavior.
- [x] **Feedback Visibility:** The "Dumb User" felt "nothing happens" when clicking Reserve. Ensure form error/success messages are visually prominent immediately upon clicking.
- [x] **Navigation:** Improve the "Learn More" scroll interaction to be less abrupt or confusing.

## 📝 Content & Clarity

- [x] **Product Definition:** Clarify the physical form factor immediately in the Hero. Is it a bag? A caddy? A magnet clip? "Modular gym carry" is too vague without supporting visuals.
- [x] **Feature Detail:** Expand on headers like "Magnetic Dock" and "Everything in Reach". Add 1-2 sentences explaining *why* it matters.
- [x] **Specs Formatting:** Convert comma-separated lists (Phone, Wallet, Keys...) in the Specs section to bullet points or chips for better scanning.
- [x] **"Founder" Identity:** Explicitly define what makes a "Founder" special beyond just the price discount. Lean into the "shaping the product" narrative.
- [x] **Terminology:** Rename "Ecosystem Roadmap" to simpler language like "Future Gear" or "What's coming next" for general users.
- [x] **Technical Specificity:**
    - Define "Scratch-proof" (Shell? Dock? inner lining?).
    - Define "Magnetic rack mount" compatibility (Works on rubber-coated racks? Bare steel only?).
- [x] **Refund Policy:** Reconcile the statements "fully refundable if we don't ship" vs "deposit refundable before launch". Clarify the "change of mind" policy.
- [x] **FAQ:** Ensure the FAQ section (referenced in Nav) is actually populated with 3-4 core questions to reduce purchase anxiety.
```

<!--
[PROMPT_SUGGESTION]Fix the CTA confusion by styling the "Learn More" button as a secondary ghost button in the CSS.[/PROMPT_SUGGESTION]
[PROMPT_SUGGESTION]Update the Specs section CSS to display the comma-separated list as a grid of chips/tags.[/PROMPT_SUGGESTION]
->