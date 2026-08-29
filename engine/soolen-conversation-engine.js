import { generateWithFallback } from "./ai-provider.js";

const MAX_TURNS = 24;
const MAX_CHARS = 12000;

// Soolen AI uses public, general-purpose conversational AI patterns:
// intent detection, dialogue state/memory, entity & slot extraction,
// correction/contradiction handling, multilingual normalization,
// uncertainty estimation, progressive disclosure and structured output.
// This is an original Soolen implementation; it does not copy proprietary code/models.
const SYSTEM = `You are Soolen AI, a natural conversational assistant that helps non-technical people turn ideas into apps.
Understand what the person MEANS, not merely what the last sentence literally says.
Maintain the conversation state across turns. Treat the CURRENT UNDERSTANDING as editable memory: merge new information into it, replace old information when the user corrects it, and remove features explicitly rejected by the user.
Understand natural speech, filler words, repetitions, incomplete sentences, mixed languages, colloquial wording, and corrections such as "no", "I mean", "actually", "不要这个", "换成", "刚才那个".
Do not invent requirements. Do not ask technical questions unless essential to the user's goal.
Ask at most 1 important follow-up question at a time. Do not repeat a question already answered.
When the user's request is clear enough, explain your understanding briefly and set readyToBuild=true.
Respond in the user's language when possible; for mixed-language input, use the dominant language while preserving important product terms.
Return ONLY valid JSON:
{"reply":"natural response","intent":"string","audience":"string","appType":"string","features":["string"],"entities":[{"name":"string","value":"string"}],"constraints":["string"],"questions":["one question at most"],"normalizedIdea":"complete current app idea","confidence":0.0,"readyToBuild":false,"corrections":["changes made this turn"]}`;

function clean(value, max = 3000) { return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max); }
function arr(value, max = 12, itemMax = 300) { return Array.isArray(value) ? value.map(x => clean(x, itemMax)).filter(Boolean).slice(0, max) : []; }
function parseJson(text) {
  const raw = String(text || "").trim();
  try { return JSON.parse(raw); } catch {}
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  return null;
}

function detectCorrections(text) {
  const t = clean(text).toLowerCase();
  return /(actually|i mean|no,|not |instead|change|remove|don't want|不要|不是|不需要|换成|改成|取消|刚才那个)/i.test(t);
}

function heuristic(text) {
  const t = clean(text).toLowerCase();
  const features = [];
  const rules = [
    [/customer|client|lead|客户|顾客/, "customer / lead management"],
    [/property|real estate|listing|房产|房地产|房源|房子/, "property / listing management"],
    [/follow.?up|reminder|call|跟进|提醒|联系/, "follow-up / reminders"],
    [/booking|appointment|预约|预订/, "booking / appointments"],
    [/payment|invoice|billing|付款|支付|账单/, "payments / billing"],
    [/chat|message|聊天|讯息/, "messaging / chat"],
    [/report|analytics|报表|分析/, "reports / analytics"]
  ];
  for (const [re, label] of rules) if (re.test(t) && !features.includes(label)) features.push(label);
  return { features, confidence: features.length ? 0.68 : 0.42 };
}

function normalize(result, transcript, previous = null) {
  const h = heuristic(transcript);
  const previousFeatures = arr(previous?.features);
  const aiFeatures = arr(result?.features);
  const features = [...new Set([...previousFeatures, ...aiFeatures, ...h.features])].slice(0, 12);
  const confidence = Math.max(0, Math.min(1, Number(result?.confidence ?? h.confidence)));
  const questions = arr(result?.questions, 1, 500);
  const normalizedIdea = clean(result?.normalizedIdea || previous?.normalizedIdea || transcript, 3000);
  const ready = Boolean(result?.readyToBuild && normalizedIdea && confidence >= 0.7 && features.length > 0 && questions.length === 0);
  return {
    reply: clean(result?.reply || "I understand. Let me make sure I have the important part right.", 1200),
    intent: clean(result?.intent || previous?.intent, 300),
    audience: clean(result?.audience || previous?.audience, 300),
    appType: clean(result?.appType || previous?.appType, 300),
    features,
    entities: Array.isArray(result?.entities) ? result.entities.slice(0, 20) : (previous?.entities || []),
    constraints: arr(result?.constraints, 12),
    questions,
    normalizedIdea,
    confidence,
    readyToBuild: ready,
    corrections: arr(result?.corrections, 8, 400),
    changedThisTurn: detectCorrections(transcript)
  };
}

export async function converse({ message, history = [], currentUnderstanding = null }) {
  const userMessage = clean(message, MAX_CHARS);
  if (!userMessage) throw new Error("A message is required.");
  const safeHistory = Array.isArray(history)
    ? history.slice(-MAX_TURNS).map(m => ({ role: m?.role === "assistant" ? "assistant" : "user", content: clean(m?.content, 2500) })).filter(m => m.content)
    : [];
  const context = currentUnderstanding ? JSON.stringify(currentUnderstanding).slice(0, 6000) : "none";
  const prompt = `${SYSTEM}\n\nCURRENT UNDERSTANDING (memory):\n${context}\n\nRECENT CONVERSATION:\n${JSON.stringify(safeHistory)}\n\nLATEST USER MESSAGE:\n${userMessage}\n\nUpdate the complete understanding, not just the latest sentence. If the user corrects an earlier requirement, apply the correction to the complete state. JSON only.`;
  try {
    const { provider, result } = await generateWithFallback(prompt);
    const parsed = parseJson(result);
    if (!parsed) throw new Error("AI returned invalid JSON");
    return { ...normalize(parsed, userMessage, currentUnderstanding), provider };
  } catch (error) {
    const h = heuristic(userMessage);
    return normalize({
      reply: h.features.length ? "I understand the main direction. What is the one most important thing users should do in the app?" : "I heard you. Who is the app mainly for, and what should users be able to do?",
      features: [...(currentUnderstanding?.features || []), ...h.features],
      normalizedIdea: [currentUnderstanding?.normalizedIdea, userMessage].filter(Boolean).join(". "),
      confidence: h.confidence,
      questions: h.features.length ? ["What is the one most important thing users should do in the app?"] : ["Who is the app mainly for?"]
    }, userMessage, currentUnderstanding);
  }
}
