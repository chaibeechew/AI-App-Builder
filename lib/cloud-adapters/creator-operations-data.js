import { createClient as createProviderClient } from "../supabase/server.js";

const PREVIEW_PROJECT_FIELDS = "id,name,description,current_version_id";
const PREVIEW_VERSION_FIELDS = "id,version_no,specification";

function fail(code) {
  return Object.freeze({ ok: false, code });
}

function success(payload = {}) {
  return Object.freeze({ ok: true, ...payload });
}

function normalizePrincipal(user) {
  return Object.freeze({
    principalId: user.id,
    verified: Boolean(user.confirmed_at || user.email_confirmed_at || user.phone_confirmed_at),
  });
}

async function resolvePrincipal(client, { requireVerified = false } = {}) {
  try {
    const { data, error } = await client.auth.getUser();
    if (error || !data?.user?.id) return fail("AUTHENTICATION_REQUIRED");
    const principal = normalizePrincipal(data.user);
    if (requireVerified && !principal.verified) return fail("ACCOUNT_VERIFICATION_REQUIRED");
    return success({ principal });
  } catch {
    return fail("AUTHENTICATION_REQUIRED");
  }
}

export function createCreatorOperationsDataAdapter({ createClient = createProviderClient } = {}) {
  return Object.freeze({
    id: "compatibility-creator-operations-data-v1",

    async currentPrincipal({ requireVerified = false } = {}) {
      const client = await createClient();
      return resolvePrincipal(client, { requireVerified });
    },

    async loadOwnedPreviewSource({ projectId, versionId = null }) {
      const client = await createClient();
      const principal = await resolvePrincipal(client);
      if (!principal.ok) return principal;

      const { data: project, error: projectError } = await client
        .from("apps")
        .select(PREVIEW_PROJECT_FIELDS)
        .eq("id", projectId)
        .eq("owner_id", principal.principal.principalId)
        .maybeSingle();
      if (projectError || !project) return fail("PROJECT_NOT_FOUND");

      const selectedVersionId = versionId || project.current_version_id;
      if (!selectedVersionId) return fail("PROJECT_VERSION_NOT_FOUND");
      const { data: version, error: versionError } = await client
        .from("app_versions")
        .select(PREVIEW_VERSION_FIELDS)
        .eq("id", selectedVersionId)
        .eq("app_id", project.id)
        .maybeSingle();
      if (versionError || !version) return fail("PROJECT_VERSION_NOT_FOUND");

      return success({ principal: principal.principal, project, version });
    },

    async createOwnedShare({ projectId, token }) {
      const client = await createClient();
      const principal = await resolvePrincipal(client, { requireVerified: true });
      if (!principal.ok) return principal;

      const { data: project, error: projectError } = await client
        .from("apps")
        .select("id,name,current_version_id")
        .eq("id", projectId)
        .eq("owner_id", principal.principal.principalId)
        .maybeSingle();
      if (projectError || !project?.current_version_id) return fail("PROJECT_VERSION_NOT_FOUND");

      const { data: share, error: shareError } = await client
        .from("app_shares")
        .insert({
          app_id: project.id,
          version_id: project.current_version_id,
          token,
          created_by: principal.principal.principalId,
        })
        .select("id,token,created_at")
        .single();
      if (shareError || !share) {
        console.error("CREATOR_SHARE_PROVIDER_ERROR:", shareError?.code || "WRITE_FAILED");
        return fail("SHARE_CREATE_FAILED");
      }

      return success({ principal: principal.principal, share, project });
    },

    async createOwnedDemo({ projectId, versionId, hours = 72 }) {
      const client = await createClient();
      const principal = await resolvePrincipal(client, { requireVerified: true });
      if (!principal.ok) return principal;

      const { data, error } = await client.rpc("create_app_demo", {
        p_app_id: projectId,
        p_version_id: versionId,
        p_hours: hours,
      });
      if (error) {
        console.error("CREATOR_DEMO_PROVIDER_ERROR:", error?.code || "RPC_FAILED");
        return fail("DEMO_CREATE_FAILED");
      }
      return success({ principal: principal.principal, demo: data });
    },
  });
}
