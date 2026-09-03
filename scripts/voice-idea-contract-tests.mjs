import assert from "node:assert/strict";
import fs from "node:fs";
import {
  VOICE_IDEA_POLICY,
  VOICE_LANGUAGE_CODES,
  normalizeVoiceLanguage,
  sanitizeVoiceIdea,
  voiceErrorMessage,
} from "../lib/voice/voice-idea-policy.js";

const voice = fs.readFileSync("app/components/SoolenVoiceAssistant.js", "utf8");
const overlays = fs.readFileSync("app/components/BuilderGlobalOverlays.js", "utf8");
const overlayPolicy = fs.readFileSync("lib/ui/global-overlay-policy.js", "utf8");
const layout = fs.readFileSync("app/layout.js", "utf8");

assert.equal(VOICE_IDEA_POLICY.maxTranscriptLength, 4000);
assert.equal(VOICE_IDEA_POLICY.maxListeningMs, 60000);
assert.equal(VOICE_IDEA_POLICY.stopOnPageHide, true);
assert.equal(VOICE_IDEA_POLICY.stopOnVisibilityHidden, true);
assert.ok(VOICE_LANGUAGE_CODES.length >= 17);
assert.equal(normalizeVoiceLanguage("zh-TW"), "zh-HK");
assert.equal(normalizeVoiceLanguage("ms-MY"), "ms-MY");
assert.equal(normalizeVoiceLanguage("unknown"), "en-US");
assert.equal(sanitizeVoiceIdea("  hello\u0000 world  "), "hello world");
assert.equal(sanitizeVoiceIdea("x".repeat(5000)).length, 4000);
assert.match(voiceErrorMessage("notallowed"), /Microphone permission/i);
assert.match(voiceErrorMessage("audio-capture"), /microphone/i);
assert.doesNotMatch(voiceErrorMessage("secret internal provider detail"), /secret|provider detail/i);

for (const pattern of [
  /window\.SpeechRecognition \|\| window\.webkitSpeechRecognition/,
  /isTouchAppleDevice\(\)/,
  /recognition\.continuous=!isTouchAppleDevice\(\)/,
  /async function ensureTouchAppleMicrophoneAccess\(\)/,
  /navigator\.mediaDevices\.getUserMedia\(\{ audio: true \}\)/,
  /for \(const track of stream\.getTracks\(\)\)/,
  /track\.stop\(\)/,
  /const micAccess=await ensureTouchAppleMicrophoneAccess\(\)/,
  /VOICE_IDEA_POLICY\.maxListeningMs/,
  /window\.setTimeout/,
  /pagehide/,
  /visibilitychange/,
  /stopRecognition\(\{abort:true\}\)/,
  /sanitizeVoiceIdea\(text\)/,
  /maxLength=\{VOICE_IDEA_POLICY\.maxTranscriptLength\}/,
  /sessionStorage\.setItem\("soolenAppIdea",value\)/,
  /CustomEvent\("soolen-app-idea"/,
  /source:"voice"/,
  /safe-area-inset-bottom/,
  /100svh/,
  /prefers-reduced-motion:reduce/,
  /Apple may show its normal system permission prompt/,
]) assert.match(voice, pattern);
assert.match(layout, /BuilderGlobalOverlays/);
assert.match(overlays, /SoolenVoiceAssistant/);
assert.match(overlays, /shouldHideBuilderGlobalOverlay\(pathname\)/);
assert.match(overlayPolicy, /"\/"/);
assert.match(overlayPolicy, /"\/mobile-readiness"/);

const lifecycle = voice.match(/useEffect\(\(\)=>\{[\s\S]*?\n  \},\[\]\);/)?.[0] || "";
assert.doesNotMatch(lifecycle, /getUserMedia|SpeechRecognition\(\)|\.start\(\)/, "Voice must never request microphone access or start recognition on mount/lifecycle events.");
assert.match(voice, /<button className=\{recording\?"sv-mic recording":"sv-mic"\} type="button" onClick=\{recording\?\(\)=>stopRecognition\(\):start\}/, "Microphone access must remain behind the explicit microphone button tap.");
assert.doesNotMatch(voice, /Your voice is private and secure/, "Voice UI must not overclaim browser/provider privacy guarantees.");

console.log("✓ Voice Idea has bounded transcript/language/error policies and never auto-starts microphone capture");
console.log("✓ Touch Apple devices prime microphone permission only after the explicit mic tap and immediately release the temporary stream");
console.log("✓ Recognition stops on timeout, pagehide, hidden-tab and unmount lifecycle boundaries");
console.log("✓ Voice transcript is bounded before sessionStorage and Builder event handoff");
console.log("✓ Mobile safe-area and reduced-motion behavior remain enforced while physical microphone success stays device-evidence gated");
