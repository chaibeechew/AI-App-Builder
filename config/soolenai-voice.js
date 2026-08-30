export const SOOLENAI_VOICE = Object.freeze({
  name: "SoolenAI",
  gender: "female",
  source: "approved_mother_voice_sample",
  sample: {
    fileName: "SoolenAI_Voice_Sample_12sec.wav",
    startSeconds: 7.5,
    endSeconds: 19.5,
    durationSeconds: 12,
    consentConfirmed: true,
    tvAudioExcluded: true,
    publicRepoExcluded: true,
  },
  providerEnv: "SOOLENAI_VOICE_PROVIDER",
  defaultProvider: "open_source",
  openSourceEndpointEnv: "SOOLENAI_TTS_URL",
  openSourceSampleUrlEnv: "SOOLENAI_VOICE_SAMPLE_URL",
  openSourceTokenEnv: "SOOLENAI_TTS_TOKEN",
  paidProvider: "elevenlabs",
  paidProviderApiKeyEnv: "ELEVENLABS_API_KEY",
  model: "chatterbox_multilingual_voice_clone",
  languages: ["zh","zh-CN","zh-HK","zh-TW","en","en-US","ms","ms-MY","id","id-ID","ta","ta-MY","hi","hi-IN","ja","ja-JP","ko","ko-KR","th","th-TH","vi","vi-VN","ar","ar-SA","es","es-ES","fr","fr-FR","de","de-DE","pt","pt-BR","ru","ru-RU"],
  voiceIdEnv: "SOOLENAI_VOICE_ID",
});

export function getSoolenAIVoiceProvider() {
  return (process.env[SOOLENAI_VOICE.providerEnv] || SOOLENAI_VOICE.defaultProvider).toLowerCase();
}

export function getSoolenAIVoiceId() {
  const voiceId = process.env[SOOLENAI_VOICE.voiceIdEnv];
  if (!voiceId) throw new Error("SOOLENAI_VOICE_ID is not configured.");
  return voiceId;
}
