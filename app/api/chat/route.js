import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server.js";
import { generateWithFallback } from "../../../engine/ai-provider.js";
import { planTier, resolveSoolenCapabilities } from "../../../lib/soolen/capability-registry.js";

const MAX_MESSAGE = 12000;
const MAX_HISTORY_MESSAGES = 20;
const MAX_HISTORY_ITEM = 4000;

async function resolveUserTier(supabase, userId) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("status,subscription_plans(code)")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return "free";
  const plan = Array.isArray(data?.subscription_plans) ? data.subscription_plans[0] : data?.subscription_plans;
  return planTier(plan?.code, data?.status);
}

function safeHistory(messages) {
  return (Array.isArray(messages) ? messages : [])
    .slice(-MAX_HISTORY_MESSAGES)
    .filter((message) => message && typeof message.content === "string")
    .map((message) => ({
      role: message.role === "user" ? "USER" : "SOOLEN",
      content: message.content.trim().slice(0, MAX_HISTORY_ITEM),
    }))
    .filter((message) => message.content);
}

function buildPrompt({ message, history, tier, availableCapabilities }) {
  const transcript = history.map((item) => `${item.role}: ${item.content}`).join("\n\n");
  return `You are Soolen AI, the permission-scoped assistant inside AI App Builder.
Respond in the user's language unless they ask for another language.
You can help think, write, translate, plan, design, code, and guide App + Customer Website creation.
Never claim that a file, website, message, purchase, deployment, search, image, audio or video was completed unless the relevant Soolen tool actually completed it.
Never claim to be ChatGPT or to contain copied proprietary models. Third-party models and paid services are used only when separately configured and authorized.
Subscription tier: ${tier}.
Capabilities ready for this session: ${availableCapabilities.join(", ") || "none"}.
If a requested capability is not ready, explain the exact missing integration briefly and offer the closest ready workflow.
Conversation:
${transcript ? `${transcript}\n\n` : ""}USER: ${message}
SOOLEN:`;
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const body = await request.json();
    const message = String(body?.message || "").trim();
    if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 });
    if (message.length > MAX_MESSAGE) return NextResponse.json({ error: "Message is too long." }, { status: 413 });

    const tier = await resolveUserTier(supabase, user.id);
    const resolved = resolveSoolenCapabilities({ tier });
    const advancedRequested = body?.mode === "advanced";
    if (advancedRequested && tier === "free") {
      return NextResponse.json({
        error: "Advanced multi-model reasoning requires an active paid plan.",
        code: "UPGRADE_REQUIRED",
        tier,
      }, { status: 402 });
    }
    if (!resolved.providers.text.length) {
      return NextResponse.json({
        error: "No authorized AI provider is configured for this capability tier.",
        code: "PROVIDER_SETUP_REQUIRED",
        tier,
      }, { status: 503 });
    }

    const availableCapabilities = resolved.capabilities.filter((item) => item.status === "ready").map((item) => item.name);
    const prompt = buildPrompt({
      message,
      history: safeHistory(body?.messages),
      tier,
      availableCapabilities,
    });
    const result = await generateWithFallback(prompt, { providers: resolved.providers.text });

    return NextResponse.json({
      content: String(result.result || "").trim(),
      provider: result.provider,
      attempts: result.attempts,
      tier,
      capabilityVersion: resolved.version,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("SOOLEN_CHAT_API_ERROR:", error);
    const message = String(error?.message || "");
    const setup = /No authorized AI provider/.test(message);
    return NextResponse.json({
      error: setup ? message : "Soolen AI could not complete this request right now.",
      code: setup ? "PROVIDER_SETUP_REQUIRED" : "AI_UNAVAILABLE",
    }, { status: setup ? 503 : 502 });
  }
}
