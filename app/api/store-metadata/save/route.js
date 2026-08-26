import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const body = await request.json();
    const appId = String(body?.appId || "").trim();
    const versionId = String(body?.versionId || "").trim() || null;
    const language = String(body?.language || "en").trim().slice(0, 12) || "en";
    const apple = body?.apple || {};
    const googlePlay = body?.googlePlay || {};
    const checklist = Array.isArray(body?.checklist) ? body.checklist : [];
    if (!appId) return NextResponse.json({ error: "appId is required." }, { status: 400 });
    const { data: app } = await supabase.from("apps").select("id").eq("id", appId).eq("owner_id", user.id).single();
    if (!app) return NextResponse.json({ error: "App not found." }, { status: 404 });
    if (versionId) {
      const { data: version } = await supabase.from("app_versions").select("id").eq("id", versionId).eq("app_id", appId).single();
      if (!version) return NextResponse.json({ error: "Version not found." }, { status: 404 });
    }
    const { data, error } = await supabase.from("store_listings").upsert({ app_id: appId, version_id: versionId, language, apple, google_play: googlePlay, checklist }, { onConflict: "app_id,version_id,language" }).select("*").single();
    if (error) return NextResponse.json({ error: "Unable to save store listing." }, { status: 500 });
    return NextResponse.json({ success: true, listing: data });
  } catch (error) {
    console.error("STORE_LISTING_SAVE_API_ERROR:", error);
    return NextResponse.json({ error: "Unable to save store listing." }, { status: 500 });
  }
}
