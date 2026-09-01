import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server.js";
import { createAdminClient } from "../../../../../lib/supabase/admin.js";

function json(payload, status = 200) {
  return NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const versionId = String(body?.versionId || "").trim();
    const expectedCurrentVersionId = String(body?.expectedCurrentVersionId || "").trim();
    const requestId = String(body?.requestId || "").trim().slice(0, 151);

    if (!versionId) return json({ error: "versionId is required." }, 400);
    if (!expectedCurrentVersionId) return json({ error: "expectedCurrentVersionId is required." }, 400);
    if (!requestId) return json({ error: "requestId is required." }, 400);

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Authentication required." }, 401);

    const { data: app, error: appError } = await supabase
      .from("apps")
      .select("id,owner_id,current_version_id")
      .eq("id", id)
      .eq("owner_id", user.id)
      .single();
    if (appError || !app) return json({ error: "Project not found or access denied." }, 404);
    if (!app.current_version_id) return json({ error: "Project has no current version." }, 409);
    if (app.current_version_id !== expectedCurrentVersionId) {
      return json({ code: "STALE_VERSION", error: "Project changed before rollback. Refresh Version History and try again." }, 409);
    }
    if (versionId === app.current_version_id) return json({ error: "That version is already current." }, 409);

    const { data: target, error: targetError } = await supabase
      .from("app_versions")
      .select("id,version_no")
      .eq("id", versionId)
      .eq("app_id", id)
      .single();
    if (targetError || !target) return json({ error: "Version not found." }, 404);

    const admin = createAdminClient();
    const { data: rollbackVersion, error: rollbackError } = await admin.rpc("server_rollback_app_version", {
      p_user_id: user.id,
      p_app_id: id,
      p_target_version_id: versionId,
      p_expected_current_version_id: expectedCurrentVersionId,
      p_request_id: requestId,
    });

    if (rollbackError) {
      const message = String(rollbackError.message || "");
      if (/Project changed during rollback|Target version is already current/i.test(message)) {
        return json({ code: "STALE_VERSION", error: "Project changed before rollback. Refresh Version History and try again." }, 409);
      }
      if (/App access denied|Version not found/i.test(message)) return json({ error: "Project or version not found." }, 404);
      console.error("PROJECT_ROLLBACK_RPC_ERROR:", rollbackError);
      return json({ error: "Unable to rollback this project safely." }, 500);
    }

    return json({
      success: true,
      appId: id,
      version: rollbackVersion,
      rolledBackFrom: target.version_no,
      replayed: Boolean(rollbackVersion?.replayed),
    });
  } catch (error) {
    console.error("PROJECT_ROLLBACK_ERROR:", error);
    return json({ error: "Unable to rollback this project safely." }, 500);
  }
}
