import crypto from "node:crypto";
import { sendManagedWhatsAppAuthCode } from "../../../../lib/integrations/server.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Pragma": "no-cache",
  "X-Content-Type-Options": "nosniff",
  "Content-Type": "application/json; charset=utf-8",
};
const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function hookSecrets() {
  const raw = String(
    process.env.SUPABASE_SEND_SMS_HOOK_SECRET ||
    process.env.SEND_SMS_HOOK_SECRET ||
    process.env.SEND_SMS_HOOK_SECRETS ||
    "",
  );
  return raw
    .split("|")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.startsWith("v1,") ? value.slice(3) : value)
    .map((value) => value.startsWith("whsec_") ? value.slice(6) : value)
    .map((value) => Buffer.from(value, "base64"))
    .filter((value) => value.length >= 24 && value.length <= 64);
}

function verifyStandardWebhook(rawBody, request) {
  const msgId = String(request.headers.get("webhook-id") || "").trim();
  const timestampText = String(request.headers.get("webhook-timestamp") || "").trim();
  const signatureHeader = String(request.headers.get("webhook-signature") || "").trim();
  if (!msgId || !timestampText || !signatureHeader || msgId.includes(".")) return false;

  const timestamp = Number(timestampText);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isInteger(timestamp) || Math.abs(now - timestamp) > WEBHOOK_TOLERANCE_SECONDS) return false;

  const signatures = signatureHeader.split(/\s+/).map((entry) => entry.split(",")).filter(([version, signature]) => version === "v1" && signature);
  if (!signatures.length) return false;
  const signedPayload = `${msgId}.${timestamp}.${rawBody}`;

  for (const secret of hookSecrets()) {
    const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("base64");
    if (signatures.some(([, signature]) => safeEqual(signature, expected))) return true;
  }
  return false;
}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...NO_STORE_HEADERS, ...extraHeaders },
  });
}

export async function POST(request) {
  if (!hookSecrets().length) {
    return json({ error: { http_code: 503, message: "WhatsApp authentication hook is not configured." } }, 503, { "Retry-After": "10" });
  }

  const rawBody = await request.text();
  if (!verifyStandardWebhook(rawBody, request)) {
    return json({ error: { http_code: 401, message: "Invalid authentication hook signature." } }, 401);
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: { http_code: 400, message: "Invalid authentication hook payload." } }, 400);
  }

  const phone = String(payload?.user?.phone || "").trim();
  const otp = String(payload?.sms?.otp || "").trim();
  if (!/^\+[1-9]\d{7,14}$/.test(phone) || !/^\d{6,10}$/.test(otp)) {
    return json({ error: { http_code: 400, message: "Authentication hook payload is incomplete." } }, 400);
  }

  try {
    const result = await sendManagedWhatsAppAuthCode({ to: phone, code: otp });
    if (result?.status !== "completed") {
      return json({ error: { http_code: 503, message: "WhatsApp authentication delivery is not configured." } }, 503, { "Retry-After": "10" });
    }
    // Never return, log or persist the OTP, phone number or provider message body.
    return json({}, 200);
  } catch {
    return json({ error: { http_code: 503, message: "WhatsApp authentication delivery failed temporarily." } }, 503, { "Retry-After": "10" });
  }
}