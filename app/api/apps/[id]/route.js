import { NextResponse } from "next/server";
import { getCurrentUserProject } from "../../../../lib/cloud/projects.js";

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const result = await getCurrentUserProject(id);

    if (!result.ok && result.code === "AUTHENTICATION_REQUIRED") {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (!result.ok && result.code === "PROJECT_NOT_FOUND") {
      return NextResponse.json({ error: "App not found." }, { status: 404 });
    }

    if (!result.ok) {
      console.error("APP_DETAIL_ERROR:", result.code || "PROJECT_UNAVAILABLE");
      return NextResponse.json({ error: result.code === "PROJECT_VERSIONS_UNAVAILABLE" ? "Unable to load app versions." : "Unable to load app." }, { status: 500 });
    }

    return NextResponse.json(
      { app: result.project, versions: result.versions || [] },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("APP_DETAIL_API_ERROR:", error instanceof Error ? error.message : "PROJECT_UNAVAILABLE");
    return NextResponse.json({ error: "Unable to load app." }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({
    code: "LEGACY_ROLLBACK_DISABLED",
    error: "Legacy rollback is disabled. Use the safe Version History rollback flow so a new version is created with stale-version protection.",
  }, { status: 410, headers: { "Cache-Control": "no-store" } });
}
