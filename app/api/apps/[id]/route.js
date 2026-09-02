import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";

export async function GET(_request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { id } = await params;

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data: app, error: appError } = await supabase
      .from("apps")
      .select("id, name, description, source_prompt, current_version_id, visibility, publish_status, created_at, updated_at")
      .eq("id", id)
      .eq("owner_id", user.id)
      .single();

    if (appError || !app) {
      return NextResponse.json({ error: "App not found." }, { status: 404 });
    }

    const { data: versions, error: versionsError } = await supabase
      .from("app_versions")
      .select("id, version_no, specification, change_summary, created_at")
      .eq("app_id", id)
      .order("version_no", { ascending: false });

    if (versionsError) {
      console.error("APP_VERSIONS_LIST_ERROR:", versionsError);
      return NextResponse.json({ error: "Unable to load app versions." }, { status: 500 });
    }

    return NextResponse.json({ app, versions: versions || [] }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    console.error("APP_DETAIL_API_ERROR:", error);
    return NextResponse.json({ error: "Unable to load app." }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({
    code: "LEGACY_ROLLBACK_DISABLED",
    error: "Legacy rollback is disabled. Use the safe Version History rollback flow so a new version is created with stale-version protection.",
  }, { status: 410, headers: { "Cache-Control": "no-store" } });
}
