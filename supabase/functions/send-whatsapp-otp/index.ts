import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Webhook } from "npm:standardwebhooks@^1";

type SendSmsHookPayload = {
  user?: { phone?: string | null };
  sms?: { otp?: string | null };
};

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function requiredEnv(name: string) {
  const value = String(Deno.env.get(name) ?? "").trim();
  if (!value) throw new Error(`MISSING_${name}`);
  return value;
}

function normalizePhone(value: unknown) {
  const phone = String(value ?? "").replace(/[^0-9]/g, "");
  if (phone.length < 8 || phone.length > 15) throw new Error("INVALID_PHONE");
  return phone;
}

function normalizeOtp(value: unknown) {
  const otp = String(value ?? "").replace(/\D/g, "");
  if (otp.length < 4 || otp.length > 10) throw new Error("INVALID_OTP");
  return otp;
}

async function sendMetaAuthenticationTemplate(phone: string, otp: string) {
  const accessToken = requiredEnv("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = requiredEnv("WHATSAPP_PHONE_NUMBER_ID");
  const templateName = requiredEnv("WHATSAPP_OTP_TEMPLATE_NAME");
  const languageCode = String(Deno.env.get("WHATSAPP_OTP_TEMPLATE_LANGUAGE") ?? "en_US").trim() || "en_US";
  const graphVersion = String(Deno.env.get("WHATSAPP_GRAPH_VERSION") ?? "v23.0").trim() || "v23.0";

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phone,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components: [
        { type: "body", parameters: [{ type: "text", text: otp }] },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: otp }],
        },
      ],
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const metaResponse = await fetch(
      `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(phoneNumberId)}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      },
    );

    const data = await metaResponse.json().catch(() => ({}));
    if (!metaResponse.ok || !Array.isArray(data?.messages) || !data.messages[0]?.id) {
      throw new Error(`META_DELIVERY_${metaResponse.status}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return response({ error: "not_allowed" }, 405);

  try {
    const payloadText = await req.text();
    if (!payloadText || payloadText.length > 65536) return response({ error: "invalid_payload" }, 400);

    const rawSecret = requiredEnv("SEND_SMS_HOOK_SECRET");
    const hookSecret = rawSecret.replace(/^v1,whsec_/, "");
    const webhook = new Webhook(hookSecret);
    const headers = Object.fromEntries(req.headers.entries());
    const verified = webhook.verify(payloadText, headers) as SendSmsHookPayload;

    const phone = normalizePhone(verified?.user?.phone);
    const otp = normalizeOtp(verified?.sms?.otp);
    await sendMetaAuthenticationTemplate(phone, otp);
    return response({});
  } catch (error) {
    const code = String((error as Error)?.message ?? "");
    if (code.startsWith("MISSING_")) return response({ error: "provider_not_configured" }, 503);
    if (code === "INVALID_PHONE" || code === "INVALID_OTP") return response({ error: "invalid_hook_payload" }, 400);
    if (code.startsWith("META_DELIVERY_") || (error as Error)?.name === "AbortError") return response({ error: "delivery_failed" }, 502);
    return response({ error: "invalid_hook_signature" }, 401);
  }
});
