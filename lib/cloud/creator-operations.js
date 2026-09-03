import { createCreatorOperationsDataAdapter } from "../cloud-adapters/creator-operations-data.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHARE_TOKEN = /^[A-Za-z0-9_-]{32,64}$/;

function getAdapter() {
  return createCreatorOperationsDataAdapter();
}

function fail(code) {
  return Object.freeze({ ok: false, code });
}

export async function getCurrentCreatorPrincipal({ requireVerified = false } = {}) {
  const result = await getAdapter().currentPrincipal({ requireVerified });
  if (!result?.ok) return fail(result?.code || "AUTHENTICATION_REQUIRED");
  return Object.freeze({ ok: true, principal: result.principal });
}

export async function loadCreatorPreviewSource({ projectId, versionId = null }) {
  const id = String(projectId || "").trim();
  const requestedVersion = String(versionId || "").trim();
  if (!UUID.test(id)) return fail("PROJECT_NOT_FOUND");
  if (requestedVersion && !UUID.test(requestedVersion)) return fail("PROJECT_VERSION_NOT_FOUND");

  const result = await getAdapter().loadOwnedPreviewSource({ projectId: id, versionId: requestedVersion || null });
  if (!result?.ok) return fail(result?.code || "PROJECT_PREVIEW_UNAVAILABLE");
  return Object.freeze({ ok: true, project: result.project, version: result.version });
}

export async function createCreatorShare({ projectId, token }) {
  const id = String(projectId || "").trim();
  const safeToken = String(token || "").trim();
  if (!UUID.test(id)) return fail("PROJECT_NOT_FOUND");
  if (!SHARE_TOKEN.test(safeToken)) return fail("SHARE_TOKEN_INVALID");

  const result = await getAdapter().createOwnedShare({ projectId: id, token: safeToken });
  if (!result?.ok) return fail(result?.code || "SHARE_CREATE_FAILED");
  return Object.freeze({ ok: true, share: result.share, project: result.project });
}

export async function createCreatorDemo({ projectId, versionId, hours = 72 }) {
  const id = String(projectId || "").trim();
  const version = String(versionId || "").trim();
  if (!UUID.test(id) || !UUID.test(version)) return fail("PROJECT_VERSION_NOT_FOUND");
  const boundedHours = Math.min(168, Math.max(1, Number.isFinite(Number(hours)) ? Math.trunc(Number(hours)) : 72));

  const result = await getAdapter().createOwnedDemo({ projectId: id, versionId: version, hours: boundedHours });
  if (!result?.ok) return fail(result?.code || "DEMO_CREATE_FAILED");
  return Object.freeze({ ok: true, demo: result.demo });
}

export function publicCreatorOperationsCloudBoundary() {
  return Object.freeze({
    providerOpaqueRouteLayer: true,
    compatibilityAdapterBoundary: true,
    previewMigrated: true,
    securityPrincipalMigrated: true,
    shareMigrated: true,
    demoMigrated: true,
    providerAdaptersFullyMigrated: false,
  });
}
