import crypto from "node:crypto";

export const LANERIQ_VERCEL_TEAM_SLUG = "bryanbtxz-7929s-projects";
export const LANERIQ_VERCEL_OWNER_ID = "team_r2xREQWKQzVw1bdswbpW5j8Y";
export const LANERIQ_MAIN_PROJECT_ID = "prj_Q6mR7lmYGGKCW0ARu2Fgm9Pyzfcl";
export const LANERIQ_MAIN_PROJECT_NAME = "laneriq-ai";

const TEAM_ISSUER = `https://oidc.vercel.com/${LANERIQ_VERCEL_TEAM_SLUG}`;
const GLOBAL_ISSUER = "https://oidc.vercel.com";
const AUDIENCE = `https://vercel.com/${LANERIQ_VERCEL_TEAM_SLUG}`;
const CACHE_MS = 5 * 60 * 1000;
const MAX_TOKEN_LENGTH = 16_384;
const jwksCache = new Map();

function headerValue(request, name) {
  const headers = request?.headers;
  if (headers?.get) return String(headers.get(name) || "").trim();
  return String(headers?.[name] || headers?.[name.toLowerCase()] || headers?.[name.toUpperCase()] || "").trim();
}

function bearerToken(request) {
  const authorization = headerValue(request, "authorization");
  if (!authorization.startsWith("Bearer ")) return "";
  const token = authorization.slice(7).trim();
  return token.length >= 100 && token.length <= MAX_TOKEN_LENGTH ? token : "";
}

function decodeJson(segment) {
  if (!/^[A-Za-z0-9_-]+$/.test(segment) || segment.length > MAX_TOKEN_LENGTH) throw new Error("INVALID_JWT_SEGMENT");
  return JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
}

function acceptedIssuer(issuer) {
  return issuer === TEAM_ISSUER || issuer === GLOBAL_ISSUER;
}

function jwksUrl(issuer) {
  if (issuer === TEAM_ISSUER) return `${TEAM_ISSUER}/.well-known/jwks`;
  if (issuer === GLOBAL_ISSUER) return `${GLOBAL_ISSUER}/.well-known/jwks`;
  return null;
}

async function loadKeys(issuer, forceRefresh = false) {
  const now = Date.now();
  const cached = jwksCache.get(issuer);
  if (!forceRefresh && cached?.expiresAt > now && Array.isArray(cached.keys)) return cached.keys;
  const url = jwksUrl(issuer);
  if (!url) throw new Error("INVALID_ISSUER");
  const response = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json" },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("JWKS_UNAVAILABLE");
  const document = await response.json();
  const keys = Array.isArray(document?.keys)
    ? document.keys.filter((key) => key?.kty === "RSA" && typeof key?.kid === "string" && key.kid.length <= 256).slice(0, 32)
    : [];
  if (!keys.length) throw new Error("JWKS_EMPTY");
  jwksCache.set(issuer, { expiresAt: now + CACHE_MS, keys });
  return keys;
}

function audienceMatches(aud) {
  if (typeof aud === "string") return aud === AUDIENCE;
  return Array.isArray(aud) && aud.includes(AUDIENCE);
}

function claimsMatch(payload, { projectId, projectName, environment = "production" }) {
  const now = Math.floor(Date.now() / 1000);
  const subject = `owner:${LANERIQ_VERCEL_TEAM_SLUG}:project:${projectName}:environment:${environment}`;
  if (!acceptedIssuer(payload?.iss)) return false;
  if (!audienceMatches(payload?.aud)) return false;
  if (payload?.sub !== subject) return false;
  if (payload?.owner_id !== LANERIQ_VERCEL_OWNER_ID) return false;
  if (payload?.project_id !== projectId) return false;
  if (payload?.project !== projectName) return false;
  if (payload?.environment !== environment) return false;
  if (!Number.isFinite(payload?.exp) || payload.exp < now - 30) return false;
  if (!Number.isFinite(payload?.iat) || payload.iat > now + 60 || now - payload.iat > 7200) return false;
  if (payload?.nbf != null && (!Number.isFinite(payload.nbf) || payload.nbf > now + 60)) return false;
  return true;
}

export async function verifyVercelPeerRequest(request, expected) {
  const token = bearerToken(request);
  if (!token) return Object.freeze({ ok: false, status: 401, error: "OIDC_REQUIRED" });
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return Object.freeze({ ok: false, status: 401, error: "INVALID_OIDC_TOKEN" });
    const header = decodeJson(parts[0]);
    const payload = decodeJson(parts[1]);
    if (header?.alg !== "RS256" || typeof header?.kid !== "string" || !header.kid || header.kid.length > 256) {
      return Object.freeze({ ok: false, status: 401, error: "INVALID_OIDC_TOKEN" });
    }
    if (!acceptedIssuer(payload?.iss)) return Object.freeze({ ok: false, status: 401, error: "INVALID_OIDC_TOKEN" });

    let keys = await loadKeys(payload.iss, false);
    let jwk = keys.find((key) => key.kid === header.kid && (!key.alg || key.alg === "RS256") && (!key.use || key.use === "sig"));
    if (!jwk) {
      keys = await loadKeys(payload.iss, true);
      jwk = keys.find((key) => key.kid === header.kid && (!key.alg || key.alg === "RS256") && (!key.use || key.use === "sig"));
    }
    if (!jwk) return Object.freeze({ ok: false, status: 401, error: "INVALID_OIDC_TOKEN" });

    const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
    const signature = Buffer.from(parts[2], "base64url");
    const verified = signature.length > 0 && crypto.verify("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`, "utf8"), publicKey, signature);
    if (!verified || !claimsMatch(payload, expected)) return Object.freeze({ ok: false, status: 401, error: "INVALID_OIDC_TOKEN" });

    return Object.freeze({
      ok: true,
      status: 200,
      identity: Object.freeze({
        ownerId: payload.owner_id,
        projectId: payload.project_id,
        project: payload.project,
        environment: payload.environment,
        subject: payload.sub,
        issuer: payload.iss,
      }),
    });
  } catch {
    return Object.freeze({ ok: false, status: 401, error: "INVALID_OIDC_TOKEN" });
  }
}

export async function verifyLaneriqMainProductionPeer(request) {
  return verifyVercelPeerRequest(request, {
    projectId: LANERIQ_MAIN_PROJECT_ID,
    projectName: LANERIQ_MAIN_PROJECT_NAME,
    environment: "production",
  });
}
