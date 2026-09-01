import { PRODUCT_BRAND } from "./product-brand.js";

const rawSiteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/+$/, "");
export const SEO_SITE_URL = /^https:\/\/[a-z0-9.-]+(?::\d+)?(?:\/.*)?$/i.test(rawSiteUrl) ? rawSiteUrl : "";
export const SEO_INDEXING_ENABLED = process.env.NEXT_PUBLIC_SEO_INDEXING_ENABLED === "true" && Boolean(SEO_SITE_URL);

export const SEO_CORE_KEYWORDS = Object.freeze([
  "app builder with AI",
  "AI game builder",
  "AI website builder",
  "AI app creator",
  "AI game creator",
  "create app with AI",
  "create game with AI",
  "create website with AI",
  "build apps with AI",
  "AI build game",
  "no code app creation with AI",
  "AI mobile app builder",
  "AI app game website builder",
]);

const brand = PRODUCT_BRAND.name;

export const SEO_PAGES = Object.freeze({
  "ai-app-game-website-builder": {
    path: "/ai-app-game-website-builder",
    primaryKeyword: "AI app game website builder",
    title: `AI App, Game & Website Builder — Build with AI | ${brand}`,
    description: `Create apps, playable games and responsive websites from one idea with ${brand}. Plan, build, test and preview from one AI creation workspace.`,
    eyebrow: "APPS • GAMES • WEB",
    heading: "One AI Builder for Apps, Games and Websites",
    intro: `${brand} turns a natural-language idea into a structured product plan and routes it into the right creation workflow—app, game or website—without forcing every project into the same template.`,
    benefits: ["One idea can become an app, game or website", "AI planning before generation", "Self-check and repair before preview", "Mobile-first creation with web preview"],
    examples: ["Customer and business apps", "Playable mobile game foundations", "Responsive business and product websites", "Hybrid projects that need more than one format"],
    faq: [
      [`Can ${brand} create all three product types?`, "Yes. The platform has separate app, game and website creation paths while sharing planning, design, testing and preview foundations."],
      ["Does one prompt force the same design on every project?", "No. The creation plan adapts to the requested industry, genre, functionality and visual direction."],
      ["Is production publishing automatic?", "No. Preview and readiness can be automated, while live providers, store approval and production release remain evidence-gated."],
    ],
    ctaHref: "/create",
    ctaLabel: "Create from one idea",
  },
  "ai-app-builder": {
    path: "/ai-app-builder",
    primaryKeyword: "app builder with AI",
    title: `Create Apps with AI | ${brand}`,
    description: `Build mobile-first apps from natural language with ${brand}. Generate pages, data, workflows, design and a testable preview with AI-assisted self-check and repair.`,
    eyebrow: "APP CREATION WITH AI",
    heading: "Turn One Idea into a Working App Foundation",
    intro: `Describe the people, workflow and outcome you need. ${brand} plans the product structure, generates the experience and checks the result before presenting a preview.`,
    benefits: ["Natural-language app planning", "Pages, data and workflow foundations", "AI precise editing without code", "Version recovery and self-heal checks"],
    examples: ["CRM and sales apps", "Booking and appointment apps", "Operations and internal tools", "Customer portals and service apps"],
    faq: [
      ["Do I need to code?", "No. The primary workflow is no-code and natural-language driven, with structured editing controls for precise changes."],
      ["Can I create mobile apps?", "The builder is mobile-first and prepares iOS and Android targets while providing a fast web preview path."],
      ["Can it connect live services?", "Provider-backed services are readiness-gated and only become live when an approved provider is actually connected and verified."],
    ],
    ctaHref: "/create",
    ctaLabel: "Build an app with AI",
  },
  "ai-game-builder": {
    path: "/ai-game-builder",
    primaryKeyword: "AI game builder",
    title: `AI Game Builder — Create Playable Games with AI | ${brand}`,
    description: `Create playable mobile game foundations with AI. ${brand} supports 2D and 3D runtime paths, touch controls, game loops, progression, save systems and automated playtesting.`,
    eyebrow: "AI GAME BUILDER",
    heading: "Describe a Game. Build a Playable Foundation.",
    intro: `${brand} understands game genre, interaction scale, world, progression and runtime needs, then routes the idea to a specialist game creation path instead of treating games like ordinary websites.`,
    benefits: ["Genre-aware game planning", "2D and 3D runtime paths", "Touch controls, save and lifecycle contracts", "Automated gameplay and regression checks"],
    examples: ["RPG and action games", "Puzzle and strategy games", "Racing and simulation games", "MOBA and air-combat training runtimes"],
    faq: [
      ["Can the AI create a playable game?", "Yes, supported game ideas can be routed into playable preview runtimes rather than only producing a design document."],
      ["Does it support online multiplayer?", "Authoritative multiplayer architecture is supported, but live networking is only claimed when real transport, matchmaking and load evidence are connected."],
      ["Can it publish directly to stores?", "Store readiness can be prepared, but signed native binaries and official store approval require external evidence."],
    ],
    ctaHref: "/game-builder",
    ctaLabel: "Create a game with AI",
  },
  "ai-website-builder": {
    path: "/ai-website-builder",
    primaryKeyword: "AI website builder",
    title: `AI Website Builder — Create Websites with AI | ${brand}`,
    description: `Create responsive websites from one idea with ${brand}. Generate structure, visual direction, calls to action and mobile-friendly pages with AI-assisted testing.`,
    eyebrow: "AI WEBSITE BUILDER",
    heading: "Create a Responsive Website from Natural Language",
    intro: `Start with the business, audience and goal—not a blank template. ${brand} turns those requirements into a structured website experience with responsive design and clear conversion paths.`,
    benefits: ["Audience and goal-aware page planning", "Responsive mobile-first layouts", "Visual direction and content hierarchy", "Preview, testing and iterative AI edits"],
    examples: ["Business websites", "Product launch sites", "Property and service websites", "Creator and portfolio experiences"],
    faq: [
      ["Can I use my own visual direction?", "Yes. Customer color, style and reference intent can guide the generated design without copying source assets."],
      ["Does it work on mobile?", "Responsive behavior and mobile readability are part of the creation quality checks."],
      ["Can I edit individual sections?", "Yes. The precise editor supports page, section and element targeting for natural-language changes."],
    ],
    ctaHref: "/create",
    ctaLabel: "Create a website with AI",
  },
  "create-app-with-ai": {
    path: "/create-app-with-ai",
    primaryKeyword: "create app with AI",
    title: `Create an App with AI — From Idea to Preview | ${brand}`,
    description: `Learn how to create an app with AI using ${brand}: describe your idea, let AI plan the structure, generate the product, self-check it and open a working preview.`,
    eyebrow: "CREATE APP WITH AI",
    heading: "How to Create an App with AI from One Idea",
    intro: `The fastest path is to describe the user, problem and result you want. ${brand} handles planning, generation and quality checks while keeping precise edits available when you need them.`,
    benefits: ["1. Describe the user and goal", "2. AI plans pages, data and features", "3. Generate and self-check the app", "4. Preview, edit and recover versions"],
    examples: ["Describe a property CRM", "Create a booking workflow", "Build a customer service portal", "Turn an internal spreadsheet process into an app concept"],
    faq: [
      ["What should I put in the prompt?", "Include who will use the app, what they need to accomplish, essential features and the visual feeling you want."],
      ["Can I change the result after generation?", "Yes. You can use natural-language editing and target specific pages, sections and elements."],
      ["What happens if generation has a problem?", "The shared generation flow includes self-check and bounded repair before accepting a candidate version."],
    ],
    ctaHref: "/create",
    ctaLabel: "Create my app",
  },
  "create-game-with-ai": {
    path: "/create-game-with-ai",
    primaryKeyword: "create game with AI",
    title: `Create a Game with AI — Idea to Playable Preview | ${brand}`,
    description: `Create a game with AI from a natural-language idea. ${brand} plans genre, controls, game loop, progression and runtime before building a playable preview foundation.`,
    eyebrow: "CREATE GAME WITH AI",
    heading: "How to Create a Game with AI and Open It to Play",
    intro: `Describe the genre, player action, win condition and progression. ${brand} uses specialist game planning and runtime routing to turn the idea into a testable gameplay foundation.`,
    benefits: ["1. Describe genre and core loop", "2. AI plans controls, progression and runtime", "3. Build the specialist gameplay path", "4. Run automated playtests and open preview"],
    examples: ["Portrait action RPG", "Puzzle game with hint and undo", "Three-lane MOBA training game", "Mobile racing challenge"],
    faq: [
      ["Do I need a game engine?", `The ${brand} workflow provides its own preview runtime paths for supported game types, so the user starts from the idea rather than engine setup.`],
      ["Can it make 3D games?", "The platform includes 3D gameplay and world-system foundations, while final production renderer and real-device performance claims require measured evidence."],
      ["How is gameplay tested?", "Deterministic runtime tests, regression gates and real-game end-to-end scenarios are used to catch routing and gameplay-loop failures."],
    ],
    ctaHref: "/game-builder",
    ctaLabel: "Create my game",
  },
  "mobile-app-builder": {
    path: "/mobile-app-builder",
    primaryKeyword: "AI mobile app builder",
    title: `AI Mobile App Builder for iOS & Android | ${brand}`,
    description: `Build mobile-first app foundations with AI for iOS and Android targets. ${brand} plans touch UX, safe areas, lifecycle behavior, accessibility and responsive preview workflows.`,
    eyebrow: "AI MOBILE APP BUILDER",
    heading: "Build for Mobile First, Then Validate the Real Device",
    intro: `${brand} treats mobile behavior as a product requirement, not a desktop layout shrunk to fit. Touch targets, safe areas, lifecycle recovery and responsive layouts are part of the readiness model.`,
    benefits: ["Mobile-first layout planning", "Touch and safe-area awareness", "Pause, resume and save expectations", "iOS and Android target readiness"],
    examples: ["Customer service apps", "Field and operations apps", "Mobile CRM experiences", "Playable mobile game interfaces"],
    faq: [
      [`Does ${brand} produce signed iOS or Android binaries automatically?`, "No production claim is made without signed native build evidence. The builder prepares targets and validates what can be verified internally."],
      ["Does it test touch UX?", "Touch-target, pointer-cancel and mobile runtime contracts are part of internal quality gates, with real-device testing still required before production claims."],
      ["Can I preview before native packaging?", "Yes. The workflow prioritizes a fast web preview so product behavior can be checked before external native release steps."],
    ],
    ctaHref: "/create",
    ctaLabel: "Build a mobile app",
  },
  "no-code-ai-builder": {
    path: "/no-code-ai-builder",
    primaryKeyword: "no code app creation with AI",
    title: `No-Code AI Builder for Apps, Games & Web | ${brand}`,
    description: `Create apps, games and websites without starting from code. ${brand} combines natural-language creation, precise editing, data, automation, media and preview workflows.`,
    eyebrow: "NO-CODE AI BUILDER",
    heading: "Build with Natural Language Instead of Starting with Code",
    intro: `${brand} is designed for people who want to describe outcomes, review the result and make precise changes without manually assembling a software stack for every idea.`,
    benefits: ["Natural-language generation", "Page, section and element precise editing", "Owner-scoped data and automation foundations", "Image, video and publishing-readiness workflows"],
    examples: ["Entrepreneur prototypes", "Small-business systems", "Internal operational tools", "Creative app, game and web concepts"],
    faq: [
      ["Is it completely no-code?", "The customer creation path is designed to be no-code. Advanced engineering can still exist behind the platform without being required from the customer."],
      ["Can I undo AI changes?", "Version history and rollback contracts are part of the product foundation."],
      ["Can AI fix problems itself?", "Generate and Modify use a shared self-check and bounded self-heal process before a candidate version is accepted."],
    ],
    ctaHref: "/create",
    ctaLabel: "Start creating without code",
  },
});

