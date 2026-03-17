const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();

const EXPECTED_CURRENCY = "ZAR";
const EXPECTED_AMOUNT = 9999; // R99.99 in cents

exports.verifyPaystack = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  const secret = functions.config().paystack?.secret;
  if (!secret) {
    res.status(500).json({ error: "Missing Paystack secret" });
    return;
  }

  try {
    const { reference, email, docId } = req.body || {};
    if (!reference || !docId) {
      res.status(400).json({ error: "Reference and docId required" });
      return;
    }

    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${secret}`,
        },
      },
    );

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      res.status(502).json({ error: errorText });
      return;
    }

    const payload = await verifyResponse.json();
    const data = payload?.data;
    const verified =
      payload?.status === true &&
      data?.status === "success" &&
      data?.currency === EXPECTED_CURRENCY &&
      data?.amount === EXPECTED_AMOUNT;

    if (!verified) {
      res.status(400).json({ error: "Payment not verified" });
      return;
    }

    const docRef = admin.firestore().collection("preorders").doc(docId);
    await docRef.set(
      {
        paid: true,
        payment_reference: reference,
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
