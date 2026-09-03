import { createClient as createProviderClient } from "../supabase/server.js";

const PROJECT_LIST_FIELDS = "id, name, description, source_prompt, current_version_id, created_at, updated_at";
const PROJECT_DETAIL_FIELDS = "id, name, description, source_prompt, current_version_id, published_version_id, visibility, publish_status, created_at, updated_at";
const VERSION_FIELDS = "id, version_no, specification, change_summary, created_at";

function fail(code) {
  return Object.freeze({ ok: false, code });
}

function success(payload = {}) {
  return Object.freeze({ ok: true, ...payload });
}

async function currentPrincipal(client) {
  try {
    const { data, error } = await client.auth.getUser();
    if (error || !data?.user?.id) return fail("AUTHENTICATION_REQUIRED");
    return success({ principalId: data.user.id });
  } catch {
    return fail("AUTHENTICATION_REQUIRED");
  }
}

export function createProjectDataAdapter({ createClient = createProviderClient } = {}) {
  return Object.freeze({
    id: "compatibility-project-data-v1",

    async listOwnedProjects() {
      const client = await createClient();
      const principal = await currentPrincipal(client);
      if (!principal.ok) return principal;

      const { data, error } = await client
        .from("apps")
        .select(PROJECT_LIST_FIELDS)
        .eq("owner_id", principal.principalId)
        .order("updated_at", { ascending: false });

      if (error) return fail("PROJECT_LIST_UNAVAILABLE");
      return success({ projects: Array.isArray(data) ? data : [] });
    },

    async getOwnedProjectWithVersions({ projectId }) {
      const client = await createClient();
      const principal = await currentPrincipal(client);
      if (!principal.ok) return principal;

      const { data: project, error: projectError } = await client
        .from("apps")
        .select(PROJECT_DETAIL_FIELDS)
        .eq("id", projectId)
        .eq("owner_id", principal.principalId)
        .single();

      if (projectError || !project) return fail("PROJECT_NOT_FOUND");

      const { data: versions, error: versionsError } = await client
        .from("app_versions")
        .select(VERSION_FIELDS)
        .eq("app_id", projectId)
        .order("version_no", { ascending: false });

      if (versionsError) return fail("PROJECT_VERSIONS_UNAVAILABLE");
      return success({ project, versions: Array.isArray(versions) ? versions : [] });
    },
  });
}
