import { NextResponse } from "next/server";
import {
  ARCHETYPES,
  INDUSTRIES,
  STYLES,
  TEMPLATE_CATALOG_STATS,
  findTemplateById,
  getTrendingTemplates,
  searchTemplates,
} from "../../../lib/templateCatalog.js";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

function json(body, init = {}) {
  return NextResponse.json(body, { ...init, headers: { ...NO_STORE, ...(init.headers || {}) } });
}

function bounded(value, max) {
  return String(value || "").trim().slice(0, max);
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const mode = bounded(url.searchParams.get("mode"), 20).toLowerCase();
    const id = bounded(url.searchParams.get("id"), 140);

    if (mode === "meta") {
      return json({
        success: true,
        stats: TEMPLATE_CATALOG_STATS,
        industries: INDUSTRIES,
        archetypes: ARCHETYPES.map(({ id: archetypeId, name }) => ({ id: archetypeId, name })),
        styles: STYLES,
      });
    }

    if (id) {
      const template = findTemplateById(id);
      if (!template) return json({ error: "Template not found.", code: "TEMPLATE_NOT_FOUND" }, { status: 404 });
      return json({ success: true, template });
    }

    const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit")) || 24, 100));
    if (mode === "trending") {
      const templates = getTrendingTemplates(limit);
      return json({ success: true, templates, total: templates.length, limit, offset: 0 });
    }

    const result = searchTemplates({
      q: bounded(url.searchParams.get("q"), 120),
      industry: bounded(url.searchParams.get("industry"), 80),
      style: bounded(url.searchParams.get("style"), 80),
      archetype: bounded(url.searchParams.get("archetype"), 80),
      limit,
      offset: Math.max(0, Number(url.searchParams.get("offset")) || 0),
    });

    return json({ success: true, ...result });
  } catch (error) {
    console.error("TEMPLATE_API_ERROR", error);
    return json({ error: "Unable to load templates." }, { status: 500 });
  }
}
