import { notFound, redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server.js";
import { loadVisibleProject, loadVisibleProjectMedia } from "../../../lib/publishing/public-project-runtime.js";
import { resolveGeneratedRuntime } from "../../../lib/game/game-runtime-router-v1.js";
import { applyGeneratedExperienceStandard } from "../../../lib/design/generated-experience-standard.js";
import GeneratedAppClient from "./GeneratedAppClient";
import GameRuntimeClient from "./GameRuntimeClient";
import MobaRuntimeClient from "./MobaRuntimeClient";
import AirCombatRuntimeClient from "./AirCombatRuntimeClient";
import SpecialistRuntimeClient from "./SpecialistRuntimeClient";
import AdvancedGenreRuntimeClient from "./AdvancedGenreRuntimeClient";
import RemainingGenreRuntimeClient from "./RemainingGenreRuntimeClient";
import AnalyticsTracker from "../../components/AnalyticsTracker.js";

const PROPERTY_CRM_GOLDEN_APP_ID = "bfc4b71f-e0a7-4e4c-bceb-59090eb74bd8";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const visible = await loadVisibleProject({ id, userId: user?.id || null });
  const name = visible?.app?.name || "Generated App";
  const description = visible?.app?.description || "Created with LANERIQ AI";
  return {
    title: `${name} — LANERIQ AI`,
    description,
    manifest: `/a/${id}/manifest.webmanifest`,
    appleWebApp: { capable: true, statusBarStyle: "default", title: name },
  };
}

export default async function GeneratedAppPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams || {};
  const requestedVersionId = String(query?.previewVersion || "").trim();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const visible = await loadVisibleProject({ id, userId: user?.id || null, versionId: requestedVersionId });
  if (!visible) notFound();
  if (visible.isOwner && query?.demo === "1" && query?.surface !== "app") redirect(`/preview/${id}`);

  const { admin, app, version } = visible;
  const media = await loadVisibleProjectMedia(admin, id);
  const experience = applyGeneratedExperienceStandard({ specification: version.specification, app });
  const specification = experience.specification;
  const isGoldenPropertyReference = experience.industry === "property" && (id === PROPERTY_CRM_GOLDEN_APP_ID || /^LANERIQ Property CRM$/i.test(String(app?.name || "").trim()));
  const route = resolveGeneratedRuntime(specification);
  const routedSpecification = route.isGame && route.archetypeOverride
    ? { ...specification, game: { ...(specification.game || {}), archetype: route.archetypeOverride } }
    : specification;

  let runtime;
  switch (route.runtimeId) {
    case "moba-runtime-v1": runtime = <MobaRuntimeClient appId={id} app={app} specification={routedSpecification} customerMedia={media}/>; break;
    case "air-combat-runtime-v1": runtime = <AirCombatRuntimeClient appId={id} app={app} specification={routedSpecification} customerMedia={media}/>; break;
    case "specialist-runtime-v1": runtime = <SpecialistRuntimeClient appId={id} app={app} specification={routedSpecification} customerMedia={media}/>; break;
    case "advanced-genre-runtime-v1": runtime = <AdvancedGenreRuntimeClient appId={id} app={app} specification={routedSpecification} customerMedia={media}/>; break;
    case "remaining-genre-runtime-v1": runtime = <RemainingGenreRuntimeClient appId={id} app={app} specification={routedSpecification} customerMedia={media}/>; break;
    case "game-runtime-v1": runtime = <GameRuntimeClient appId={id} app={app} specification={routedSpecification} customerMedia={media}/>; break;
    default: runtime = <GeneratedAppClient appId={id} app={app} specification={specification} customerMedia={media}/>;
  }

  return <div className={`generatedExperience generatedExperience--${experience.industry}`} data-laneriq-standard={experience.standardId} data-theme-mode={specification?.designSystem?.themeMode||"auto"} data-golden-reference={isGoldenPropertyReference?"true":"false"} data-project-version={version.id}><AnalyticsTracker appId={id} channel={route.isGame ? "game" : "app"} eventName={route.eventName}/>{runtime}</div>;
}
