import "./globals.css";
import "./landscape-theme.css";
import "./modern-product-theme.css";
import "./backgrounds.css";
import "./premium-journey-theme.css";
import "./home-resilient.css";
import "./home-load-guard.css";
import "./language-runtime.css";
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
import { PRODUCT_BRAND } from "../lib/product-brand.js";
import { SEO_CORE_KEYWORDS, SEO_INDEXING_ENABLED, SEO_SITE_URL, absoluteSeoUrl, buildOrganizationJsonLd, buildSoftwareJsonLd } from "../lib/seo-foundation.js";

const homeCanonical = absoluteSeoUrl("/");
const googleVerification = String(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "").trim();
const organizationSchema = buildOrganizationJsonLd();
const softwareSchema = buildSoftwareJsonLd();
const discoveryDescription = `${PRODUCT_BRAND.capabilities}. ${PRODUCT_BRAND.tagline} Create apps, games and websites with AI-powered planning, design, building, testing and preview workflows for web, iOS and Android targets.`;
const discoveryTitle = `${PRODUCT_BRAND.name} — AI App, Game & Website Builder`;

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
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />
        <HomeLoadGuard />
        <LanguageRuntime />
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
