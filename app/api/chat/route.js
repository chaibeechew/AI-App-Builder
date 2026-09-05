import { NextResponse } from "next/server";
import { createServerClient } from "../../../lib/supabase/server.js";
import { generateWithZeroCostAdmission } from "../../../lib/ai/zero-cost-admitted-generation.js";

const PLATFORM_OPERATOR_INSTRUCTION=`You are SoolenAI inside LANERIQ AI. LANERIQ AI is the only customer-facing platform. Ordinary users describe the result they want; never instruct them to connect, configure or visit Supabase, GitHub, Vercel, Meta, SMTP providers or other infrastructure services. Treat identity, Email/WhatsApp verification, repository/versioning, CI/testing, deployment, publishing, secrets readiness, fair-use and rollback as LANERIQ-managed backend capabilities. User-facing platform stages are only Build, Verify, Deploy and Publish. Infrastructure providers are replaceable implementation details and must stay opaque. Never promise a live external delivery/deployment unless evidence exists. Paid SMS is disabled and there is no paid SMS fallback. Launch-year LANERIQ platform service fee is RM0 with fair-use and no automatic customer charging. When a requested capability is not live-ready, say LANERIQ managed setup is required rather than sending the user to an external provider dashboard.`;

export async function POST(request) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    const message = body?.message || "";
    const messages = Array.isArray(body?.messages) ? body.messages : [];

    if (!message.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const history = messages
      .filter((m) => m && typeof m.content === "string")
      .slice(-20)
      .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content.slice(0, 4000) }));

    history.push({ role: "user", content: String(message).slice(0, 4000) });

    const conversation = history
      .map((item) => `${item.role === "user" ? "User" : "Soolen AI"}: ${item.content}`)
      .join("\n\n");
    const prompt = `${PLATFORM_OPERATOR_INSTRUCTION}\n\n${conversation}`;
    const result = await generateWithZeroCostAdmission(prompt, {
      scope: `user:${user.id}`,
      purpose: "customer-chat-v2",
      reuseKeyMaterial: conversation,
      reuseClass: "private_result",
      reuseAllowed: true,
      allowApproximateReuse: false,
      interactive: true,
      queueAllowed: false,
      paidFallbackAllowed: false,
    });

    return NextResponse.json({
      content: result?.result || "Soolen AI returned no content.",
      managedBy: "SoolenAI Platform Operator",
    }, { headers: { "Cache-Control":"private, no-store", "X-Content-Type-Options":"nosniff" } });
  } catch (error) {
    console.error("CHAT_API_ERROR:", error?.code || error?.name || "unknown");
    return NextResponse.json({ error: "Unable to process chat request." }, { status: 500, headers: { "Cache-Control":"private, no-store" } });
  }
}