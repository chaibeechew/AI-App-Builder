import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server.js";
import { buildProjectExport, PROJECT_EXPORT_SCORE_REQUIRED } from "../../../../../lib/project-export.js";

const SOURCE_QUERIES = Object.freeze([
  ["versions", (supabase, id) => supabase.from("app_versions").select("id,version_no,specification,change_summary,created_at").eq("app_id", id).order("version_no", { ascending: true })],
  ["backend", (supabase, id, userId) => supabase.from("app_backend_models").select("schema_json,status,updated_at").eq("app_id", id).eq("owner_id", userId).maybeSingle()],
  ["workflows", (supabase, id, userId) => supabase.from("app_workflows").select("name,trigger_type,trigger_config,actions,enabled,created_at,updated_at").eq("app_id", id).eq("owner_id", userId)],
  ["assets", (supabase, id, userId) => supabase.from("project_assets").select("asset_id,suggested_page,suggested_role,placement_reason,created_at").eq("app_id", id).eq("owner_id", userId)],
  ["integrations", (supabase, id, userId) => supabase.from("project_integrations").select("integration_type,display_name,enabled,config,updated_at").eq("app_id", id).eq("owner_id", userId)],
  ["offers", (supabase, id, userId) => supabase.from("monetization_offers").select("name,description,amount,currency,billing_mode,enabled,created_at").eq("app_id", id).eq("owner_id", userId)],
  ["memory", (supabase, id, userId) => supabase.from("project_memory").select("memory_json,learning_scope,updated_at").eq("app_id", id).eq("owner_id", userId).maybeSingle()],
]);

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: app, error: appError } = await supabase.from("apps").select("id,name,description,created_at,updated_at,current_version_id,visibility,publish_status").eq("id", id).eq("owner_id", user.id).single();
    if (appError || !app) return NextResponse.json({ error: "Project not found." }, { status: 404 });

    const queryResults = await Promise.all(SOURCE_QUERIES.map(async ([key, query]) => {
      const result = await query(supabase, id, user.id);
      return { key, ...result };
    }));
    const failedSources = queryResults.filter((result) => result.error).map((result) => result.key);
    if (failedSources.length) {
      console.error("PROJECT_EXPORT_INCOMPLETE", { projectId: id, failedSources });
      return NextResponse.json({
        error: "The project export was stopped because one or more sections could not be verified. Nothing incomplete was downloaded.",
        retryable: true,
        failedSections: failedSources,
      }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }

    const sources = Object.fromEntries(queryResults.map((result) => [result.key, result.data]));
    sources.sourceComplete = true;
    const { payload, audit } = buildProjectExport({ app, sources });
    if (!audit.passed || audit.score !== PROJECT_EXPORT_SCORE_REQUIRED) {
      console.error("PROJECT_EXPORT_QUALITY_BLOCKED", { projectId: id, score: audit.score, checks: audit.checks.filter((check) => !check.passed).map((check) => check.id) });
      return NextResponse.json({
        error: `Export is locked until the portable project package reaches ${PROJECT_EXPORT_SCORE_REQUIRED}/100.`,
        audit,
      }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }

    const digest = crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
    const exportPayload = { ...payload, integrity: { ...audit, algorithm: "sha256", digest } };
    const safeName = String(app.name || "project").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 80) || "project";
    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}-LANERIQ-AI-export.json"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-LANERIQ-Export-Quality": String(audit.score),
      },
    });
  } catch (error) {
    console.error("PROJECT_EXPORT_ERROR", error);
    return NextResponse.json({ error: "Unable to export this project." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
