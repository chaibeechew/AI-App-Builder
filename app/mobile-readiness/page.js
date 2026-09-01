import MobileReadinessClient from "./MobileReadinessClient";

export const metadata = {
  title: "Mobile Readiness — LANERIQ AI",
  description: "Permission-free mobile browser diagnostics for LANERIQ AI real-device readiness.",
  robots: { index: false, follow: false },
};

export default function MobileReadinessPage() {
  return <MobileReadinessClient />;
}
