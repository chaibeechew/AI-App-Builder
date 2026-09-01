export const MOBILE_QUALITY_POLICY = Object.freeze({
  minimumTouchTargetPx: 44,
  minimumInputFontPx: 16,
  supportedViewportMinPx: 320,
  preferredViewportMaxPx: 430,
  safeAreaRequired: true,
  preventHorizontalOverflow: true,
  reducedMotionRequired: true,
  focusVisibleRequired: true,
});

export const MOBILE_PERFORMANCE_BUDGET = Object.freeze({
  targetLcpMs: 2500,
  targetInpMs: 200,
  targetCls: 0.1,
  interactionAnimationMaxMs: 300,
  maxHeroPreloads: 1,
  realDeviceEvidenceRequired: true,
});

export function evaluateMobileCodeEvidence(evidence = {}) {
  const checks = {
    safeArea: evidence.safeArea === true,
    touchTargets: Number(evidence.minimumTouchTargetPx) >= MOBILE_QUALITY_POLICY.minimumTouchTargetPx,
    inputZoomProtection: Number(evidence.minimumInputFontPx) >= MOBILE_QUALITY_POLICY.minimumInputFontPx,
    overflowGuard: evidence.preventHorizontalOverflow === true,
    reducedMotion: evidence.reducedMotion === true,
    focusVisible: evidence.focusVisible === true,
    responsiveMedia: evidence.responsiveMedia === true,
    singleHeroPreload: Number(evidence.heroPreloads) <= MOBILE_PERFORMANCE_BUDGET.maxHeroPreloads,
  };
  const passed = Object.values(checks).every(Boolean);
  return Object.freeze({ score: passed ? 100 : Math.round(Object.values(checks).filter(Boolean).length / Object.keys(checks).length * 100), passed, checks, realDeviceVerified: false });
}
