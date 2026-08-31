import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";

function safeObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const body = await request.json();
    const appId = String(body?.appId || "").trim();
    const versionId = String(body?.versionId || "").trim() || null;
    const language = String(body?.language || "en").trim().slice(0, 12) || "en";
    const apple = safeObject(body?.apple);
    const googlePlay = safeObject(body?.googlePlay);
    const checklist = Array.isArray(body?.checklist) ? body.checklist.slice(0, 40) : [];
    if (!appId) return NextResponse.json({ error: "appId is required." }, { status: 400 });
    const { data: app } = await supabase.from("apps").select("id,current_version_id").eq("id", appId).eq("owner_id", user.id).single();
    if (!app) return NextResponse.json({ error: "App not found." }, { status: 404 });
    if (versionId) {
      const { data: version } = await supabase.from("app_versions").select("id").eq("id", versionId).eq("app_id", appId).single();
      if (!version) return NextResponse.json({ error: "Version not found." }, { status: 404 });
      if (app.current_version_id && app.current_version_id !== versionId) return NextResponse.json({ error: "Store metadata can only be saved for the current project version." }, { status: 409 });
    }
    const { data, error } = await supabase.from("store_listings").upsert({
      app_id: appId,
      version_id: versionId,
      language,
      apple,
      google_play: googlePlay,
      checklist,
      customer_approved_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "app_id,version_id,language" }).select("*").single();
    if (error) return NextResponse.json({ error: "Unable to save store listing." }, { status: 500 });
    return NextResponse.json({ success: true, listing: data, approvalReset: true, message: "Store listing saved. Customer approval is required again after any metadata change." });
  } catch (error) {
    console.error("STORE_LISTING_SAVE_API_ERROR:", error);
    return NextResponse.json({ error: "Unable to save store listing." }, { status: 500 });
  }
}
