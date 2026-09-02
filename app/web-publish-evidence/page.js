import WebPublishEvidenceClient from "./WebPublishEvidenceClient.js";

export const metadata = {
  title: "Web Publish Evidence — LANERIQ AI",
  description: "Authenticated publish, anonymous public-route and automatic cleanup evidence for LANERIQ AI projects.",
  robots: { index: false, follow: false },
};

export default function WebPublishEvidencePage() {
  return <WebPublishEvidenceClient />;
}
