import assert from "node:assert/strict";
import fs from "node:fs";

const chat = fs.readFileSync("app/api/chat/route.js", "utf8");

assert.match(chat, /const PLATFORM_OPERATOR_INSTRUCTION=`You are LANERIQ AI\./);
assert.match(chat, /LANERIQ AI is the only customer-facing platform/);
assert.match(chat, /managedBy: "LANERIQ AI"/);
assert.match(chat, /content: result\?\.result \|\| "LANERIQ AI returned no content\."/);
assert.match(chat, /item\.role === "user" \? "User" : "LANERIQ AI"/);

assert.doesNotMatch(chat, /SoolenAI|Soolen AI/);
assert.doesNotMatch(chat, /provider:\s*result\?\.provider/);
assert.doesNotMatch(chat, /GEMINI_API_KEY|OPENAI_API_KEY|ELEVENLABS_API_KEY/);

for (const marker of [
  "generateWithFallback(prompt)",
  "Authentication required.",
  'Cache-Control":"private, no-store"',
  'X-Content-Type-Options":"nosniff"',
  "User-facing platform stages are only Build, Verify, Deploy and Publish",
  "Infrastructure providers are replaceable implementation details and must stay opaque",
  "Never promise a live external delivery/deployment unless evidence exists",
]) assert.ok(chat.includes(marker), `Chat safety contract missing: ${marker}`);

console.log("✓ Chat API exposes only LANERIQ AI as the customer-facing identity");
console.log("✓ SoolenAI naming cannot flow through prompt identity, history labels, fallback content or managedBy metadata");
console.log("✓ Provider routing, auth, no-store and truth-boundary safeguards remain intact");
