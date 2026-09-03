import { createServerClient } from "../../../../lib/supabase/server.js";
import { converse } from "../../../../engine/soolen-conversation-engine.js";
import {
  HIGH_RISK_API_LIMITS,
  boundaryResponse,
  isVerifiedUser,
  privateJson,
  readBoundedJson,
} from "../../../../lib/security/high-risk-api-boundary.js";

function cleanText(value, max) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function sanitizeHistory(value) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-HIGH_RISK_API_LIMITS.voiceHistoryItems)
    .map((item) => ({
      role: item?.role === "assistant" ? "assistant" : "user",
      content: cleanText(item?.content, 2_500),
    }))
    .filter((item) => item.content);
}

function sanitizeStringArray(value, maxItems = 12, maxChars = 300) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => cleanText(item, maxChars)).filter(Boolean).slice(0, maxItems);
}

function sanitizeCurrentUnderstanding(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const clean = {
    normalizedIdea: cleanText(value.normalizedIdea, 3_000),
    intent: cleanText(value.intent, 300),
    audience: cleanText(value.audience, 300),
    appType: cleanText(value.appType, 300),
    language: cleanText(value.language, 40),
    features: sanitizeStringArray(value.features, 12, 300),
    constraints: sanitizeStringArray(value.constraints, 12, 300),
    questions: sanitizeStringArray(value.questions, 4, 500),
    corrections: sanitizeStringArray(value.corrections, 8, 400),
    confidence: Number.isFinite(Number(value.confidence)) ? Math.max(0, Math.min(1, Number(value.confidence))) : 0,
    readyToBuild: Boolean(value.readyToBuild),
  };
  return Object.values(clean).some((entry) => Array.isArray(entry) ? entry.length : Boolean(entry)) ? clean : null;
}

export async function POST(request) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return privateJson({ success: false, error: "Authentication required." }, 401);
    if (!isVerifiedUser(user)) return privateJson({ success: false, error: "Account verification is required." }, 403);

    const body = await readBoundedJson(request, HIGH_RISK_API_LIMITS.voiceUnderstandBytes);
    const transcript = cleanText(body?.transcript || body?.text, HIGH_RISK_API_LIMITS.voiceTranscriptChars);
    if (!transcript) return privateJson({ success: false, error: "Voice transcript is required." }, 400);

    const result = await converse({
      message: transcript,
      history: sanitizeHistory(body?.history),
      currentUnderstanding: sanitizeCurrentUnderstanding(body?.currentUnderstanding),
    });

    return privateJson(result);
  } catch (error) {
    console.error("VOICE_UNDERSTAND_ERROR:", error?.name || "Error");
    return boundaryResponse(error, "Unable to understand the request right now.");
  }
}
