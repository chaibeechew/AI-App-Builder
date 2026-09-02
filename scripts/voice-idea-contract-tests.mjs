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
  /recognition\.continuous=!\/iPhone\|iPad\|iPod/,
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
]) assert.match(voice, pattern);
assert.match(layout, /BuilderGlobalOverlays/);
assert.match(overlays, /SoolenVoiceAssistant/);
assert.match(overlays, /shouldHideBuilderGlobalOverlay\(pathname\)/);
assert.match(overlayPolicy, /"\/"/);
assert.match(overlayPolicy, /"\/mobile-readiness"/);
assert.doesNotMatch(voice, /getUserMedia\([^)]*\)[\s\S]{0,100}start\(\)/, "Voice must not auto-start microphone capture.");
assert.doesNotMatch(voice, /Your voice is private and secure/, "Voice UI must not overclaim browser/provider privacy guarantees.");

console.log("✓ Voice Idea has bounded transcript/language/error policies and never auto-starts microphone capture");
console.log("✓ Recognition stops on timeout, pagehide, hidden-tab and unmount lifecycle boundaries");
console.log("✓ Voice transcript is bounded before sessionStorage and Builder event handoff");
console.log("✓ Voice mounts through the shared route gate so homepage/evidence routes avoid unnecessary listener setup");
console.log("✓ Mobile safe-area and reduced-motion behavior are enforced while real microphone behavior remains device-evidence gated");
