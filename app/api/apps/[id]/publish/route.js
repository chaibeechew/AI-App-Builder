import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server.js";
import { assessBuildQuality } from "../../../../../lib/buildStandards.js";
import { evaluateReleaseReadiness, RELEASE_POLICY_NOTE } from "../../../../../lib/release-readiness.js";

export async function POST(_request, { params }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: app } = await supabase.from("apps").select("id,owner_id,current_version_id").eq("id", id).eq("owner_id", user.id).single();
    if (!app?.current_version_id) return NextResponse.json({ error: "App and Website are not ready to publish." }, { status: 409 });

    const { data: version, error: versionError } = await supabase.from("app_versions").select("id,version_no,specification").eq("id", app.current_version_id).eq("app_id", id).single();
    if (versionError || !version) return NextResponse.json({ error: "Current project version could not be verified." }, { status: 409 });

    const quality = assessBuildQuality(version.specification || {});
    const readiness = evaluateReleaseReadiness(quality);
    if (!readiness.releaseReady) return NextResponse.json({
      error: `Publishing is locked until the project reaches ${readiness.requiredScore}/100 overall and in every quality dimension.`,
      quality,
      target: readiness.requiredScore,
      releaseReady: false,
      belowTarget: readiness.belowTarget,
      missingDimensions: readiness.missing,
      note: RELEASE_POLICY_NOTE,
      next: `/release/${id}`,
    }, { status: 409 });

    const { data: updated, error } = await supabase.from("apps").update({ visibility: "public", publish_status: "published" }).eq("id", id).eq("owner_id", user.id).select("id,name,visibility,publish_status").single();
    if (error || !updated) {
      console.error("PROJECT_PUBLISH_ERROR:", error);
      return NextResponse.json({ error: "Unable to publish the App and Website." }, { status: 500 });
    }

    return NextResponse.json({ success: true, app: updated, quality, target: readiness.requiredScore, releaseReady: true, note: RELEASE_POLICY_NOTE, path: `/a/${id}`, appPath: `/a/${id}`, websitePath: `/website/${id}` });
  } catch (error) {
    console.error("PROJECT_PUBLISH_API_ERROR:", error);
    return NextResponse.json({ error: "Unable to publish the App and Website." }, { status: 500 });
  }
}