export const SEO_SITEMAP_PATHS = Object.freeze(["/", ...Object.values(SEO_PAGES).map(page => page.path)]);

export function absoluteSeoUrl(path = "/") {
  if (!SEO_SITE_URL) return undefined;
  return `${SEO_SITE_URL}${path === "/" ? "" : path}`;
}

export function buildSeoMetadata(slug) {
  const page = SEO_PAGES[slug];
  if (!page) throw new Error(`Unknown SEO page: ${slug}`);
  const canonical = absoluteSeoUrl(page.path);
  return {
    title: page.title,
    description: page.description,
    keywords: [page.primaryKeyword, ...SEO_CORE_KEYWORDS],
    ...(canonical ? { alternates: { canonical } } : {}),
    robots: { index: SEO_INDEXING_ENABLED, follow: SEO_INDEXING_ENABLED },
    openGraph: {
      type: "website",
      siteName: PRODUCT_BRAND.name,
      title: page.title,
      description: page.description,
      ...(canonical ? { url: canonical } : {}),
    },
    twitter: { card: "summary_large_image", title: page.title, description: page.description },
  };
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: PRODUCT_BRAND.name,
    description: `${PRODUCT_BRAND.capabilities}. ${PRODUCT_BRAND.tagline}`,
    ...(SEO_SITE_URL ? { url: SEO_SITE_URL } : {}),
  };
}

export function buildSoftwareJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: PRODUCT_BRAND.name,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web, iOS, Android",
    description: "AI creation platform for building apps, playable game foundations and responsive websites from natural-language ideas.",
    featureList: ["App creation with AI", "AI game builder", "AI website builder", "No-code precise editing", "AI self-check and repair", "Mobile-first preview workflows"],
    ...(SEO_SITE_URL ? { url: SEO_SITE_URL } : {}),
  };
}
