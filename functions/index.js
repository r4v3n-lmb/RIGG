const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();

const FULL_PRICE_CENTS = 49999;   // R499.99
const MEMBER_PRICE_CENTS = 44999; // R449.99

exports.chargeYoco = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  const secret = functions.config().yoco?.secret;
  if (!secret) {
    res.status(500).json({ error: "Missing Yoco secret" });
    return;
  }

  try {
    const { token, email, docId, isMember } = req.body || {};
    if (!token || !docId) {
      res.status(400).json({ error: "Token and docId required" });
      return;
    }

    let amountInCents = FULL_PRICE_CENTS;
    if (isMember && email) {
      const memberDoc = await admin.firestore().collection("members").doc(email).get();
      if (memberDoc.exists) {
        amountInCents = MEMBER_PRICE_CENTS;
      }
    }

    const chargeResponse = await fetch("https://online.yoco.com/v1/charges/", {
      method: "POST",
      headers: {
        "X-Auth-Secret-Key": secret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        amountInCents,
        currency: "ZAR",
      }),
    });

    if (!chargeResponse.ok) {
      const errorText = await chargeResponse.text();
      res.status(502).json({ error: errorText });
      return;
    }

    const charge = await chargeResponse.json();
    if (charge.status !== "successful") {
      res.status(400).json({ error: "Charge not successful" });
      return;
    }

    const docRef = admin.firestore().collection("preorders").doc(docId);
    await docRef.set(
      {
        paid: true,
        payment_reference: charge.id,
        amount_charged: amountInCents,
        is_member: isMember && amountInCents === MEMBER_PRICE_CENTS,
        paid_at: admin.firestore.FieldValue.serverTimestamp(),
        email: email ?? null,
      },
      { merge: true },
    );

    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: "Invalid request" });
  }
});
