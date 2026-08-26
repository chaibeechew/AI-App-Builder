import { createClient } from "../../../../lib/supabase/server.js";

function csvCell(value) {
  const text = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Authentication required.", { status: 401 });
    const id = new URL(request.url).searchParams.get("appId");
    if (!id) return new Response("appId is required.", { status: 400 });
    const { data: app } = await supabase.from("apps").select("id,name,current_version_id").eq("id", id).eq("owner_id", user.id).single();
    if (!app) return new Response("App not found.", { status: 404 });
    const { data: version } = await supabase.from("app_versions").select("version_no,specification,created_at").eq("id", app.current_version_id).eq("app_id", id).single();
    if (!version) return new Response("Version not found.", { status: 404 });
    const rows = [["field", "value"], ["app_id", app.id], ["app_name", app.name], ["version", version.version_no], ["created_at", version.created_at]];
    for (const [key, value] of Object.entries(version.specification || {})) rows.push([key, value]);
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${app.id}.csv"`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("CSV_EXPORT_ERROR:", error);
    return new Response("Unable to export CSV.", { status: 500 });
  }
}
