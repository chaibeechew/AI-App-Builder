import { generateWithFallback } from "./ai-provider.js";

const MAX_TURNS = 20;
const MAX_CHARS = 12000;

const SYSTEM = `You are Soolen AI, a conversational app-building requirements analyst.
Your job is to understand natural human speech, not force users to speak like programmers.
Use robust conversational techniques: intent detection, context/memory, slot filling, entity extraction, multilingual normalization, contradiction handling, uncertainty estimation, progressive disclosure, and concise follow-up questions.
Never invent requirements. Preserve user intent even when speech contains filler words, repetitions, mixed languages, corrections, or incomplete sentences.
Ask only the smallest number of questions needed to safely define an app. Do not ask technical questions unless they materially affect the user's goal.
Return ONLY valid JSON with this shape:
{"reply":"natural conversational response","intent":"string","audience":"string","appType":"string","features":["string"],"entities":[{"name":"string","value":"string"}],"constraints":["string"],"questions":["string"],"normalizedIdea":"string","confidence":0.0,"readyToBuild":false,"corrections":["string"]}`;

function clean(value, max = 3000) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function parseJson(text) {
  const raw = String(text || "").trim();
  try { return JSON.parse(raw); } catch {}
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  return null;
}

function heuristic(transcript) {
  const t = clean(transcript).toLowerCase();
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

function normalize(result, transcript) {
  const h = heuristic(transcript);
  const confidence = Math.max(0, Math.min(1, Number(result?.confidence ?? h.confidence)));
  const questions = Array.isArray(result?.questions) ? result.questions.map(q => clean(q, 500)).filter(Boolean).slice(0, 2) : [];
  const features = [...new Set([...(Array.isArray(result?.features) ? result.features : []), ...h.features].map(x => clean(x, 180)).filter(Boolean))].slice(0, 12);
  const ready = Boolean(result?.readyToBuild && clean(result?.normalizedIdea || transcript) && confidence >= 0.7 && features.length > 0 && questions.length === 0);
  return {
    reply: clean(result?.reply || "I understand the idea. Let me make sure I have the important parts right.", 1200),
    intent: clean(result?.intent, 300), audience: clean(result?.audience, 300), appType: clean(result?.appType, 300),
    features, entities: Array.isArray(result?.entities) ? result.entities.slice(0, 20) : [],
    constraints: Array.isArray(result?.constraints) ? result.constraints.map(x => clean(x, 300)).filter(Boolean).slice(0, 12) : [],
    questions, normalizedIdea: clean(result?.normalizedIdea || transcript, 3000), confidence,
    readyToBuild: ready,
    corrections: Array.isArray(result?.corrections) ? result.corrections.map(x => clean(x, 400)).filter(Boolean).slice(0, 8) : []
  };
}

export async function converse({ message, history = [], currentUnderstanding = null }) {
  const userMessage = clean(message, MAX_CHARS);
  if (!userMessage) throw new Error("A message is required.");
  const safeHistory = Array.isArray(history) ? history.slice(-MAX_TURNS).map(m => ({ role: m?.role === "assistant" ? "assistant" : "user", content: clean(m?.content, 2500) })).filter(m => m.content) : [];
  const context = currentUnderstanding ? JSON.stringify(currentUnderstanding).slice(0, 5000) : "none";
  const prompt = `${SYSTEM}\n\nCURRENT UNDERSTANDING:\n${context}\n\nCONVERSATION:\n${JSON.stringify(safeHistory)}\n\nLATEST USER MESSAGE:\n${userMessage}\n\nRespond in the user's language when possible. If the user corrected something, explicitly apply the correction and remove the old assumption. JSON only.`;
  try {
    const { provider, result } = await generateWithFallback(prompt);
    const parsed = parseJson(result);
    if (!parsed) throw new Error("AI returned invalid JSON");
    return { ...normalize(parsed, userMessage), provider };
  } catch (error) {
    const h = heuristic(userMessage);
    return normalize({
      reply: h.features.length ? "I understand the main direction. Tell me the most important thing users should be able to do." : "I heard you. Tell me what you want people to be able to do with the app.",
      features: h.features,
      normalizedIdea: userMessage,
      confidence: h.confidence,
      questions: h.features.length ? ["What is the single most important action users should take in the app?"] : ["Who is this app mainly for?", "What should users be able to do?"]
    }, userMessage);
  }
}
