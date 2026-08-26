import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";

export async function GET(_request, { params }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { id } = await params;

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: app, error: appError } = await supabase
    .from("apps")
    .select("id, name, description, source_prompt, current_version_id, created_at, updated_at")
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
    return NextResponse.json({ error: versionsError.message }, { status: 500 });
  }

  return NextResponse.json({ app, versions: versions || [] });
}

export async function POST(request, { params }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { id } = await params;

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = await request.json();
  const versionId = body?.versionId;

  if (!versionId) {
    return NextResponse.json({ error: "versionId is required." }, { status: 400 });
  }

  const { data: version, error: versionError } = await supabase
    .from("app_versions")
    .select("id, version_no, specification")
    .eq("id", versionId)
    .eq("app_id", id)
    .single();

  if (versionError || !version) {
    return NextResponse.json({ error: "Version not found." }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("apps")
    .update({ current_version_id: version.id })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    rollback: {
      appId: id,
      versionId: version.id,
      versionNo: version.version_no,
      specification: version.specification,
    },
  });
}
