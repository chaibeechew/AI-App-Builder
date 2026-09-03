import { NextResponse } from "next/server";
import { listCurrentUserProjects } from "../../../lib/cloud/projects.js";

export async function GET() {
  try {
    const result = await listCurrentUserProjects();

    if (!result.ok && result.code === "AUTHENTICATION_REQUIRED") {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    if (!result.ok) {
      console.error("APPS_LIST_ERROR:", result.code || "PROJECT_LIST_UNAVAILABLE");
      return NextResponse.json({ error: "Unable to load apps." }, { status: 500 });
    }

    return NextResponse.json(
      { apps: result.projects || [] },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("APPS_API_ERROR:", error instanceof Error ? error.message : "PROJECT_LIST_UNAVAILABLE");
    return NextResponse.json({ error: "Unable to load apps." }, { status: 500 });
  }
}
