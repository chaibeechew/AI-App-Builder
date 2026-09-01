import { buildIdeaPlan } from "../../lib/ai/idea-planning-contract.js";

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^(um+|uh+|er+|啊+|嗯+|那个+)[,，。.!！\s]*/i, "")
    .trim()
    .slice(0,6000);
}

export function understandVoiceIdea(input, previousPlan=null) {
  const transcript=cleanText(input);
  const plan=buildIdeaPlan(transcript,{previousPlan});
  return {
    transcript,
    ...plan,
  };
}

export function mergeVoiceAnswers(understanding, answers = []) {
  const answerText=(Array.isArray(answers)?answers:[]).filter(Boolean).map(cleanText).join(" ").slice(0,3000);
  const combined=cleanText(`${understanding?.transcript || understanding?.normalizedIdea || ""} ${answerText}`);
  return understandVoiceIdea(combined,understanding||null);
}
