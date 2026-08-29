import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server.js";

export async function POST(_request, { params }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: app } = await supabase
      .from("apps")
      .select("id,owner_id,current_version_id")
      .eq("id", id)
      .eq("owner_id", user.id)
      .single();
    if (!app?.current_version_id) return NextResponse.json({ error: "App is not ready to publish." }, { status: 409 });

    const { data: updated, error } = await supabase
      .from("apps")
      .update({ visibility: "public", publish_status: "published" })
      .eq("id", id)
      .eq("owner_id", user.id)
      .select("id,name,visibility,publish_status")
      .single();
    if (error || !updated) {
      console.error("WEB_APP_PUBLISH_ERROR:", error);
      return NextResponse.json({ error: "Unable to publish the web app." }, { status: 500 });
    }

    return NextResponse.json({ success: true, app: updated, path: `/a/${id}` });
  } catch (error) {
    console.error("WEB_APP_PUBLISH_API_ERROR:", error);
    return NextResponse.json({ error: "Unable to publish the web app." }, { status: 500 });
  }
}
