import { createClient as createProviderClient } from "../supabase/server.js";
import { createAdminClient as createProviderAdminClient } from "../supabase/admin.js";

const BRAND_FIELDS = "company_name,logo_url,primary_color,secondary_color,accent_color,font_style,brand_voice";
const APP_REPLAY_FIELDS = "id,name,description,created_at,updated_at,current_version_id,visibility,publish_status";
const VERSION_REPLAY_FIELDS = "id,version_no,specification,created_at";

function fail(code, detail = null) {
  return Object.freeze({ ok: false, code, detail });
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

function emptyBuilderAccess() {
  return {
    standard: { projectCredits: 0 },
    professional: {
      active: false,
      validFrom: null,
      validUntil: null,
      daysRemaining: 0,
      gameAccessPlan: "professional",
      gameCooldownLevel: 0,
      gameCooldownUntil: null,
      gameCooldownActive: false,
    },
    creatorOpportunity: {
      active: false,
      bonusSharePercent: 0,
      approvedAt: null,
      approvedBy: null,
      individualOnly: true,
    },
  };
}

function normalizeBuilderAccess(data) {
  if (!data) return emptyBuilderAccess();
  const now = Date.now();
  const untilMs = data.pro_valid_until ? new Date(data.pro_valid_until).getTime() : NaN;
  const cooldownUntilMs = data.game_cooldown_until ? new Date(data.game_cooldown_until).getTime() : NaN;
  const active = Number.isFinite(untilMs) && untilMs > now;
  const creatorOpportunityActive = data.creator_opportunity_active === true;
  const gameAccessPlan = creatorOpportunityActive || data.game_access_plan === "full" ? "full" : "professional";
  return {
    standard: { projectCredits: Math.max(0, Number(data.standard_project_credits || 0)) },
    professional: {
      active,
      validFrom: data.pro_valid_from || null,
      validUntil: data.pro_valid_until || null,
      daysRemaining: active ? Math.max(1, Math.ceil((untilMs - now) / 86400000)) : 0,
      gameAccessPlan,
      gameCooldownLevel: Math.max(0, Math.min(5, Number(data.game_cooldown_level || 0))),
      gameCooldownUntil: data.game_cooldown_until || null,
      gameCooldownActive: !creatorOpportunityActive && gameAccessPlan === "professional" && Number.isFinite(cooldownUntilMs) && cooldownUntilMs > now,
    },
    creatorOpportunity: {
      active: creatorOpportunityActive,
      bonusSharePercent: creatorOpportunityActive ? Number(data.creator_opportunity_bonus_share_percent || 5) : 0,
      approvedAt: data.creator_opportunity_approved_at || null,
      approvedBy: data.creator_opportunity_approved_by || null,
      individualOnly: true,
    },
  };
}

export function createBuilderProjectDataAdapter({
  createClient = createProviderClient,
  createAdminClient = createProviderAdminClient,
} = {}) {
  return Object.freeze({
    id: "compatibility-builder-project-data-v1",

    async currentPrincipal({ requireVerified = false } = {}) {
      const client = await createClient();
      return resolvePrincipal(client, { requireVerified });
    },

    async loadGenerationReplay({ requestId }) {
      const client = await createClient();
      const principal = await resolvePrincipal(client, { requireVerified: true });
      if (!principal.ok) return principal;
      const userId = principal.principal.principalId;
      const { data: app, error: appError } = await client.from("apps").select(APP_REPLAY_FIELDS).eq("owner_id", userId).eq("generation_request_id", requestId).maybeSingle();
      if (appError) return fail("GENERATION_REPLAY_LOOKUP_FAILED", appError.message);
      if (!app) return success({ principal: principal.principal, app: null, version: null });
      if (!app.current_version_id) return success({ principal: principal.principal, app, version: null });
      const { data: version, error: versionError } = await client.from("app_versions").select(VERSION_REPLAY_FIELDS).eq("id", app.current_version_id).eq("app_id", app.id).maybeSingle();
      if (versionError) return fail("GENERATION_REPLAY_VERSION_LOOKUP_FAILED", versionError.message);
      return success({ principal: principal.principal, app, version: version || null });
    },

    async loadGenerationInputs({ assetIds = [] } = {}) {
      const client = await createClient();
      const principal = await resolvePrincipal(client, { requireVerified: true });
      if (!principal.ok) return principal;
      const userId = principal.principal.principalId;
      const [{ data: brandKit }, { data: accessRow }] = await Promise.all([
        client.from("brand_kits").select(BRAND_FIELDS).eq("user_id", userId).maybeSingle(),
        client.from("app_builder_account_access").select("standard_project_credits,pro_valid_from,pro_valid_until,game_access_plan,game_cooldown_level,game_cooldown_until,creator_opportunity_active,creator_opportunity_bonus_share_percent,creator_opportunity_approved_at,creator_opportunity_approved_by").eq("user_id", userId).maybeSingle(),
      ]);
      let ownedAssets = [];
      if (assetIds.length) {
        const { data, error } = await client.from("asset_library").select("id,file_name,mime_type,category").eq("user_id", userId).in("id", assetIds);
        if (error) console.warn("BUILDER_ASSET_PROVIDER_LOOKUP_ERROR", error.code || "READ_FAILED");
        ownedAssets = data || [];
      }
      return success({ principal: principal.principal, brandKit: brandKit || null, builderAccess: normalizeBuilderAccess(accessRow), ownedAssets });
    },

    async persistGeneratedProject({ requestId, name, description, sourcePrompt, specification, changeSummary }) {
      const client = await createClient();
      const principal = await resolvePrincipal(client, { requireVerified: true });
      if (!principal.ok) return principal;
      const admin = createAdminClient();
      const { data, error } = await admin.rpc("server_persist_generated_project", {
        p_user_id: principal.principal.principalId,
        p_request_id: requestId,
        p_name: name,
        p_description: description,
        p_source_prompt: sourcePrompt,
        p_specification: specification,
        p_change_summary: changeSummary,
      });
      if (error || !data?.success) return fail("GENERATED_PROJECT_PERSIST_FAILED", error?.message || "unknown persistence failure");
      return success({ principal: principal.principal, persisted: data });
    },

    async saveGeneratedProjectContext({ projectId, assignments = [], memoryJson, learningScope = "project_only" }) {
      const client = await createClient();
      const principal = await resolvePrincipal(client, { requireVerified: true });
      if (!principal.ok) return principal;
      const userId = principal.principal.principalId;
      const { data: owned } = await client.from("apps").select("id").eq("id", projectId).eq("owner_id", userId).maybeSingle();
      if (!owned) return fail("PROJECT_NOT_FOUND");
      let mediaSaved = true;
      if (assignments.length) {
        const rows = assignments.map((item) => ({ ...item, app_id: projectId, owner_id: userId }));
        const { error } = await client.from("project_assets").upsert(rows, { onConflict: "app_id,asset_id" });
        if (error) {
          mediaSaved = false;
          console.warn("BUILDER_PROJECT_MEDIA_PROVIDER_SAVE_ERROR", error.code || "WRITE_FAILED");
        }
      }
      const { error: memoryError } = await client.from("project_memory").upsert({
        app_id: projectId,
        owner_id: userId,
        memory_json: memoryJson,
        learning_scope: learningScope,
        updated_at: new Date().toISOString(),
      }, { onConflict: "app_id" });
      const { error: referralError } = await client.rpc("record_first_app_referral_reward");
      if (referralError) console.warn("BUILDER_REFERRAL_PROVIDER_ERROR", referralError.code || "RPC_FAILED");
      return success({ principal: principal.principal, mediaSaved, memorySaved: !memoryError });
    },

    async loadModificationContext({ appId, requestId }) {
      const client = await createClient();
      const principal = await resolvePrincipal(client, { requireVerified: true });
      if (!principal.ok) return principal;
      const userId = principal.principal.principalId;
      const { data: project, error: projectError } = await client.from("apps").select("id,current_version_id").eq("id", appId).eq("owner_id", userId).maybeSingle();
      if (projectError || !project) return fail("PROJECT_NOT_FOUND");
      const { data: replayVersion, error: replayError } = await client.from("app_versions").select("id,version_no,created_at,specification").eq("app_id", appId).eq("created_by", userId).eq("source_request_id", requestId).maybeSingle();
      if (replayError) return fail("MODIFICATION_REPLAY_CHECK_FAILED");
      let currentVersion = null;
      if (project.current_version_id) {
        const { data, error } = await client.from("app_versions").select("id,specification").eq("id", project.current_version_id).eq("app_id", appId).maybeSingle();
        if (error) return fail("CURRENT_VERSION_LOAD_FAILED");
        currentVersion = data || null;
      }
      const { data: memory } = await client.from("project_memory").select("memory_json,learning_scope").eq("app_id", appId).eq("owner_id", userId).maybeSingle();
      return success({ principal: principal.principal, project, replayVersion: replayVersion || null, currentVersion, memory: memory || null });
    },

    async saveModification({ appId, expectedVersionId, requestId, specification, changeSummary, memoryJson, learningScope = "project_only" }) {
      const client = await createClient();
      const principal = await resolvePrincipal(client, { requireVerified: true });
      if (!principal.ok) return principal;
      const userId = principal.principal.principalId;
      const { data: project } = await client.from("apps").select("id,current_version_id").eq("id", appId).eq("owner_id", userId).maybeSingle();
      if (!project) return fail("PROJECT_NOT_FOUND");
      if (project.current_version_id !== expectedVersionId) return fail("PROJECT_CHANGED_DURING_MODIFICATION");
      const admin = createAdminClient();
      const { data: version, error } = await admin.rpc("server_save_app_modification", {
        p_user_id: userId,
        p_app_id: appId,
        p_expected_version_id: expectedVersionId,
        p_request_id: requestId,
        p_specification: specification,
        p_change_summary: changeSummary,
      });
      if (error) return fail("MODIFICATION_SAVE_FAILED", error.message);
      let savedVersion = version;
      if (version?.replayed) {
        const { data: persisted, error: persistedError } = await client.from("app_versions").select("id,version_no,created_at,specification").eq("id", version.id).eq("app_id", appId).maybeSingle();
        if (persistedError || !persisted?.specification) return fail("MODIFICATION_REPLAY_LOAD_FAILED");
        savedVersion = persisted;
      }
      const { error: memoryError } = await client.from("project_memory").upsert({
        app_id: appId,
        owner_id: userId,
        memory_json: memoryJson,
        learning_scope: learningScope,
        updated_at: new Date().toISOString(),
      }, { onConflict: "app_id" });
      if (memoryError) console.warn("BUILDER_MODIFY_MEMORY_PROVIDER_SAVE_ERROR", memoryError.code || "WRITE_FAILED");
      return success({ principal: principal.principal, version: savedVersion, replayed: Boolean(version?.replayed), memorySaved: !memoryError });
    },

    async loadPublishPreparation({ appId, versionId, listingId }) {
      const client = await createClient();
      const principal = await resolvePrincipal(client, { requireVerified: true });
      if (!principal.ok) return principal;
      const userId = principal.principal.principalId;
      const { data: project } = await client.from("apps").select("id,current_version_id").eq("id", appId).eq("owner_id", userId).maybeSingle();
      if (!project) return fail("PROJECT_NOT_FOUND");
      const [{ data: version }, { data: listing }, { data: projectAssets }, { data: memory }] = await Promise.all([
        client.from("app_versions").select("id,specification").eq("id", versionId).eq("app_id", appId).maybeSingle(),
        client.from("store_listings").select("id,app_id,version_id,apple,google_play,checklist,customer_approved_at").eq("id", listingId).eq("app_id", appId).maybeSingle(),
        client.from("project_assets").select("asset_id,suggested_role,placement_reason").eq("app_id", appId).eq("owner_id", userId),
        client.from("project_memory").select("memory_json").eq("app_id", appId).eq("owner_id", userId).maybeSingle(),
      ]);
      const assetIds = (projectAssets || []).map((item) => item.asset_id).filter(Boolean);
      let library = [];
      if (assetIds.length) {
        const { data } = await client.from("asset_library").select("id,file_name,mime_type,category").eq("user_id", userId).in("id", assetIds);
        library = data || [];
      }
      return success({ principal: principal.principal, project, version: version || null, listing: listing || null, projectAssets: projectAssets || [], library, memory: memory || null });
    },

    async createStorePublishRequest({ appId, versionId, listingId, platform, requestId }) {
      const client = await createClient();
      const principal = await resolvePrincipal(client, { requireVerified: true });
      if (!principal.ok) return principal;
      const admin = createAdminClient();
      const { data, error } = await admin.rpc("server_create_store_publish_request", {
        p_user_id: principal.principal.principalId,
        p_app_id: appId,
        p_version_id: versionId,
        p_listing_id: listingId,
        p_platform: platform,
        p_request_id: requestId,
      });
      if (error) return fail(error.message?.includes("STALE_STORE_VERSION") ? "STALE_STORE_VERSION" : "STORE_PUBLISH_REQUEST_FAILED", error.message);
      return success({ principal: principal.principal, request: data });
    },

    async saveStoreListing({ appId, versionId, language, normalized }) {
      const client = await createClient();
      const principal = await resolvePrincipal(client, { requireVerified: true });
      if (!principal.ok) return principal;
      const userId = principal.principal.principalId;
      const { data: project } = await client.from("apps").select("id,current_version_id").eq("id", appId).eq("owner_id", userId).maybeSingle();
      if (!project) return fail("PROJECT_NOT_FOUND");
      if (!project.current_version_id || project.current_version_id !== versionId) return fail("STALE_STORE_VERSION");
      const { data: version } = await client.from("app_versions").select("id").eq("id", versionId).eq("app_id", appId).maybeSingle();
      if (!version) return fail("PROJECT_VERSION_NOT_FOUND");
      const admin = createAdminClient();
      const { data, error } = await admin.from("store_listings").upsert({
        app_id: appId,
        version_id: versionId,
        language,
        apple: normalized.apple,
        google_play: normalized.googlePlay,
        checklist: normalized.checklist,
        customer_approved_at: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "app_id,version_id,language" }).select("id,app_id,version_id,language,apple,google_play,checklist,customer_approved_at,updated_at").single();
      if (error || !data) return fail("STORE_LISTING_SAVE_FAILED", error?.message || null);
      return success({ principal: principal.principal, listing: data });
    },
  });
}
