import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server.js";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const versionId = String(body?.versionId || "").trim();
    if (!versionId) return NextResponse.json({ error: "versionId is required." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: app, error: appError } = await supabase
      .from("apps")
      .select("id,owner_id,current_version_id,name,description")
      .eq("id", id)
      .eq("owner_id", user.id)
      .single();
    if (appError || !app) return NextResponse.json({ error: "Project not found or access denied." }, { status: 404 });

    const { data: target, error: targetError } = await supabase
      .from("app_versions")
      .select("id,version_no,specification")
      .eq("id", versionId)
      .eq("app_id", id)
      .single();
    if (targetError || !target?.specification) return NextResponse.json({ error: "Version not found." }, { status: 404 });

    const { data: latest, error: latestError } = await supabase
      .from("app_versions")
      .select("version_no")
      .eq("app_id", id)
      .order("version_no", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) throw latestError;

    const nextVersion = (latest?.version_no || 0) + 1;
    const spec = target.specification;
    const { data: rollbackVersion, error: insertError } = await supabase
      .from("app_versions")
      .insert({
        app_id: id,
        version_no: nextVersion,
        specification: spec,
        change_summary: `Rollback to version ${target.version_no}`,
        created_by: user.id,
      })
      .select("id,version_no,created_at,change_summary")
      .single();
    if (insertError || !rollbackVersion) throw insertError || new Error("Unable to create rollback version.");

    const { error: updateError } = await supabase
      .from("apps")
      .update({
        current_version_id: rollbackVersion.id,
        name: String(spec?.name || app.name || "Untitled App"),
        description: String(spec?.description || app.description || ""),
      })
      .eq("id", id)
      .eq("owner_id", user.id);
    if (updateError) throw updateError;

    return NextResponse.json({ success: true, appId: id, version: rollbackVersion, rolledBackFrom: target.version_no });
  } catch (error) {
    console.error("PROJECT_ROLLBACK_ERROR:", error);
    return NextResponse.json({ error: "Unable to rollback this project safely." }, { status: 500 });
  }
}
