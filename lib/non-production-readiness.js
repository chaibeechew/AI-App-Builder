export const NON_PRODUCTION_SCORE_REQUIRED = 100;

export const NON_PRODUCTION_AREAS = Object.freeze([
  { key: "generation", label: "AI Generation", weight: 12 },
  { key: "editing", label: "No-code AI Editing", weight: 12 },
  { key: "data", label: "Database Builder", weight: 10 },
  { key: "automation", label: "Workflow Automation", weight: 10 },
  { key: "publishing", label: "Store Publishing Preparation", weight: 10 },
  { key: "security", label: "Security & Ownership", weight: 12 },
  { key: "reliability", label: "Runtime Reliability", weight: 12 },
  { key: "visual", label: "Premium Visual Quality", weight: 10 },
  { key: "versioning", label: "Version History & Recovery", weight: 6 },
  { key: "pro", label: "Professional Mode", weight: 6 },
]);

export function evaluateNonProductionReadiness(input = {}) {
  const rows = NON_PRODUCTION_AREAS.map((area) => {
    const raw = Number(input?.[area.key]);
    const score = Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : 0;
    return { ...area, score, passed: score === 100 };
  });
  const score = rows.reduce((sum, row) => sum + (row.score * row.weight) / 100, 0);
  const rounded = Math.round(score);
  const blockers = rows.filter((row) => !row.passed).map((row) => `${row.label}: ${row.score}/100`);
  return {
    score: rounded,
    required: NON_PRODUCTION_SCORE_REQUIRED,
    ready: rounded === NON_PRODUCTION_SCORE_REQUIRED && blockers.length === 0,
    rows,
    blockers,
    productionHeld: true,
    note: "This score covers product/code readiness only. Production promotion, live providers, payment execution, store submission and real-device evidence remain intentionally separate.",
  };
}
