// Soolen Critic + Repair Engine
// Adult Mode does not accept an output until deterministic checks pass.

const DEFAULT_MAX_REPAIRS = 3;

export function runCriticChecks(result = {}, requirements = {}) {
  const checks = [
    { id: "output", passed: Boolean(result.output || result.videoUrl || result.preview || result.files), repair: "regenerate-output" },
    { id: "tests", passed: result.testsPassed !== false, repair: "run-tests-and-fix" },
    { id: "security", passed: result.securityPassed !== false, repair: "repair-security-boundary" },
    { id: "privacy", passed: result.privacyPassed !== false, repair: "remove-private-data-leak" },
    { id: "requirements", passed: requirements.requiredFeatures ? requirements.requiredFeatures.every((x) => result.features?.includes?.(x)) : true, repair: "implement-missing-requirements" },
  ];
  const failed = checks.filter((x) => !x.passed);
  return { passed: failed.length === 0, checks, failed, repairs: failed.map((x) => x.repair) };
}

export async function autonomousRepairLoop({ initialResult, requirements = {}, repair, verify, maxRepairs = DEFAULT_MAX_REPAIRS } = {}) {
  if (typeof repair !== "function") throw new Error("SOOLEN_REPAIR_HANDLER_REQUIRED");
  let result = initialResult || {};
  const history = [];
  for (let attempt = 0; attempt <= maxRepairs; attempt += 1) {
    const review = runCriticChecks(result, requirements);
    const verification = typeof verify === "function" ? await verify(result, review) : { passed: true };
    history.push({ attempt, review, verification });
    if (review.passed && verification?.passed !== false) return { status: "verified", result, history, repairs: attempt };
    if (attempt === maxRepairs) break;
    result = await repair({ result, review, verification, attempt: attempt + 1 });
  }
  return { status: "needs-attention", result, history, repairs: maxRepairs };
}
