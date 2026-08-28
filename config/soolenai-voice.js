export const SOOLENAI_VOICE = Object.freeze({
  name: "SoolenAI",
  gender: "female",
  source: "approved_mother_voice_sample",
  sample: {
    fileName: "SoolenAI_Voice_Sample_7.5-13.5.wav",
    startSeconds: 7.5,
    endSeconds: 13.5,
    durationSeconds: 6,
    consentConfirmed: true,
    tvAudioExcluded: true,
  },
  provider: "elevenlabs",
  model: "eleven_multilingual_v2",
  languages: [
    "zh",
    "en",
    "ja",
    "fr",
    "ms",
    "es",
    "de",
  ],
  voiceIdEnv: "SOOLENAI_VOICE_ID",
});

export function getSoolenAIVoiceId() {
  const voiceId = process.env.SOLOENAI_VOICE_ID;
  if (!voiceId) {
    throw new Error("SOOLENAI_VOICE_ID is not configured.");
  }
  return voiceId;
}
