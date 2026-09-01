// SoolenAI / LANERIQ AI — scalable industry template catalog.
// 50 industries × 12 app archetypes × 5 visual styles = 3,000 templates.

export const INDUSTRIES = [
  "Real Estate", "Restaurant", "Retail", "E-commerce", "Healthcare",
  "Education", "Logistics", "Automotive", "Hotel & Hospitality", "Finance",
  "Construction", "Beauty & Spa", "Fitness", "Legal", "Manufacturing",
  "Agriculture", "Travel", "Insurance", "Accounting", "Consulting",
  "Property Management", "Interior Design", "Architecture", "Home Services", "Cleaning Services",
  "Security", "Events", "Wedding", "Photography", "Media",
  "Creator Economy", "Nonprofit", "Community", "Government Services", "Recruitment",
  "Human Resources", "SaaS", "AI Services", "IT Services", "Cybersecurity",
  "Telecommunications", "Energy", "Solar", "Food Delivery", "Grocery",
  "Pet Services", "Childcare", "Senior Care", "Sports", "Entertainment"
];

export const ARCHETYPES = [
  { id: "booking", name: "Booking & Reservations", pages: ["Home", "Services", "Availability", "Booking", "Confirmation"], features: ["Availability calendar", "Customer booking", "Notifications", "Admin schedule"] },
  { id: "crm", name: "CRM & Customer Management", pages: ["Dashboard", "Customers", "Leads", "Tasks", "Reports"], features: ["Customer records", "Lead pipeline", "Task tracking", "Notes", "Reporting"] },
  { id: "marketplace", name: "Marketplace", pages: ["Home", "Browse", "Listing", "Messages", "Account"], features: ["Listings", "Search and filters", "Messaging", "Favorites", "Profiles"] },
  { id: "store", name: "Online Store", pages: ["Home", "Catalog", "Product", "Cart", "Checkout"], features: ["Product catalog", "Cart", "Checkout", "Orders", "Promotions"] },
  { id: "directory", name: "Directory & Listings", pages: ["Home", "Directory", "Detail", "Map", "Submit"], features: ["Directory search", "Categories", "Map", "Listing submission", "Reviews"] },
  { id: "operations", name: "Operations Dashboard", pages: ["Dashboard", "Jobs", "Team", "Assets", "Reports"], features: ["Job tracking", "Team assignments", "Status workflow", "Asset tracking", "Analytics"] },
  { id: "membership", name: "Membership Portal", pages: ["Home", "Member Area", "Resources", "Events", "Profile"], features: ["Member accounts", "Access control", "Resources", "Events", "Member directory"] },
  { id: "learning", name: "Learning Platform", pages: ["Home", "Courses", "Lesson", "Progress", "Profile"], features: ["Courses", "Lessons", "Progress tracking", "Quizzes", "Certificates"] },
  { id: "service", name: "Service Business", pages: ["Home", "Services", "Quote", "Projects", "Contact"], features: ["Service catalog", "Quote requests", "Project tracking", "Customer communication"] },
  { id: "inventory", name: "Inventory & Orders", pages: ["Dashboard", "Inventory", "Orders", "Suppliers", "Reports"], features: ["Inventory levels", "Purchase orders", "Supplier records", "Low-stock alerts", "Reporting"] },
  { id: "community", name: "Community & Social", pages: ["Feed", "Groups", "Messages", "Events", "Profile"], features: ["Posts", "Groups", "Messaging", "Events", "Moderation"] },
  { id: "analytics", name: "Analytics & Reporting", pages: ["Overview", "Metrics", "Reports", "Alerts", "Settings"], features: ["KPI dashboard", "Charts", "Custom reports", "Alerts", "Exports"] }
];

export const STYLES = [
  { id: "minimal", name: "Modern Minimal", tags: ["clean", "premium", "fast"] },
  { id: "luxury", name: "Luxury Editorial", tags: ["luxury", "editorial", "high-end"] },
  { id: "glass", name: "Cinematic Glass", tags: ["glassmorphism", "cinematic", "immersive"] },
  { id: "dark-tech", name: "Dark Tech", tags: ["dark", "AI", "futuristic"] },
  { id: "natural", name: "Natural Human", tags: ["warm", "organic", "accessible"] }
];

