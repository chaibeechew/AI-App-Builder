import { NextResponse } from "next/server";
import { loadCreatorPreviewSource } from "../../../lib/cloud/creator-operations.js";
import { createPreview } from "../../../engine/preview-engine.js";
import { selfTestGeneratedApp } from "../../../lib/generator/self-test.js";
import { buildAppExplanation } from "../../../lib/generator/app-explanation.js";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0", "Pragma": "no-cache" },
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const appId = String(body?.appId || "").trim();
    if (!appId) return json({ error: "appId is required." }, 400);

    const source = await loadCreatorPreviewSource({ projectId: appId, versionId: body?.versionId || null });
    if (!source.ok && source.code === "AUTHENTICATION_REQUIRED") return json({ error: "Authentication required." }, 401);
    if (!source.ok && source.code === "PROJECT_NOT_FOUND") return json({ error: "App not found or access denied." }, 404);
    if (!source.ok && source.code === "PROJECT_VERSION_NOT_FOUND") return json({ error: "Version not found." }, 404);
    if (!source.ok) return json({ error: "Unable to load preview source." }, 500);

    const { project: app, version } = source;
    const test = selfTestGeneratedApp(version.specification);
    if (!test.ok) return json({ error: "This version needs repair before preview.", test }, 422);
    const preview = await createPreview({ idea: app.description, specification: test.normalizedSpec });
    return json({ success: true, app: { id: app.id, name: app.name }, version, preview, selfTest: test, explanation: buildAppExplanation(test.normalizedSpec) });
  } catch (error) {
    console.error("Preview API error:", error?.name || "Error");
    return json({ error: "Unable to prepare preview." }, 500);
  }
}
