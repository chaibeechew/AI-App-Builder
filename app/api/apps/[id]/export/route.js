import { createClient } from "../../../../../lib/supabase/server.js";
import {
  createPortableSourceExport,
  LANERIQ_PORTABLE_SOURCE_EXPORT_MEDIA_TYPE,
  portableSourceFilename,
} from "../../../../../lib/ai/portable-source-export.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorResponse(message, status) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const requestedVersionId = String(new URL(request.url).searchParams.get("versionId") || "").trim();
    if (requestedVersionId && !UUID.test(requestedVersionId)) {
      return errorResponse("versionId must identify one exact saved project version.", 400);
    }

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return errorResponse("Authentication required.", 401);

    const { data: app, error: appError } = await supabase
      .from("apps")
      .select("id,owner_id,current_version_id")
      .eq("id", id)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (appError || !app) return errorResponse("Project not found.", 404);

    const versionId = requestedVersionId || String(app.current_version_id || "").trim();
    if (!UUID.test(versionId)) return errorResponse("A saved project version is required for source export.", 409);

    const { data: version, error: versionError } = await supabase
      .from("app_versions")
      .select("id,version_no,specification,change_summary,created_at")
      .eq("id", versionId)
      .eq("app_id", id)
      .maybeSingle();
    if (versionError || !version) return errorResponse("Saved project version not found.", 404);

    const bundle = createPortableSourceExport({ app, version });
    const body = `${JSON.stringify(bundle, null, 2)}\n`;
    const filename = portableSourceFilename(app.id, version.version_no);

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": `${LANERIQ_PORTABLE_SOURCE_EXPORT_MEDIA_TYPE}; charset=utf-8`,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store, max-age=0",
        Pragma: "no-cache",
        "X-Content-Type-Options": "nosniff",
        "X-LANERIQ-Project-ID": app.id,
        "X-LANERIQ-Version-ID": version.id,
        "X-LANERIQ-Bundle-Digest": bundle.bundleDigest,
      },
    });
  } catch (error) {
    console.error("PORTABLE_SOURCE_EXPORT_ERROR", error?.code || error?.name || "unknown");
    return errorResponse("Unable to export this saved project version right now.", 500);
  }
}
