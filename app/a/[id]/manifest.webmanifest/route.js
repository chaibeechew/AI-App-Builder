import { createClient } from "../../../../lib/supabase/server.js";
import { loadVisibleProject } from "../../../../lib/publishing/public-project-runtime.js";

export async function GET(_request, { params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const visible = await loadVisibleProject({ id, userId: user?.id || null });

  if (!visible) {
    return Response.json({ error: "Not found." }, {
      status: 404,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  }

  const { app, isPublished } = visible;
  const shortName = String(app.name || "My App").slice(0, 28);
  const description = String(app.description || "Created with LANERIQ AI").slice(0, 180);

  return Response.json({
    name: app.name || "LANERIQ AI Generated App",
    short_name: shortName,
    description,
    start_url: `/a/${id}`,
    scope: `/a/${id}`,
    display: "standalone",
    background_color: "#eef5f1",
    theme_color: "#12664f",
    orientation: "portrait",
  }, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": isPublished ? "public, max-age=300" : "private, no-store, max-age=0",
    },
  });
}
