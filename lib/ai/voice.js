export async function transcribeVoice({ audioBase64, mimeType = "audio/webm" } = {}) {
  if (!audioBase64) throw new Error("Voice audio is required");
  // Provider adapter boundary. Keep provider secrets server-side and swap providers without changing app data models.
  const provider = process.env.SPEECH_PROVIDER || "openai";
  if (provider === "none") throw new Error("Speech provider is disabled");
  return { status: "provider_required", provider, mimeType, transcript: null, message: "Connect the configured speech provider on the server." };
}
