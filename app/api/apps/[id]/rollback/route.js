import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server.js";
import { createAdminClient } from "../../../../../lib/supabase/admin.js";
import { assessBuildQuality } from "../../../../../lib/buildStandards.js";
import { evaluateReleaseReadiness } from "../../../../../lib/release-readiness.js";
import { auditPremiumExperience } from "../../../../../lib/ai/premium-experience-system.js";

function requestKey(value) {
  const clean = String(value || crypto.randomUUID()).trim().replace(/[^a-zA-Z0-9._:-]/g, "-").slice(0, 145);
  return clean.length >= 8 ? `rollback:${clean}` : `rollback:${crypto.randomUUID()}`;
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const versionId = String(body?.versionId || "").trim();
    const expectedCurrentVersionId = String(body?.expectedCurrentVersionId || "").trim();
    if (!versionId) return NextResponse.json({ error: "versionId is required." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: app, error: appError } = await supabase.from("apps").select("id,owner_id,current_version_id,name,description").eq("id", id).eq("owner_id", user.id).single();
    if (appError || !app) return NextResponse.json({ error: "Project not found or access denied." }, { status: 404 });
    if (!app.current_version_id) return NextResponse.json({ error: "This project has no current version to recover from." }, { status: 409 });
    if (expectedCurrentVersionId && expectedCurrentVersionId !== String(app.current_version_id)) {
      return NextResponse.json({ error: "This project changed after the version list was loaded. Refresh before restoring an older version." }, { status: 409 });
    }
    if (versionId === String(app.current_version_id)) return NextResponse.json({ error: "That version is already current." }, { status: 409 });

    const { data: target, error: targetError } = await supabase.from("app_versions").select("id,version_no,specification").eq("id", versionId).eq("app_id", id).single();
    if (targetError || !target?.specification) return NextResponse.json({ error: "Version not found." }, { status: 404 });

    const quality = assessBuildQuality(target.specification);
    const readiness = evaluateReleaseReadiness(quality);
    const visualQuality = auditPremiumExperience(target.specification);
    if (!readiness.releaseReady || !visualQuality.passed) {
      return NextResponse.json({
        error: "This historical version does not meet the current 100-point recovery gate, so it was not restored. Open it through the AI editor and repair the saved content first.",
        targetVersion: target.version_no,
        quality,
        visualQuality,
        next: `/editor/${id}`,
      }, { status: 409 });
    }

    const admin = createAdminClient();
    const { data: rollbackVersion, error: rollbackError } = await admin.rpc("server_save_app_modification", {
      p_user_id: user.id,
      p_app_id: id,
      p_expected_version_id: app.current_version_id,
      p_request_id: requestKey(body?.requestId),
      p_specification: target.specification,
      p_change_summary: `Rollback to version ${target.version_no}`,
    });
    if (rollbackError) throw rollbackError;

    return NextResponse.json({
      success: true,
      appId: id,
      version: rollbackVersion,
      rolledBackFrom: target.version_no,
      quality,
      visualQuality,
      recoveryGate: 100,
      replayed: rollbackVersion?.replayed === true,
      message: "The selected version passed the current 100-point gate and was restored atomically as a new history entry.",
    });
  } catch (error) {
    const message = String(error?.message || "");
    console.error("PROJECT_ROLLBACK_ERROR:", error);
    if (message.includes("Project changed during modification")) return NextResponse.json({ error: "This project changed while the rollback was running. Refresh and try again." }, { status: 409 });
    if (message.includes("Server financial runtime is not configured")) return NextResponse.json({ error: "Secure project recovery is not configured yet." }, { status: 503 });
    return NextResponse.json({ error: "Unable to rollback this project safely." }, { status: 500 });
  }
}
