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
  // Open-source/self-hosted is the default. Paid providers remain optional.
  providerEnv: "SOOLENAI_VOICE_PROVIDER",
  defaultProvider: "open_source",
  openSourceEndpointEnv: "SOOLENAI_TTS_URL",
  paidProvider: "elevenlabs",
  paidProviderApiKeyEnv: "ELEVENLABS_API_KEY",
  model: "multilingual_voice_clone",
  languages: ["zh", "en", "ja", "fr", "ms", "es", "de"],
  voiceIdEnv: "SOOLENAI_VOICE_ID",
});

export function getSoolenAIVoiceProvider() {
  return (process.env[SOOLENAI_VOICE.providerEnv] || SOOLENAI_VOICE.defaultProvider).toLowerCase();
}

export function getSoolenAIVoiceId() {
  const voiceId = process.env[SOOLENAI_VOICE.voiceIdEnv];
  if (!voiceId) {
    throw new Error("SOOLENAI_VOICE_ID is not configured.");
  }
  return voiceId;
}
