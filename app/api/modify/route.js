import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server.js";

const GEMINI_MODEL = "gemini-3.6-flash";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (!user.confirmed_at && !user.email_confirmed_at && !user.phone_confirmed_at) {
      return NextResponse.json(
        { error: "Please verify your email or phone before modifying an app." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const instruction = body?.instruction?.trim();
    const specification = body?.specification;
    const appId = body?.appId || null;

    if (!instruction) {
      return NextResponse.json({ error: "Modification instruction is required." }, { status: 400 });
    }

    if (!specification) {
      return NextResponse.json({ error: "App specification is required." }, { status: 400 });
    }

    if (appId) {
      const { data: ownedApp, error: ownedAppError } = await supabase
        .from("apps")
        .select("id")
        .eq("id", appId)
        .eq("owner_id", user.id)
        .single();

      if (ownedAppError || !ownedApp) {
        return NextResponse.json({ error: "App not found or access denied." }, { status: 404 });
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured. Please add it in Vercel Environment Variables." },
        { status: 500 }
      );
    }

    const prompt = `
You are the modification engine for an AI App Builder.

The user already has an app specification.

They want to modify the app according to this instruction:

"${instruction}"

Current app specification:

${JSON.stringify(specification, null, 2)}

Return ONLY valid JSON.

Keep the existing structure and functionality unless the user's instruction requires a change.
Preserve existing pages and features when possible.
Apply the requested modification intelligently.

Return JSON in this structure:
{
  "name": "App name",
  "description": "App description",
  "pages": [{ "name": "Page name", "purpose": "Page purpose" }],
  "features": [{ "name": "Feature name", "description": "Feature description" }],
  "dataModels": [],
  "actions": []
}

Do not include markdown.
Do not include explanations outside JSON.
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || `Gemini HTTP ${response.status}` },
        { status: response.status }
      );
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json({ error: "Gemini returned an empty modification response." }, { status: 500 });
    }

    let modifiedSpecification;
    try {
      modifiedSpecification = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Gemini returned invalid JSON. Please try the modification again." },
        { status: 500 }
      );
    }

    let savedVersion = null;

    if (appId) {
      const { data: latestVersion, error: latestError } = await supabase
        .from("app_versions")
        .select("version_no")
        .eq("app_id", appId)
        .order("version_no", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestError) throw latestError;

      const nextVersion = (latestVersion?.version_no || 0) + 1;

      const { data: version, error: versionError } = await supabase
        .from("app_versions")
        .insert({
          app_id: appId,
          version_no: nextVersion,
          specification: modifiedSpecification,
          change_summary: instruction,
          created_by: user.id,
        })
        .select("id, version_no, created_at")
        .single();

      if (versionError) throw versionError;

      savedVersion = version;

      const { error: updateError } = await supabase
        .from("apps")
        .update({
          name: String(modifiedSpecification.name || "Untitled App"),
          description: String(modifiedSpecification.description || ""),
          current_version_id: version.id,
        })
        .eq("id", appId)
        .eq("owner_id", user.id);

      if (updateError) throw updateError;
    }

    return NextResponse.json({
      success: true,
      specification: modifiedSpecification,
      appId,
      version: savedVersion,
    });
  } catch (error) {
    console.error("Modify API error:", error);

    return NextResponse.json(
      { error: error?.message || "Something went wrong while modifying the app." },
      { status: 500 }
    );
  }
}