const TRENDING_STYLE_PRIORITY = ["glass", "minimal", "luxury", "dark-tech", "natural"];
const TRENDING_INDUSTRY_PRIORITY = [
  "AI Services", "Real Estate", "E-commerce", "SaaS", "Restaurant", "Healthcare",
  "Education", "Beauty & Spa", "Fitness", "Travel", "Hotel & Hospitality", "Automotive",
  "Property Management", "Creator Economy", "Finance", "Home Services", "Food Delivery",
  "Recruitment", "Logistics", "Retail"
];

function slugify(value) {
  return String(value).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function templateScore(industry, archetype, style) {
  const industryRank = TRENDING_INDUSTRY_PRIORITY.indexOf(industry);
  const styleRank = TRENDING_STYLE_PRIORITY.indexOf(style.id);
  const archetypeBoost = ["booking", "crm", "store", "service", "marketplace"].includes(archetype.id) ? 12 : 0;
  return 1000 - (industryRank < 0 ? 250 : industryRank * 18) - styleRank * 7 + archetypeBoost;
}

export function buildTemplateCatalog() {
  const templates = [];
  let index = 1;

  for (const industry of INDUSTRIES) {
    for (const archetype of ARCHETYPES) {
      for (const style of STYLES) {
        templates.push({
          id: `tpl-${String(index).padStart(4, "0")}-${slugify(industry)}-${archetype.id}-${style.id}`,
          industry,
          archetype: archetype.name,
          archetypeId: archetype.id,
          style: style.name,
          styleId: style.id,
          title: `${industry} ${archetype.name}`,
          description: `${archetype.name} template for ${industry}, designed in the ${style.name} style.`,
          pages: archetype.pages,
          features: archetype.features,
          styleTags: style.tags,
          score: templateScore(industry, archetype, style),
          source: "SoolenAI Template Engine",
          version: 1
        });
        index += 1;
      }
    }
  }

  return templates;
}

let catalogCache;
export function getTemplateCatalog() {
  if (!catalogCache) catalogCache = buildTemplateCatalog();
  return catalogCache;
}

export function getTrendingTemplates(limit = 100) {
  return [...getTemplateCatalog()]
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, Math.max(1, Math.min(Number(limit) || 100, 100)));
}

export function findTemplateById(id) {
  return getTemplateCatalog().find((template) => template.id === id) || null;
}

export function searchTemplates({ q = "", industry = "", style = "", archetype = "", limit = 24, offset = 0 } = {}) {
  const needle = String(q).trim().toLowerCase();
  const normalizedIndustry = String(industry).trim().toLowerCase();
  const normalizedStyle = String(style).trim().toLowerCase();
  const normalizedArchetype = String(archetype).trim().toLowerCase();

  const filtered = getTemplateCatalog().filter((template) => {
    if (normalizedIndustry && template.industry.toLowerCase() !== normalizedIndustry) return false;
    if (normalizedStyle && template.styleId.toLowerCase() !== normalizedStyle && template.style.toLowerCase() !== normalizedStyle) return false;
    if (normalizedArchetype && template.archetypeId.toLowerCase() !== normalizedArchetype && template.archetype.toLowerCase() !== normalizedArchetype) return false;
    if (!needle) return true;

    return [template.title, template.description, template.industry, template.archetype, template.style, ...template.styleTags]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });

  const safeOffset = Math.max(0, Number(offset) || 0);
  const safeLimit = Math.max(1, Math.min(Number(limit) || 24, 100));

  return {
    total: filtered.length,
    offset: safeOffset,
    limit: safeLimit,
    templates: filtered.slice(safeOffset, safeOffset + safeLimit)
  };
}

export const TEMPLATE_CATALOG_STATS = {
  industries: INDUSTRIES.length,
  archetypes: ARCHETYPES.length,
  styles: STYLES.length,
  templates: INDUSTRIES.length * ARCHETYPES.length * STYLES.length,
  trendingLimit: 100
};
