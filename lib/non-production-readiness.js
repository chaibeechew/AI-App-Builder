export const NON_PRODUCTION_SCORE_REQUIRED = 100;

export const NON_PRODUCTION_AREAS = Object.freeze([
  { key: "generation", label: "AI Generation", weight: 10 },
  { key: "editing", label: "No-code AI Editing", weight: 9 },
  { key: "data", label: "Customer Data", weight: 7 },
  { key: "automation", label: "Automations", weight: 7 },
  { key: "publishing", label: "Publishing Preparation", weight: 7 },
  { key: "auth", label: "Authentication", weight: 7 },
  { key: "security", label: "Security & Ownership", weight: 9 },
  { key: "reliability", label: "Runtime Reliability", weight: 9 },
  { key: "visual", label: "Premium Visual Quality", weight: 8 },
  { key: "wallpaper", label: "Wallpaper & Theme Experience", weight: 6 },
  { key: "imageStudio", label: "Image Studio", weight: 5 },
  { key: "videoStudio", label: "Video Studio", weight: 5 },
  { key: "mobileUx", label: "Mobile UX", weight: 5 },
  { key: "versioning", label: "Version History & Recovery", weight: 4 },
  { key: "pro", label: "Professional Mode", weight: 3 },
  { key: "branding", label: "Product Branding", weight: 2 },
]);

export function evaluateNonProductionReadiness(input = {}) {
  const rows = NON_PRODUCTION_AREAS.map((area) => {
    const raw = Number(input?.[area.key]);
    const score = Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : 0;
    return { ...area, score, passed: score === 100 };
  });
  const totalWeight = rows.reduce((sum,row)=>sum+row.weight,0) || 1;
  const weighted = rows.reduce((sum,row)=>sum+row.score*row.weight,0)/totalWeight;
  const rounded = Math.round(weighted);
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
