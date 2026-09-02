import { notFound } from "next/navigation";
import { createClient } from "../../../lib/supabase/server.js";
import { loadVisibleProject, loadVisibleProjectMedia } from "../../../lib/publishing/public-project-runtime.js";
import { resolveGeneratedRuntime } from "../../../lib/game/game-runtime-router-v1.js";
import GeneratedAppClient from "./GeneratedAppClient";
import GameRuntimeClient from "./GameRuntimeClient";
import MobaRuntimeClient from "./MobaRuntimeClient";
import AirCombatRuntimeClient from "./AirCombatRuntimeClient";
import SpecialistRuntimeClient from "./SpecialistRuntimeClient";
import AdvancedGenreRuntimeClient from "./AdvancedGenreRuntimeClient";
import RemainingGenreRuntimeClient from "./RemainingGenreRuntimeClient";
import AnalyticsTracker from "../../components/AnalyticsTracker.js";

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

export default async function GeneratedAppPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const visible = await loadVisibleProject({ id, userId: user?.id || null });
  if (!visible) notFound();

  const { admin, app, version } = visible;
  const media = await loadVisibleProjectMedia(admin, id);
  const specification = version.specification;
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

  return <><AnalyticsTracker appId={id} channel={route.isGame ? "game" : "app"} eventName={route.eventName}/>{runtime}</>;
}
