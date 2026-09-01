export const VOICE_IDEA_POLICY = Object.freeze({
  maxTranscriptLength: 4000,
  maxListeningMs: 60000,
  interimResults: true,
  maxAlternatives: 3,
  stopOnPageHide: true,
  stopOnVisibilityHidden: true,
});

export const VOICE_LANGUAGE_CODES = Object.freeze([
  "zh-CN","zh-HK","en-US","ms-MY","id-ID","ta-MY","hi-IN","ja-JP","ko-KR","th-TH","vi-VN","ar-SA","es-ES","fr-FR","de-DE","pt-BR","ru-RU"
]);

export function normalizeVoiceLanguage(value) {
  const language = String(value || "").toLowerCase();
  if (language.startsWith("zh-hk") || language.startsWith("zh-tw") || language.startsWith("yue")) return "zh-HK";
  if (language.startsWith("zh")) return "zh-CN";
  const match = VOICE_LANGUAGE_CODES.find((code) => code.toLowerCase().startsWith(language.split("-")[0]));
  return match || "en-US";
}

export function sanitizeVoiceIdea(value) {
  return String(value || "").replace(/\u0000/g, "").trim().slice(0, VOICE_IDEA_POLICY.maxTranscriptLength);
}

export function voiceErrorMessage(error) {
  const message = String(error?.error || error?.message || error || "");
  if (/permission|notallowed|denied/i.test(message)) return "Microphone permission is unavailable. You can still type your idea below.";
  if (/no-speech/i.test(message)) return "No speech detected. Try again or type your idea below.";
  if (/audio-capture/i.test(message)) return "No microphone is available. You can still type your idea below.";
  if (/network/i.test(message)) return "Voice recognition could not connect. Your typed idea is still available.";
  return "Voice input is unavailable right now. You can still type your idea below.";
}
