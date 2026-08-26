import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server.js";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("apps")
      .select("id, name, description, source_prompt, current_version_id, created_at, updated_at")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("APPS_LIST_ERROR:", error);
      return NextResponse.json({ error: "Unable to load apps." }, { status: 500 });
    }

    return NextResponse.json({ apps: data || [] });
  } catch (error) {
    console.error("APPS_API_ERROR:", error);
    return NextResponse.json({ error: "Unable to load apps." }, { status: 500 });
  }
}
