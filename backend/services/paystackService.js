const crypto = require("crypto");

const PAYSTACK_BASE = "https://api.paystack.co";

function getSecretKey() {
  return process.env.PAYSTACK_SECRET_KEY || "";
}

function getPublicKey() {
  return process.env.PAYSTACK_PUBLIC_KEY || "";
}

function getCurrency() {
  return process.env.PAYSTACK_CURRENCY || "GHS";
}

function ghsToPesewas(amountGhs) {
  return Math.round(Number(amountGhs) * 100);
}

function generateReference(userId) {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `FB-${userId}-${Date.now()}-${suffix}`;
}

async function paystackRequest(path, options = {}) {
  const secretKey = getSecretKey();
  if (!secretKey) {
    throw new Error("Paystack secret key is not configured");
  }

  const response = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json();
  if (!response.ok || !data.status) {
    const message = data.message || "Paystack request failed";
    const error = new Error(message);
    error.paystack = data;
    throw error;
  }

  return data;
}

async function initializeTransaction({
  email,
  amountPesewas,
  reference,
  callbackUrl,
  metadata,
}) {
  const payload = {
    email,
    amount: amountPesewas,
    currency: getCurrency(),
    reference,
    metadata,
  };

  // Omit callback_url for inline popup flow — it causes Paystack to load the
  // callback page inside the modal iframe instead of firing onSuccess.
  if (callbackUrl) {
    payload.callback_url = callbackUrl;
  }

  return paystackRequest("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function verifyTransaction(reference) {
  return paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`, {
    method: "GET",
  });
}

function verifyWebhookSignature(rawBody, signature) {
  const secret = getSecretKey();
  if (!secret || !signature) return false;

  const hash = crypto
    .createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex");

  return hash === signature;
}

module.exports = {
  getSecretKey,
  getPublicKey,
  getCurrency,
  ghsToPesewas,
  generateReference,
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
};
