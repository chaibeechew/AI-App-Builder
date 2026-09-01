import { SEO_INDEXING_ENABLED, SEO_SITE_URL, SEO_SITEMAP_PATHS } from "../lib/seo-foundation.js";

export default function sitemap() {
  if (!SEO_INDEXING_ENABLED || !SEO_SITE_URL) return [];
  const now = new Date();
  return SEO_SITEMAP_PATHS.map(path => ({
    url: `${SEO_SITE_URL}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.8,
  }));
}
