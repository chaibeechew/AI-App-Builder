export const NON_PRODUCTION_SCORE_REQUIRED = 100;

export const NON_PRODUCTION_AREAS = Object.freeze([
  { key: "generation", label: "AI Generation", weight: 10 },
  { key: "editing", label: "No-code AI Editing", weight: 10 },
  { key: "data", label: "Customer Data", weight: 8 },
  { key: "automation", label: "Automations", weight: 8 },
  { key: "publishing", label: "Publishing Preparation", weight: 8 },
  { key: "security", label: "Security & Ownership", weight: 10 },
  { key: "reliability", label: "Runtime Reliability", weight: 10 },
  { key: "visual", label: "Premium Visual Quality", weight: 10 },
  { key: "wallpaper", label: "Wallpaper & Theme Experience", weight: 8 },
  { key: "imageStudio", label: "Image Studio", weight: 6 },
  { key: "versioning", label: "Version History & Recovery", weight: 5 },
  { key: "pro", label: "Professional Mode", weight: 4 },
  { key: "branding", label: "Product Branding", weight: 3 },
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
