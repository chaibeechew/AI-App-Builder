export const HIGH_RISK_API_LIMITS = Object.freeze({
  imageAnalyzeBytes: 8_500_000,
  imageBase64Chars: 8_000_000,
  createAppBytes: 16 * 1024,
  createAppPromptChars: 8_000,
  refundBytes: 4 * 1024,
  refundReasonChars: 1_000,
  withdrawalBytes: 4 * 1024,
});

export class RequestBoundaryError extends Error {
  constructor(message, status = 400, code = "INVALID_REQUEST") {
    super(message);
    this.name = "RequestBoundaryError";
    this.status = status;
    this.code = code;
  }
}

export function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "").trim());
}

export function isVerifiedUser(user) {
  return Boolean(user?.confirmed_at || user?.email_confirmed_at || user?.phone_confirmed_at);
}

export function privateJson(payload, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function readBoundedJson(request, maxBytes) {
  if (!Number.isInteger(maxBytes) || maxBytes <= 0) {
    throw new RequestBoundaryError("Invalid request budget.", 500, "INVALID_BUDGET");
  }

  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (contentType && !contentType.includes("application/json")) {
    throw new RequestBoundaryError("JSON request body required.", 415, "UNSUPPORTED_MEDIA_TYPE");
  }

  const declaredLength = Number.parseInt(request.headers.get("content-length") || "", 10);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new RequestBoundaryError("Request body is too large.", 413, "REQUEST_TOO_LARGE");
  }

  if (!request.body) return {};

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      try { await reader.cancel(); } catch {}
      throw new RequestBoundaryError("Request body is too large.", 413, "REQUEST_TOO_LARGE");
    }
    chunks.push(Buffer.from(value));
  }

  if (total === 0) return {};

  try {
    return JSON.parse(Buffer.concat(chunks, total).toString("utf8"));
  } catch {
    throw new RequestBoundaryError("Invalid JSON request body.", 400, "INVALID_JSON");
  }
}

export function boundaryResponse(error, fallbackMessage = "Unable to process request.") {
  if (error instanceof RequestBoundaryError) {
    return privateJson({ success: false, error: error.message, code: error.code }, error.status);
  }
  return privateJson({ success: false, error: fallbackMessage }, 500);
}
