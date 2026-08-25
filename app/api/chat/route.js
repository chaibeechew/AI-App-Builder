import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();

    const message = body?.message || "";
    const messages = Array.isArray(body?.messages)
      ? body.messages
      : [];

    if (!message.trim()) {
      return NextResponse.json(
        {
          error: "Message is required.",
        },
        { status: 400 }
      );
    }

    const history = messages
      .filter((m) => m && typeof m.content === "string")
      .map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      }));

    history.push({
      role: "user",
      content: message,
    });

    const ollamaBaseUrl =
      process.env.OLLAMA_BASE_URL || "http://localhost:11434";

    const model =
      process.env.OLLAMA_MODEL || "llama3.2:3b";

    const response = await fetch(
      `${ollamaBaseUrl}/api/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: history,
          stream: false,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      return NextResponse.json(
        {
          error: `Ollama returned HTTP ${response.status}.`,
          details: errorText,
        },
        { status: 502 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      content:
        data?.message?.content ||
        "Ollama returned no content.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to connect to Ollama.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}