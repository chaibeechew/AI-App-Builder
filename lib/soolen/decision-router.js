// Soolen Super Brain Decision Router
// Chooses the safest useful execution strategy; providers/models remain replaceable tools.

function score(candidate, ctx) {
  let s = Number(candidate.baseScore || 0);
  if (ctx.privateData && candidate.local) s += 50;
  if (ctx.deviceFirst && candidate.local) s += 30;
  if (ctx.zeroCloudGpuTarget && candidate.local) s += 20;
  if (candidate.available === false) s -= 1000;
  if (candidate.requiresNetwork && !ctx.permissions?.network) s -= 1000;
  if (candidate.requiresPrivateUpload && !ctx.permissions?.privateUpload) s -= 1000;
  s += Math.max(-20, Math.min(20, Number(candidate.historicalSuccess || 0) * 20));
  s -= Math.max(0, Number(candidate.costWeight || 0));
  return s;
}

export function routeDecision({ task, candidates = [], context = {} } = {}) {
  const ctx = { deviceFirst: true, zeroCloudGpuTarget: true, ...context };
  const ranked = candidates.map((candidate) => ({ ...candidate, decisionScore: score(candidate, ctx) })).sort((a,b) => b.decisionScore-a.decisionScore);
  const selected = ranked.find((x) => x.decisionScore > -900) || null;
  return { task, selected, ranked, reason: selected ? "highest-safe-compatible-score" : "no-authorized-compatible-executor" };
}

export function chooseSpecialist(taskType="app-build") {
  const common=["planner","security","critic","verification"];
  if(taskType.includes("media")||taskType.includes("video"))return [...common,"media","continuity","audio-captions","device"];
  return [...common,"coding","ui","database","testing","device"];
}
