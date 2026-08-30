import "./globals.css";
import "./landscape-theme.css";
import "./modern-product-theme.css";
import "./backgrounds.css";
import AccountNav from "./components/AccountNav";
import SoolenVoiceAssistant from "./components/SoolenVoiceAssistant";
import ProductCopyFix from "./components/ProductCopyFix";
import ReferenceUploader from "./components/ReferenceUploader";

export const metadata = {
  title: "AI App Builder",
  description: "Describe, upload or sketch what you want. AI plans, builds, tests and prepares your App + Website for use.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ProductCopyFix />
        <AccountNav />
        {children}
        <ReferenceUploader />
        <SoolenVoiceAssistant />
      </body>
    </html>
  );
}
