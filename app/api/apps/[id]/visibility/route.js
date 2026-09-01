import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server.js";

export async function PATCH(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const visibility = body?.visibility;
    const publishStatus = body?.publish_status;
    const patch = {};

    if (publishStatus === "published" || visibility === "public") {
      return NextResponse.json({
        success: false,
        error: "Public publishing cannot bypass the 100-point quality gate. Use the verified Publish action.",
        next: `/api/apps/${id}/publish`,
      }, { status: 409 });
    }
    if (visibility !== undefined) {
      if (!["private", "listed"].includes(visibility)) return NextResponse.json({ success: false, error: "Invalid visibility." }, { status: 400 });
      patch.visibility = visibility;
    }
    if (publishStatus !== undefined) {
      if (publishStatus !== "draft") return NextResponse.json({ success: false, error: "Invalid publish status." }, { status: 400 });
      patch.publish_status = "draft";
      patch.visibility = "private";
    }
    if (!Object.keys(patch).length) return NextResponse.json({ success: false, error: "No changes supplied." }, { status: 400 });

    const { data, error } = await supabase.from("apps").update(patch).eq("id", id).eq("owner_id", user.id).select("id,name,visibility,publish_status").single();
    if (error || !data) {
      console.error("APP_VISIBILITY_UPDATE_ERROR:", error);
      return NextResponse.json({ success: false, error: "Unable to update project visibility." }, { status: 500 });
    }
    return NextResponse.json({ success: true, app: data, note: publishStatus === "draft" ? "Project returned to a private draft." : "Project visibility updated." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("APP_VISIBILITY_API_ERROR:", error);
    return NextResponse.json({ success: false, error: "Unable to update project visibility." }, { status: 500 });
  }
}
