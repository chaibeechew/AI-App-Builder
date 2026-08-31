export const PRO_MODE = Object.freeze({
  id: "professional",
  name: "Professional Mode",
  tagline: "Advanced control with AI assistance.",
  principle: "Tell AI what you want changed; use manual controls only when you want deeper control.",
  pricingPolicy: "preserve_existing_10_usd_user_conditions",
  sameProjectAsStandard: true,
  aiFirst: true,
  categories: [
    {
      id: "design",
      name: "Pro Design",
      description: "Refine layout, branding, responsive behavior, media and video while AI protects consistency.",
      tools: ["Visual Editor", "Brand Kit", "Asset Library", "Video Studio", "Responsive Preview"]
    },
    {
      id: "logic",
      name: "Pro Logic",
      description: "Control data, forms, CRM, workflows, integrations and monetization without exposing infrastructure.",
      tools: ["Database Builder", "Workflow Automation", "Integration Center", "Monetization", "Project Memory"]
    },
    {
      id: "release",
      name: "Pro Release",
      description: "Inspect quality, versions, analytics and publishing readiness before release.",
      tools: ["Quality Gate", "Version History", "AI Operations", "Analytics", "Publishing Center", "Export & Ownership"]
    }
  ],
  aiQuickActions: [
    "Make the whole app look more premium and consistent without changing the business logic.",
    "Check this project for broken flows, missing screens and confusing user journeys, then fix the safe issues.",
    "Improve the mobile experience while preserving the desktop design.",
    "Simplify the customer journey and reduce unnecessary steps.",
    "Review forms, workflows and data fields for missing validation or duplicated steps.",
    "Improve accessibility, readability and visual hierarchy without changing the brand identity.",
    "Prepare this project for release and tell me what still needs external setup or real-device testing."
  ]
});

export function getProToolGroups(appId) {
  return [
    {
      name: "Pro Design",
      items: [
        { name: "AI Visual Editor", href: `/editor/${appId}`, note: "Tell AI what to change or edit individual areas." },
        { name: "Video Studio", href: "/video-studio", note: "Realistic, cartoon and mixed video workflows with server-first rendering." },
        { name: "Brand Kit", href: "/brand-kit", note: "Keep logo, colors, typography and tone consistent." },
        { name: "Asset Library", href: "/asset-library", note: "Private project media with intelligent placement." }
      ]
    },
    {
      name: "Pro Logic",
      items: [
        { name: "Database Builder", href: `/database/${appId}`, note: "Review data groups, relationships and permissions." },
        { name: "Workflow Automation", href: `/workflows/${appId}`, note: "Build CRM, order, appointment and follow-up flows." },
        { name: "Integration Center", href: `/integrations/${appId}`, note: "Managed connections stay hidden behind customer-friendly controls." },
        { name: "Monetization", href: `/monetization/${appId}`, note: "Configure offers and checkout readiness." }
      ]
    },
    {
      name: "Pro Release",
      items: [
        { name: "AI Operations", href: `/operations/${appId}`, note: "Inspect project health, workflow failures and integration readiness." },
        { name: "Analytics", href: `/analytics/${appId}`, note: "Review privacy-minimized usage signals." },
        { name: "Version History", href: `/app-dashboard/${appId}/versions`, note: "Restore earlier versions without destructive overwrites." },
        { name: "Publishing Center", href: `/release/${appId}`, note: "Review Web, PWA, mobile and domain readiness." }
      ]
    }
  ];
}
