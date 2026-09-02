import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

function constantTimeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function verifySignature(rawBody, signature, appSecret) {
  if (!signature?.startsWith("sha256=") || !appSecret) return false;
  const expected = `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
  return constantTimeEqual(signature, expected);
}

export async function GET(request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode") || "";
  const verifyToken = url.searchParams.get("hub.verify_token") || "";
  const challenge = url.searchParams.get("hub.challenge") || "";
  const expectedToken = String(process.env.WHATSAPP_VERIFY_TOKEN || "");

  if (!expectedToken) {
    return new Response("WhatsApp webhook verification is not configured.", {
      status: 503,
      headers: NO_STORE_HEADERS,
    });
  }

  if (mode === "subscribe" && challenge && constantTimeEqual(verifyToken, expectedToken)) {
    return new Response(challenge, {
      status: 200,
      headers: { ...NO_STORE_HEADERS, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response("WhatsApp webhook verification failed.", {
    status: 403,
    headers: NO_STORE_HEADERS,
  });
}

export async function POST(request) {
  const appSecret = String(process.env.WHATSAPP_APP_SECRET || "");
  if (!appSecret) {
    return Response.json(
      { ok: false, error: "WhatsApp webhook signature verification is not configured." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256") || "";
  if (!verifySignature(rawBody, signature, appSecret)) {
    return Response.json(
      { ok: false, error: "Invalid WhatsApp webhook signature." },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json(
      { ok: false, error: "Invalid WhatsApp webhook payload." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  if (payload?.object !== "whatsapp_business_account") {
    return Response.json(
      { ok: false, error: "Unsupported webhook object." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  // Acknowledge verified Cloud API events without logging phone numbers,
  // message bodies, media URLs or other customer content.
  return Response.json(
    { ok: true },
    { status: 200, headers: NO_STORE_HEADERS },
  );
}
