import { NextResponse } from "next/server";
import { createServerClient } from "../../../lib/supabase/server.js";
import { generateWithFallback } from "../../../engine/ai-provider.js";

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

    const prompt = history
      .map((item) => `${item.role === "user" ? "User" : "Soolen AI"}: ${item.content}`)
      .join("\n\n");
    const result = await generateWithFallback(prompt);

    return NextResponse.json({
      content: result?.result || "Soolen AI returned no content.",
      provider: result?.provider || "Soolen AI",
    });
  } catch (error) {
    console.error("CHAT_API_ERROR:", error);
    return NextResponse.json({ error: "Unable to process chat request." }, { status: 500 });
  }
}
