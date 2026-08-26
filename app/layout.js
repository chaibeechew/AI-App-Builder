import "./globals.css";
import "./landscape-theme.css";
import AccountNav from "./components/AccountNav";

export const metadata = {
  title: "AI App Builder",
  description: "Create powerful apps with AI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AccountNav />
        {children}
      </body>
    </html>
  );
}
