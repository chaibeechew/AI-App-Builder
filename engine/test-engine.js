const DANGEROUS_PATTERNS = [
  /steal\s+(password|passwords|otp|token)/i,
  /capture\s+(password|passwords|otp)/i,
  /phishing/i,
  /credential\s+theft/i,
  /fake\s+(bank|government|login)/i,
  /bypass\s+(authentication|login|security)/i,
];

export function testApp(app) {
  const text = JSON.stringify(app || "");

  const issues = [];

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(text)) {
      issues.push(
        `Potentially unsafe pattern detected: ${pattern}`
      );
    }
  }

  return {
    passed: issues.length === 0,
    issues,
    checkedAt: new Date().toISOString(),
  };
}