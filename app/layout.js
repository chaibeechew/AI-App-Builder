import "./globals.css";
import "./landscape-theme.css";
import "./modern-product-theme.css";
import "./backgrounds.css";
import "./premium-journey-theme.css";
import "./home-resilient.css";
import "./home-load-guard.css";
import "./language-runtime.css";
import "./home-reference-layout.css";
import "./home-approved-v2.css";
import "./home-laneriq-v3.css";
import AccountNav from "./components/AccountNav";
import SoolenVoiceAssistant from "./components/SoolenVoiceAssistant";
import ProductCopyFix from "./components/ProductCopyFix";
import ReferenceUploader from "./components/ReferenceUploader";
import StudioLauncher from "./components/StudioLauncher";
import AdaptiveWallpaperEngine from "./components/AdaptiveWallpaperEngine";
import PremiumJourneyTheme from "./components/PremiumJourneyTheme";
import PreciseEditAssistant from "./components/PreciseEditAssistant";
import GeneratedDataManager from "./components/GeneratedDataManager";
import PublishingReadinessMount from "./components/PublishingReadinessMount";
import CreationCapabilityBanner from "./components/CreationCapabilityBanner";
import GameProGate from "./components/GameProGate";
import GameCommercialTermsNotice from "./components/GameCommercialTermsNotice";
import HomeLoadGuard from "./components/HomeLoadGuard";
import LanguageRuntime from "./components/LanguageRuntime";
import AuthFlowGuard from "./components/AuthFlowGuard";
import { PRODUCT_BRAND } from "../lib/product-brand.js";
import { SEO_CORE_KEYWORDS, SEO_INDEXING_ENABLED, SEO_SITE_URL, absoluteSeoUrl, buildOrganizationJsonLd, buildSoftwareJsonLd } from "../lib/seo-foundation.js";

const homeCanonical = absoluteSeoUrl("/");
const googleVerification = String(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "").trim();
const organizationSchema = buildOrganizationJsonLd();
const softwareSchema = buildSoftwareJsonLd();
const discoveryDescription = `${PRODUCT_BRAND.capabilities}. ${PRODUCT_BRAND.tagline} Create apps, games and websites with AI-powered planning, design, building, testing and preview workflows for web, iOS and Android targets.`;
const discoveryTitle = `${PRODUCT_BRAND.name} — AI App, Game & Website Builder`;

const earlyHomeLoadGuard = `(()=>{try{if(location.pathname!=="/"||window.__laneriqEarlyFetchGuard)return;window.__laneriqEarlyFetchGuard=true;const blocked=new Set(["/credits","/my-apps","/templates","/studio","/image-studio"]);let allowPath="",allowUntil=0;addEventListener("click",e=>{try{const a=e.target&&e.target.closest&&e.target.closest("a[href]");if(!a)return;const u=new URL(a.href,location.href);if(u.origin===location.origin&&blocked.has(u.pathname)){allowPath=u.pathname;allowUntil=Date.now()+8000;}}catch{}},true);const original=window.fetch.bind(window);window.fetch=(input,init)=>{try{const raw=typeof input==="string"?input:input&&input.url;const url=new URL(raw||"",location.href);if(url.origin===location.origin&&blocked.has(url.pathname)){const allowed=url.pathname===allowPath&&Date.now()<allowUntil;if(!allowed)return Promise.resolve(new Response(null,{status:204,headers:{"Cache-Control":"no-store"}}));}}catch{}return original(input,init);};}catch{}})();`;

export const metadata = {
  ...(SEO_SITE_URL ? { metadataBase: new URL(SEO_SITE_URL) } : {}),
  title: discoveryTitle,
  description: discoveryDescription,
  applicationName: PRODUCT_BRAND.name,
  category: "technology",
  keywords: SEO_CORE_KEYWORDS,
  robots: { index: SEO_INDEXING_ENABLED, follow: SEO_INDEXING_ENABLED },
  ...(homeCanonical ? { alternates: { canonical: homeCanonical } } : {}),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: PRODUCT_BRAND.name,
    title: discoveryTitle,
    description: discoveryDescription,
    ...(homeCanonical ? { url: homeCanonical } : {}),
  },
  twitter: {
    card: "summary_large_image",
    title: discoveryTitle,
    description: `${PRODUCT_BRAND.tagline} ${PRODUCT_BRAND.capabilities}.`,
  },
  ...(googleVerification ? { verification: { google: googleVerification } } : {}),
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" as="image" href="/02ACE732-9849-4674-8901-E264BCA5C02D.png" fetchPriority="high" />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: earlyHomeLoadGuard }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
        <HomeLoadGuard />
        <LanguageRuntime />
        <AuthFlowGuard />
        <PremiumJourneyTheme />
        <ProductCopyFix />
        <AdaptiveWallpaperEngine />
        <AccountNav />
        <GameProGate />
        <GameCommercialTermsNotice />
        {children}
        <CreationCapabilityBanner />
        <PreciseEditAssistant />
        <GeneratedDataManager />
        <PublishingReadinessMount />
        <StudioLauncher />
        <ReferenceUploader />
        <SoolenVoiceAssistant />
      </body>
    </html>
  );
}
