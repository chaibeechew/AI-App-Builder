import "./globals.css";
import "./landscape-theme.css";
import "./modern-product-theme.css";
import AccountNav from "./components/AccountNav";
import SoolenVoiceAssistant from "./components/SoolenVoiceAssistant";

export const metadata = {
  title: "AI App Builder",
  description: "Create powerful apps with Soolen AI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AccountNav />
        {children}
        <SoolenVoiceAssistant />
      </body>
    </html>
  );
}
