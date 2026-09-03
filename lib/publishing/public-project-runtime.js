import { createAdminClient } from "../supabase/admin.js";

const PUBLIC_VISIBILITY = new Set(["listed", "public"]);

export function isPublishedProject(app) {
  return Boolean(app && app.publish_status === "published" && PUBLIC_VISIBILITY.has(app.visibility) && app.published_version_id);
}

export async function loadVisibleProject({ id, userId = null, versionId = null }) {
  const appId = String(id || "").trim();
  if (!appId) return null;

  const admin = createAdminClient();
  const { data: app, error: appError } = await admin
    .from("apps")
    .select("id,owner_id,name,description,current_version_id,published_version_id,visibility,publish_status")
    .eq("id", appId)
    .maybeSingle();

  if (appError || !app) return null;

  const isOwner = Boolean(userId && app.owner_id === userId);
  const isPublished = isPublishedProject(app);
  if (!isOwner && !isPublished) return null;
  if (isOwner && !app.current_version_id) return null;

  const requestedVersionId = String(versionId || "").trim();
  const selectedVersionId = requestedVersionId && isOwner
    ? requestedVersionId
    : isOwner
      ? app.current_version_id
      : app.published_version_id;
  if (!selectedVersionId) return null;

  const { data: version, error: versionError } = await admin
    .from("app_versions")
    .select("id,version_no,specification")
    .eq("id", selectedVersionId)
    .eq("app_id", app.id)
    .maybeSingle();

  if (versionError || !version?.specification) return null;

  return {
    admin,
    app,
    version,
    isOwner,
    isPublished,
    isPinnedPreview: Boolean(requestedVersionId && isOwner),
    isCurrentVersion: version.id === app.current_version_id,
    isPublishedVersion: Boolean(app.published_version_id && version.id === app.published_version_id),
  };
}

export async function loadVisibleProjectMedia(admin, appId) {
  if (!admin || !appId) return [];

  const { data: links, error: linksError } = await admin
    .from("project_assets")
    .select("asset_id,suggested_page,suggested_role,placement_reason")
    .eq("app_id", appId)
    .limit(20);

  if (linksError || !links?.length) return [];

  const ids = links.map((item) => item.asset_id).filter(Boolean);
  if (!ids.length) return [];

  const { data: assets, error: assetsError } = await admin
    .from("asset_library")
    .select("id,file_name,storage_path,mime_type,category,alt_text")
    .in("id", ids);

  if (assetsError || !assets?.length) return [];

  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  const media = [];

  for (const link of links) {
    const asset = byId.get(link.asset_id);
    if (!asset?.storage_path) continue;

    const { data: signed } = await admin.storage
      .from("user-assets")
      .createSignedUrl(asset.storage_path, 900);

    if (!signed?.signedUrl) continue;

    media.push({
      id: asset.id,
      name: asset.file_name,
      mimeType: asset.mime_type,
      category: asset.category,
      alt: asset.alt_text || asset.file_name,
      url: signed.signedUrl,
      page: link.suggested_page,
      role: link.suggested_role,
      reason: link.placement_reason,
    });
  }

  return media;
}
