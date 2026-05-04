const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();

const FULL_PRICE_CENTS = 49999;    // R499.99
const MEMBER_PRICE_CENTS = 44999;  // R449.99

// ── Yoco (South Africa) ──────────────────────────────────────
exports.chargeYoco = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }

  const secret = functions.config().yoco?.secret;
  if (!secret) { res.status(500).json({ error: "Missing Yoco secret" }); return; }

  try {
    const { token, email, docId, isMember } = req.body || {};
    if (!token || !docId) { res.status(400).json({ error: "Token and docId required" }); return; }

    let amountInCents = FULL_PRICE_CENTS;
    if (isMember && email) {
      const memberDoc = await admin.firestore().collection("members").doc(email).get();
      if (memberDoc.exists) amountInCents = MEMBER_PRICE_CENTS;
    }

    const chargeResponse = await fetch("https://online.yoco.com/v1/charges/", {
      method: "POST",
      headers: { "X-Auth-Secret-Key": secret, "Content-Type": "application/json" },
      body: JSON.stringify({ token, amountInCents, currency: "ZAR" }),
    });

    if (!chargeResponse.ok) { res.status(502).json({ error: await chargeResponse.text() }); return; }
    const charge = await chargeResponse.json();
    if (charge.status !== "successful") { res.status(400).json({ error: "Charge not successful" }); return; }

    await admin.firestore().collection("preorders").doc(docId).set({
      paid: true,
      payment_reference: charge.id,
      amount_charged: amountInCents,
      is_member: amountInCents === MEMBER_PRICE_CENTS,
      paid_at: admin.firestore.FieldValue.serverTimestamp(),
      email: email ?? null,
    }, { merge: true });

    res.status(200).json({ ok: true });
  } catch {
    res.status(400).json({ error: "Invalid request" });
  }
});

// ── Stripe (International) ───────────────────────────────────
exports.createStripeIntent = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }

  const stripeSecret = functions.config().stripe?.secret;
  if (!stripeSecret) { res.status(500).json({ error: "Missing Stripe secret" }); return; }

  try {
    const stripe = require("stripe")(stripeSecret);
    const { amount, currency, docId, isMember, email } = req.body || {};
    if (!amount || !currency || !docId) { res.status(400).json({ error: "amount, currency and docId required" }); return; }

    const intent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: { docId, isMember: String(!!isMember), email: email || "" },
    });

    res.status(200).json({ clientSecret: intent.client_secret });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to create payment intent" });
  }
});

exports.confirmStripePayment = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(204).send(""); return; }

  const stripeSecret = functions.config().stripe?.secret;
  if (!stripeSecret) { res.status(500).json({ error: "Missing Stripe secret" }); return; }

  try {
    const stripe = require("stripe")(stripeSecret);
    const { paymentIntentId, docId } = req.body || {};
    if (!paymentIntentId || !docId) { res.status(400).json({ error: "paymentIntentId and docId required" }); return; }

    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status !== "succeeded") { res.status(400).json({ error: "Payment not confirmed" }); return; }

    await admin.firestore().collection("preorders").doc(docId).set({
      paid: true,
      payment_reference: paymentIntentId,
      amount_charged: intent.amount,
      currency: intent.currency.toUpperCase(),
      is_member: intent.metadata?.isMember === "true",
      paid_at: admin.firestore.FieldValue.serverTimestamp(),
      email: intent.metadata?.email || null,
    }, { merge: true });

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to confirm payment" });
  }
});
