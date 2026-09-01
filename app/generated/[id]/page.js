import { redirect } from "next/navigation";

// Preserve old shared links while keeping one canonical, premium generated-App runtime.
export default async function LegacyGeneratedApp({ params }) {
  const { id } = await params;
  redirect(`/a/${encodeURIComponent(id)}`);
}
