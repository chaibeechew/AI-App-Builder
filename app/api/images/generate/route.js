import { NextResponse } from "next/server";

function getImageResult(data) {
  const item = Array.isArray(data?.output) ? data.output.find((x) => x?.type === "image_generation_call" && x?.result) : null;
  if (item?.result) return item.result;
  if (data?.data?.[0]?.b64_json) return data.data[0].b64_json;
  return null;
}

export async function POST(request) {
  try {
    const { prompt, size = "1024x1024", quality = "auto", background = "auto", output_format = "png" } = await request.json();
    const cleanPrompt = String(prompt || "").trim();
    if (!cleanPrompt) return NextResponse.json({ error: "Image prompt is required." }, { status: 400 });
    if (cleanPrompt.length > 4000) return NextResponse.json({ error: "Image prompt is too long." }, { status: 413 });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Image generation is not configured yet." }, { status: 503 });

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL || "gpt-5.6",
        input: cleanPrompt,
        tools: [{ type: "image_generation", size, quality, background, output_format }],
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return NextResponse.json({ error: "Image generation provider failed.", detail: data?.error?.message || `HTTP ${response.status}` }, { status: 502 });
    const image = getImageResult(data);
    if (!image) return NextResponse.json({ error: "The image provider returned no image." }, { status: 502 });
    return NextResponse.json({ success: true, image: `data:image/${output_format};base64,${image}`, model: process.env.OPENAI_IMAGE_MODEL || "gpt-5.6" });
  } catch (error) {
    console.error("SOOLEN_IMAGE_GENERATION_ERROR:", error);
    return NextResponse.json({ error: error?.message || "Unable to generate image." }, { status: 500 });
  }
}
