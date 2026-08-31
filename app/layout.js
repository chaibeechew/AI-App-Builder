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
import { PRODUCT_BRAND } from "../lib/ai/premium-visual-policy.js";

export const metadata = {
  title: PRODUCT_BRAND.name,
  description: "Describe, upload or sketch what you want. AI designs, builds, tests and prepares your App + Website for use.",
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
