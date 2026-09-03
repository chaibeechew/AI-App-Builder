import { createProjectDataAdapter } from "../cloud-adapters/project-data.js";

const PROJECT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getAdapter() {
  return createProjectDataAdapter();
}

export async function listCurrentUserProjects() {
  const result = await getAdapter().listOwnedProjects();
  if (!result?.ok) return Object.freeze({ ok: false, code: result?.code || "PROJECT_LIST_UNAVAILABLE" });
  return Object.freeze({ ok: true, projects: Array.isArray(result.projects) ? result.projects : [] });
}

export async function getCurrentUserProject(projectId) {
  const id = String(projectId || "").trim();
  if (!PROJECT_ID_PATTERN.test(id)) return Object.freeze({ ok: false, code: "PROJECT_NOT_FOUND" });

  const result = await getAdapter().getOwnedProjectWithVersions({ projectId: id });
  if (!result?.ok) return Object.freeze({ ok: false, code: result?.code || "PROJECT_NOT_FOUND" });
  return Object.freeze({
    ok: true,
    project: result.project,
    versions: Array.isArray(result.versions) ? result.versions : [],
  });
}

export function publicProjectCloudBoundary() {
  return Object.freeze({
    providerOpaqueRouteLayer: true,
    compatibilityAdapterBoundary: true,
    projectListMigrated: true,
    projectDetailMigrated: true,
    providerAdaptersFullyMigrated: false,
  });
}
