import { NextResponse } from "next/server";
import { runAutonomousEngine } from "../../../engine/autonomous-engine.js";
import { createClient } from "../../../lib/supabase/server.js";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

    if (!user.confirmed_at && !user.email_confirmed_at && !user.phone_confirmed_at) {
      return NextResponse.json(
        { success: false, error: "Please verify your email or phone before creating an app." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const idea = String(body?.idea || body?.prompt || "").trim();

    if (!idea) {
      return NextResponse.json(
        { success: false, error: "Please describe the app you want to build." },
        { status: 400 }
      );
    }

    const result = await runAutonomousEngine(idea);
    const specification = result?.specification;

    if (!specification) {
      throw new Error("AI did not return a valid application specification.");
    }

    const appName = String(specification.name || "Untitled App").trim();
    const appDescription = String(specification.description || "").trim();

    const { data: app, error: appError } = await supabase
      .from("apps")
      .insert({
        owner_id: user.id,
        name: appName,
        description: appDescription,
        source_prompt: idea,
      })
      .select("id, name, description, created_at, updated_at")
      .single();

    if (appError) throw appError;

    const { data: version, error: versionError } = await supabase
      .from("app_versions")
      .insert({
        app_id: app.id,
        version_no: 1,
        specification,
        change_summary: "Initial AI-generated application",
        created_by: user.id,
      })
      .select("id, version_no, created_at")
      .single();

    if (versionError) throw versionError;

    const { error: appUpdateError } = await supabase
      .from("apps")
      .update({ current_version_id: version.id })
      .eq("id", app.id)
      .eq("owner_id", user.id);

    if (appUpdateError) throw appUpdateError;

    const { error: referralError } = await supabase.rpc(
      "record_first_app_referral_reward"
    );

    if (referralError) {
      console.warn("Referral qualification could not be recorded:", referralError.message);
    }

    return NextResponse.json({
      success: true,
      ...result,
      app: {
        id: app.id,
        name: app.name,
        versionId: version.id,
        versionNo: version.version_no,
      },
    });
  } catch (error) {
    console.error("AI App Builder error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unable to generate the app.",
      },
      { status: 500 }
    );
  }
}
