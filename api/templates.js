import {
  ARCHETYPES,
  INDUSTRIES,
  STYLES,
  TEMPLATE_CATALOG_STATS,
  findTemplateById,
  getTrendingTemplates,
  searchTemplates,
} from "../lib/templateCatalog.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const mode = String(req.query?.mode || "search").toLowerCase();

    if (mode === "meta") {
      return res.status(200).json({
        stats: TEMPLATE_CATALOG_STATS,
        industries: INDUSTRIES,
        archetypes: ARCHETYPES.map(({ id, name }) => ({ id, name })),
        styles: STYLES,
      });
    }

    if (mode === "trending") {
      const templates = getTrendingTemplates(req.query?.limit || 100);
      return res.status(200).json({
        updatedAt: new Date().toISOString(),
        methodology: "SoolenAI seed ranking. Scheduled trend refresh can replace scores without changing template IDs.",
        count: templates.length,
        templates,
      });
    }

    if (mode === "detail") {
      const template = findTemplateById(String(req.query?.id || ""));
      if (!template) return res.status(404).json({ error: "Template not found." });
      return res.status(200).json({ template });
    }

    const result = searchTemplates({
      q: req.query?.q,
      industry: req.query?.industry,
      style: req.query?.style,
      archetype: req.query?.archetype,
      limit: req.query?.limit,
      offset: req.query?.offset,
    });

    return res.status(200).json({
      stats: TEMPLATE_CATALOG_STATS,
      ...result,
    });
  } catch (error) {
    console.error("Template API error:", error);
    return res.status(500).json({ error: "Unable to load templates." });
  }
}
