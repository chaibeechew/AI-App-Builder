// Produces structured, renderer-friendly explanation content for every generated app.
export function buildAppExplanation(spec) {
  const pages = Array.isArray(spec?.pages) ? spec.pages : [];
  const features = Array.isArray(spec?.features) ? spec.features : [];
  const actions = Array.isArray(spec?.actions) ? spec.actions : [];
  return {
    title: spec?.name || "Generated App",
    summary: spec?.description || "AI-generated application",
    sections: [
      { key: "overview", title: "How this app works", body: spec?.description || "Your app structure was generated from your requirements." },
      { key: "pages", title: "Pages", items: pages.map((p) => ({ name: p?.name || "Page", route: p?.route || "/", description: p?.description || "" })) },
      { key: "features", title: "Features", items: features.map((f) => typeof f === "string" ? { name: f } : { name: f?.name || f?.title || "Feature", description: f?.description || "" }) },
      { key: "actions", title: "User flow", items: actions.map((a) => typeof a === "string" ? { name: a } : { name: a?.name || a?.label || "Action", description: a?.description || "" }) },
    ],
    diagram: {
      nodes: pages.map((p, i) => ({ id: p?.id || `page-${i + 1}`, label: p?.name || `Page ${i + 1}`, route: p?.route || "/" })),
      edges: pages.slice(1).map((p, i) => ({ from: pages[i]?.id || `page-${i + 1}`, to: p?.id || `page-${i + 2}` })),
    },
  };
}
