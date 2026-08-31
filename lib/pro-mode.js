export const PRO_MODE = Object.freeze({
  id: "professional",
  name: "Professional Mode",
  tagline: "Advanced control with AI assistance.",
  principle: "Tell AI what you want changed; use deeper controls only when you want exact control.",
  pricingPolicy: "standard_usd_10_one_time_pro_usd_68_365_days_fair_price_fair_use",
  pricingTerms: {
    standardUsd: 10,
    standardBilling: "one_time",
    professionalUsd: 68,
    professionalAccessDays: 365,
    professionalAutoRenew: false,
    priceReviewIntervalYears: 3,
    priceIncreaseOptional: true,
  },
  gameCreator: {
    enabled: true,
    accessTier: "professional",
    customerPolicy: "Fair Price · Fair Use",
    normalGenuineUseIncluded: true,
    noSurprisePerClickCharges: true,
    runtime: "playable_2d_vertical_slice_v1",
    targetPlatforms: ["ios", "android", "web-preview"],
    upgradePath: ["advanced-2d", "3d", "multiplayer"],
  },
  qualityPolicy: "standard_and_pro_share_the_same_premium_quality_floor",
  qualityParity: {
    standardUsersReceivePremiumDesign: true,
    professionalModeDoesNotUnlockBasicQuality: true,
    professionalModeUnlocksDeeperControl: true,
    premiumBackgroundsAndOriginalLayoutsForAllEligibleBuilds: true,
    stabilitySecurityPrivacyApplyToAllModes: true
  },
  sameProjectAsStandard: true,
  aiFirst: true,
  categories: [
    {
      id: "game",
      name: "Pro Game Creator",
      description: "Turn a game idea into a playable 2D mobile-game Vertical Slice with Fair Price · Fair Use access.",
      tools: ["Game Builder", "AI Art Generator", "AI Video Generator", "AI Photo & Video Generator", "AI Avatar Creator"]
    },
    {
      id: "design",
      name: "Pro Design",
      description: "Refine layout, branding, responsive behavior, media and video while AI protects consistency.",
      tools: ["AI Visual Editor", "Brand Kit", "Media Library", "Video Studio", "Responsive Preview"]
    },
    {
      id: "logic",
      name: "Pro Logic",
      description: "Control customer data, forms, CRM, automations, connections and payments without exposing infrastructure.",
      tools: ["Customer Data", "Automations", "Connections", "Payments & Offers", "Project Memory"]
    },
    {
      id: "release",
      name: "Pro Release",
      description: "Inspect quality, versions, analytics and publishing readiness before release.",
      tools: ["Quality Check", "Undo / Versions", "AI Health Check", "Analytics", "Publishing Center", "Export & Ownership"]
    }
  ],
  aiQuickActions: [
    "Create a playable 2D mobile-game Vertical Slice from my game idea with touch controls, physics/collision, player/enemy, levels, score/health, save/load, audio and pause/restart.",
    "Make the whole App + Website look more premium and consistent without changing the business logic.",
    "Check this project for broken flows, missing screens and confusing customer journeys, then fix the safe issues.",
    "Improve the iPhone and Android experience while preserving the desktop Website design.",
    "Simplify the customer journey and reduce unnecessary steps.",
    "Review forms, automations and customer data for missing validation or duplicated steps.",
    "Improve accessibility, readability and visual hierarchy without changing the brand identity.",
    "Prepare this project for publishing and tell me what still needs customer confirmation or external setup."
  ]
});

export function getProToolGroups(appId) {
  return [
    {
      name: "Pro Game Creator",
      items: [
        { name: "Game Builder", href: "/game-builder", note: "Create a playable 2D Vertical Slice for iOS + Android targets under Fair Price · Fair Use." },
        { name: "AI Art Generator", href: "/image-studio?mode=create", note: "Create original characters, environments, props, icons and game artwork." },
        { name: "AI Video Generator", href: "/video-studio", note: "Create trailers, promos and animated game concepts." },
        { name: "AI Avatar Creator", href: "/avatar-studio", note: "Create player avatars, NPC concepts, mascots and profile characters." }
      ]
    },
    {
      name: "Pro Design",
      items: [
        { name: "AI Visual Editor", href: `/editor/${appId}`, note: "Tell AI what to change or refine individual areas." },
        { name: "Video Studio", href: "/video-studio", note: "Create and connect realistic, cartoon and mixed video clips." },
        { name: "Brand Kit", href: "/brand-kit", note: "Keep logo, colors, typography and tone consistent." },
        { name: "Media Library", href: "/asset-library", note: "Keep private project images, video and files organized." }
      ]
    },
    {
      name: "Pro Logic",
      items: [
        { name: "Customer Data", href: `/database/${appId}`, note: "Review information groups, relationships, privacy and undo points." },
        { name: "Automations", href: `/workflows/${appId}`, note: "Build enquiry, order, appointment and follow-up flows." },
        { name: "Connections", href: `/integrations/${appId}`, note: "Manage Email, SMS, WhatsApp, Calendar, Maps and other connections." },
        { name: "Payments & Offers", href: `/monetization/${appId}`, note: "Create customer offers and test checkout readiness." }
      ]
    },
    {
      name: "Pro Release",
      items: [
        { name: "AI Health Check", href: `/operations/${appId}`, note: "Inspect project health, automation failures and connection readiness." },
        { name: "Analytics", href: `/analytics/${appId}`, note: "Review privacy-minimized usage signals." },
        { name: "Undo / Versions", href: `/app-dashboard/${appId}/versions`, note: "Restore earlier versions without destructive overwrites." },
        { name: "Publishing Center", href: `/release/${appId}`, note: "Review Website, PWA, mobile and domain readiness." }
      ]
    }
  ];
}
