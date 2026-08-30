const MAX_PARTS = 12;
const MAX_BASE64_CHARS = 18_000_000;
const TIMEOUT_MS = 45000;

function configured(value) {
  return typeof value === "string" && value.trim().length > 0;
}

async function fetchTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function safeReference(item) {
  if (!item || typeof item !== "object") return null;
  const mimeType = String(item.mimeType || "").trim().toLowerCase();
  const data = String(item.data || "").replace(/^data:[^;]+;base64,/, "").trim();
  const kind = String(item.kind || "reference").slice(0, 40);
  const name = String(item.name || "reference").slice(0, 160);
  if (!mimeType.startsWith("image/")) return null;
  if (!data || data.length > MAX_BASE64_CHARS) return null;
  return { mimeType, data, kind, name };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });

  const key = String(process.env.GEMINI_API_KEY || "").trim();
  if (!configured(key)) return res.status(503).json({ error: "Visual AI is not configured yet." });

  const references = (Array.isArray(req.body?.references) ? req.body.references : [])
    .map(safeReference)
    .filter(Boolean)
    .slice(0, MAX_PARTS);

  if (!references.length) return res.status(400).json({ error: "Please upload at least one supported photo, screenshot, sketch or video frame." });

  const model = String(process.env.GEMINI_VISION_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash").trim();
  const prompt = `You are the visual understanding engine for SoolenAI AI App Builder.

Analyze the customer's uploaded references as inspiration and requirements context for an ORIGINAL App + Website.
The references may include photos, screenshots, hand-drawn sketches, UI drafts, logos, products, rooms, places, or representative video frames.

Return a concise design brief in plain text with these sections:
1. What the customer appears to want
2. Useful layout / workflow ideas
3. Visual style signals (color, typography mood, spacing, imagery, motion)
4. Functional clues
5. Original redesign direction for App + Website

IMPORTANT COPYRIGHT / ORIGINALITY RULES:
- Do not tell the builder to copy a third-party interface, brand, text, image, source code, or distinctive layout.
- Extract abstract ideas, patterns and requirements only.
- Reimagine the result into a new composition suitable for the customer's own product.
- If a reference contains a recognizable brand, describe only generic design attributes without reproducing protected branding.
- For video frames, infer only what is visibly supported by the sampled frames; do not invent unseen scenes.

Keep the brief under 700 words.`;

  const parts = [{ text: prompt }];
  for (const reference of references) {
    parts.push({ text: `Reference: ${reference.name} (${reference.kind})` });
    parts.push({ inlineData: { mimeType: reference.mimeType, data: reference.data } });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
    const response = await fetchTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { temperature: 0.25, maxOutputTokens: 1400 }
      })
    });

    const raw = await response.text();
    if (!response.ok) {
      console.error("Reference analysis provider error:", response.status, raw.slice(0, 1200));
      return res.status(response.status === 429 ? 429 : 502).json({ error: "Visual AI could not analyze these references right now." });
    }

    let data;
    try { data = JSON.parse(raw); }
    catch { return res.status(502).json({ error: "Visual AI returned an invalid response." }); }

    const analysis = data?.candidates?.[0]?.content?.parts?.map((part) => part?.text || "").join("\n").trim();
    if (!analysis) return res.status(502).json({ error: "Visual AI returned an empty analysis." });

    return res.status(200).json({
      analysis,
      provider: "Gemini Vision",
      referencesAnalyzed: references.length,
      originalityRule: "reference-not-copy"
    });
  } catch (error) {
    console.error("Reference analysis error:", error);
    return res.status(500).json({ error: "Unable to analyze references right now." });
  }
}
