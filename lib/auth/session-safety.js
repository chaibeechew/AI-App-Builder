const INTERNAL_BASE = "https://laneriq.invalid";
const MAX_NEXT_LENGTH = 2048;

export const PRIVATE_SESSION_STORAGE_KEYS = Object.freeze([
  "soolenAppIdea",
  "soolenReferenceAnalysis",
  "soolenPendingAssetIds",
  "soolenPendingAssetMeta",
  "aiAppBuilderPendingIdea",
  "soolenInspirationTemplate",
  "soolenAnalyticsSession",
]);

export function safeInternalNext(value, fallback = "/") {
  const raw = String(value || "").trim();
  if (!raw || raw.length > MAX_NEXT_LENGTH) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (raw.includes("\\") || /[\u0000-\u001f\u007f]/.test(raw)) return fallback;

  let parsed;
  try {
    parsed = new URL(raw, INTERNAL_BASE);
  } catch {
    return fallback;
  }

  if (parsed.origin !== INTERNAL_BASE) return fallback;
  if (parsed.username || parsed.password) return fallback;
  if (parsed.pathname === "/auth" || parsed.pathname.startsWith("/auth/")) return fallback;

  return `${parsed.pathname}${parsed.search}${parsed.hash}` || fallback;
}

export function normalizeReferralCode(value) {
  const code = String(value || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{1,32}$/.test(code)) return "";
  return code;
}

export function clearPrivateSessionStorage(storage) {
  if (!storage || typeof storage.removeItem !== "function") return;
  for (const key of PRIVATE_SESSION_STORAGE_KEYS) {
    try { storage.removeItem(key); } catch {}
  }
}

export function protectedReturnPath(pathname, search = "") {
  const rawPath = String(pathname || "/");
  const rawSearch = String(search || "");
  return safeInternalNext(`${rawPath}${rawSearch}`);
}

export function isPublicAccountPath(pathname) {
  const path = String(pathname || "/");
  return (
    path === "/" ||
    path === "/landing" || path.startsWith("/landing/") ||
    path === "/auth" || path.startsWith("/auth/") ||
    path === "/templates" || path.startsWith("/templates/") ||
    path === "/api/templates" ||
    path === "/favicon.ico" ||
    path.startsWith("/_next/") ||
    path === "/api/auth" || path.startsWith("/api/auth/")
  );
}

export const SESSION_SAFETY_LIMITS = Object.freeze({ MAX_NEXT_LENGTH });
