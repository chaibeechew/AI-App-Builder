import { SEO_INDEXING_ENABLED, SEO_SITE_URL } from "../lib/seo-foundation.js";

export default function robots() {
  if (!SEO_INDEXING_ENABLED || !SEO_SITE_URL) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/admin/", "/app-dashboard/", "/editor/", "/my-apps/", "/pro/", "/publish/", "/a/", "/website/"],
    }],
    sitemap: `${SEO_SITE_URL}/sitemap.xml`,
    host: SEO_SITE_URL,
  };
}
