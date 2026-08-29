const QUESTION_LIMIT = 3;

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^(um+|uh+|er+|啊+|嗯+|那个+)[,，。.!！\s]*/i, "")
    .trim();
}

function inferFeatures(text) {
  const lower = text.toLowerCase();
  const features = [];
  const rules = [
    [/crm|客户|customer|client|lead/, "Customer / lead management"],
    [/property|房产|房地产|房子|listing|房源/, "Property / listing management"],
    [/follow.?up|跟进|联系|call|reminder|提醒/, "Follow-up and reminders"],
    [/payment|付款|支付|invoice|账单/, "Payments / billing"],
    [/booking|预约|预订|appointment/, "Booking / appointments"],
    [/chat|聊天|message|讯息/, "Messaging / chat"],
    [/report|报表|分析|analytics/, "Reports / analytics"],
    [/member|会员|user account|用户/, "User accounts / membership"],
  ];
  for (const [pattern, feature] of rules) if (pattern.test(lower) && !features.includes(feature)) features.push(feature);
  return features;
}

function inferAudience(text) {
  const lower = text.toLowerCase();
  if (/real estate|property agent|房地产|地产代理|房产中介/.test(lower)) return "Real estate professionals";
  if (/restaurant|cafe|餐厅|咖啡店/.test(lower)) return "Restaurant / food business";
  if (/school|student|teacher|学校|学生|老师/.test(lower)) return "Education users";
  if (/customer|client|客户/.test(lower)) return "Customer-facing business users";
  return "General users";
}

export function understandVoiceIdea(input) {
  const transcript = cleanText(input);
  const features = inferFeatures(transcript);
  const audience = inferAudience(transcript);
  const questions = [];

  if (!transcript) questions.push("What would you like your app to help people do?");
  if (!features.length && transcript) questions.push("What are the 2–3 most important things you want users to do in the app?");
  if (!/for|给|让|用户|customer|client|agent|business|学生|会员/i.test(transcript)) questions.push("Who is this app mainly for?");
  if (features.length < 2 && transcript) questions.push("What information should the app remember or manage?");

  return {
    transcript,
    normalizedIdea: transcript,
    audience,
    features,
    questions: questions.slice(0, QUESTION_LIMIT),
    confidence: transcript ? (features.length ? "medium-high" : "medium") : "low",
    readyToBuild: Boolean(transcript && features.length >= 1),
  };
}

export function mergeVoiceAnswers(understanding, answers = []) {
  const answerText = answers.filter(Boolean).map(cleanText).join(" ");
  return understandVoiceIdea(`${understanding?.transcript || ""} ${answerText}`.trim());
}
