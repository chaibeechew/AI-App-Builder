export async function GET(_request, { params }) {
  const { id } = await params;
  return Response.json({
    name: "AI Generated App",
    short_name: "My App",
    description: "Created with LANERIQ AI",
    start_url: `/a/${id}`,
    scope: `/a/${id}`,
    display: "standalone",
    background_color: "#eef5f1",
    theme_color: "#12664f",
    orientation: "portrait",
  }, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=300",
    },
  });
}