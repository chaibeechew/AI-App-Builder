export function createMobileDemoSession({ appId, versionId, expiresInHours = 72 }) {
  if (!appId || !versionId) throw new Error("appId and versionId are required");
  const safeHours = Math.min(Math.max(Number(expiresInHours) || 72, 1), 168);
  return {
    appId,
    versionId,
    mode: "customer_demo",
    expiresInHours: safeHours,
    capabilities: { preview: true, testData: true, storePublish: false, payments: false },
    status: "ready",
  };
}

export function demoToStoreGate(session, customerApproved) {
  if (!session || session.mode !== "customer_demo") return { allowed: false, reason: "Invalid demo session" };
  if (!customerApproved) return { allowed: false, reason: "Customer approval required before store publishing" };
  return { allowed: true, next: "store_publish_review" };
}
