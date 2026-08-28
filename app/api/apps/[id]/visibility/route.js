import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server.js";

export async function PATCH(request, { params }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success:false, error:"Authentication required." }, { status:401 });

  const { id } = await params;
  const body = await request.json();
  const visibility = body?.visibility;
  const publishStatus = body?.publish_status;
  const patch = {};
  if (visibility !== undefined) {
    if (!["private", "listed"].includes(visibility)) return NextResponse.json({ success:false,error:"Invalid visibility." },{status:400});
    patch.visibility = visibility;
  }
  if (publishStatus !== undefined) {
    if (!["draft", "published"].includes(publishStatus)) return NextResponse.json({ success:false,error:"Invalid publish status." },{status:400});
    patch.publish_status = publishStatus;
  }
  if (!Object.keys(patch).length) return NextResponse.json({success:false,error:"No changes supplied."},{status:400});

  const { data, error } = await supabase.from("apps").update(patch).eq("id", id).eq("owner_id", user.id).select("id, name, visibility, publish_status").single();
  if (error) {
    console.error("App settings update failed:", error);
    return NextResponse.json({success:false,error:error.message},{status:500});
  }
  return NextResponse.json({success:true,app:data});
}
