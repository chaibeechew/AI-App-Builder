import { NextResponse } from "next/server";
import { createClient } from "../../../../../../lib/supabase/server.js";
import { assessBuildQuality } from "../../../../../../lib/buildStandards.js";

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: app, error: appError } = await supabase
      .from("apps")
      .select("id,name,current_version_id,owner_id")
      .eq("id", id)
      .eq("owner_id", user.id)
      .single();
    if (appError || !app) return NextResponse.json({ error: "Project not found or access denied." }, { status: 404 });
    if (!app.current_version_id) return NextResponse.json({ error: "No saved version available for quality review." }, { status: 409 });

    const { data: version, error: versionError } = await supabase
      .from("app_versions")
      .select("id,version_no,specification,created_at")
      .eq("id", app.current_version_id)
      .eq("app_id", id)
      .single();
    if (versionError || !version) return NextResponse.json({ error: "Current version could not be loaded." }, { status: 409 });

    const report = assessBuildQuality(version.specification || {});
    const security = report.dimensions.find((item) => item.id === "security")?.score || 0;
    const privacy = report.dimensions.find((item) => item.id === "privacy")?.score || 0;
    const stability = report.dimensions.find((item) => item.id === "stability")?.score || 0;
    const criticalPassed = security >= 60 && privacy >= 60 && stability >= 60;
    const releaseReady = criticalPassed && report.overall >= 75;

    return NextResponse.json({
      success: true,
      app: { id: app.id, name: app.name },
      version: { id: version.id, versionNo: version.version_no },
      report,
      releaseReady,
      criticalPassed,
      note: "This automated gate reviews the saved specification. Production release still requires runtime, dependency, infrastructure and real-device testing.",
    });
  } catch (error) {
    console.error("QUALITY_GATE_API_ERROR:", error);
    return NextResponse.json({ error: "Unable to run the automatic quality gate." }, { status: 500 });
  }
}
