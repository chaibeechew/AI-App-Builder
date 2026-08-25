import "./globals.css";

export const metadata = {
  title: "AI App Builder",
  description: "Create powerful apps with AI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}