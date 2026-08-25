export function securityScan(prompt) {
  const text = String(prompt || "").toLowerCase();

  const blockedPatterns = [
    "phishing",
    "credential theft",
    "steal password",
    "steal passwords",
    "fake login",
    "fake banking",
    "otp theft",
    "password harvesting",
    "impersonate",
    "fraud",
    "scam app",
    "诈骗",
    "钓鱼",
    "盗取密码",
    "盗取验证码",
  ];

  const matched = blockedPatterns.filter(
    (pattern) => text.includes(pattern)
  );

  return {
    safe: matched.length === 0,
    matched,
    riskLevel:
      matched.length > 0 ? "high" : "low",
  };
}
