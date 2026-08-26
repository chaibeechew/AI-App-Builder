import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server.js";
import crypto from "node:crypto";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const body = await request.json();
    const appId = String(body?.appId || "").trim();
    if (!appId) return NextResponse.json({ error: "appId is required." }, { status: 400 });

    const { data: app } = await supabase.from("apps").select("id,name,current_version_id").eq("id", appId).eq("owner_id", user.id).single();
    if (!app?.current_version_id) return NextResponse.json({ error: "App or current version not found." }, { status: 404 });

    const token = crypto.randomBytes(24).toString("base64url");
    const { data: share, error } = await supabase.from("app_shares").insert({ app_id: app.id, version_id: app.current_version_id, token, created_by: user.id }).select("id,token,created_at").single();
    if (error) throw error;
    const origin = new URL(request.url).origin;
    return NextResponse.json({ success: true, share, url: `${origin}/share/${token}` });
  } catch (error) {
    console.error("SHARE_CREATE_ERROR:", error);
    return NextResponse.json({ error: "Unable to create share link." }, { status: 500 });
  }
}
