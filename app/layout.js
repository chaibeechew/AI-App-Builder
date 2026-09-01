import "./globals.css";
import "./landscape-theme.css";
import "./modern-product-theme.css";
import "./backgrounds.css";
import "./premium-journey-theme.css";
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
import { PRODUCT_BRAND } from "../lib/product-brand.js";

export const metadata = {
  title: `${PRODUCT_BRAND.name} — ${PRODUCT_BRAND.capabilities}`,
  description: `${PRODUCT_BRAND.descriptor}. ${PRODUCT_BRAND.tagline} Create apps, games and websites with SoolenAI for iOS, Android and web preview workflows.`,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <PremiumJourneyTheme />
        <ProductCopyFix />
        <AdaptiveWallpaperEngine />
        <AccountNav />
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
