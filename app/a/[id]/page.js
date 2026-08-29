import { notFound } from "next/navigation";
import { createClient } from "../../../lib/supabase/server.js";
import GeneratedAppClient from "./GeneratedAppClient";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return {
    title: "Generated App",
    manifest: `/a/${id}/manifest.webmanifest`,
    appleWebApp: { capable: true, statusBarStyle: "default", title: "Generated App" },
  };
}

export default async function GeneratedAppPage({ params }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: app } = await supabase
    .from("apps")
    .select("id,owner_id,name,description,current_version_id,visibility,publish_status")
    .eq("id", id)
    .single();

  if (!app) notFound();
  const canView = app.owner_id === user?.id || app.visibility === "public" || app.publish_status === "published";
  if (!canView) notFound();

  const { data: versions } = await supabase
    .from("app_versions")
    .select("id,version_no,specification")
    .eq("app_id", id)
    .order("version_no", { ascending: false });
  const current = versions?.find((version) => version.id === app.current_version_id) || versions?.[0];
  if (!current?.specification) notFound();

  return <GeneratedAppClient appId={id} app={app} specification={current.specification} />;
}
