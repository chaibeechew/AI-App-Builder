import ProductionE2EClient from "./ProductionE2EClient";

export const metadata = {
  title: "Production E2E Evidence — LANERIQ AI",
  description: "Authenticated evidence checks for persisted LANERIQ AI App and Website projects.",
  robots: { index: false, follow: false },
};

export default function ProductionE2EPage() {
  return <ProductionE2EClient />;
}
