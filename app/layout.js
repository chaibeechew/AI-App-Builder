import "./globals.css";
import "./landscape-theme.css";
import "./modern-product-theme.css";
import "./backgrounds.css";
import AccountNav from "./components/AccountNav";
import SoolenVoiceAssistant from "./components/SoolenVoiceAssistant";
import ProductCopyFix from "./components/ProductCopyFix";

export const metadata = {
  title: "AI App Builder",
  description: "Describe the app you want. AI plans, builds, tests and prepares it for use.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ProductCopyFix />
        <AccountNav />
        {children}
        <SoolenVoiceAssistant />
      </body>
    </html>
  );
}
