import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server.js";
import { assessBuildQuality } from "../../../../lib/buildStandards.js";
import { evaluateReleaseReadiness, RELEASE_POLICY_NOTE } from "../../../../lib/release-readiness.js";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const appId = String(body?.appId || "").trim();
    const versionId = String(body?.versionId || "").trim();
    const platform = String(body?.platform || "").trim();
    const listingId = String(body?.listingId || "").trim();
    if (!appId || !versionId || !listingId || !["apple", "google_play"].includes(platform)) return NextResponse.json({ error: "appId, versionId, listingId and a valid platform are required." }, { status: 400 });

    const { data: app } = await supabase.from("apps").select("id,current_version_id").eq("id", appId).eq("owner_id", user.id).single();
    if (!app) return NextResponse.json({ error: "App not found." }, { status: 404 });
    if (app.current_version_id !== versionId) return NextResponse.json({ error: "Store publishing must use the current reviewed project version. Review or rollback first, then prepare the store listing again." }, { status: 409 });

    const { data: version } = await supabase.from("app_versions").select("id,specification").eq("id", versionId).eq("app_id", appId).single();
    if (!version) return NextResponse.json({ error: "Publish version not found." }, { status: 404 });
    const quality = assessBuildQuality(version.specification || {});
    const readiness = evaluateReleaseReadiness(quality);
    if (!readiness.releaseReady) return NextResponse.json({ error: `Store publishing is locked until the current version reaches ${readiness.requiredScore}/100 overall and in every quality dimension.`, releaseReady: false, quality, belowTarget: readiness.belowTarget, missingDimensions: readiness.missing, note: RELEASE_POLICY_NOTE }, { status: 409 });

    const { data: listing } = await supabase.from("store_listings").select("id,app_id,version_id,customer_approved_at").eq("id", listingId).eq("app_id", appId).single();
    if (!listing) return NextResponse.json({ error: "Store listing not found." }, { status: 404 });
    if (!listing.customer_approved_at) return NextResponse.json({ error: "Customer approval is required before publishing." }, { status: 409 });
    if (!listing.version_id || listing.version_id !== versionId) return NextResponse.json({ error: "The approved store listing must match the exact current project version." }, { status: 409 });

    const { data: existing } = await supabase.from("publish_requests").select("id,status").eq("app_id", appId).eq("version_id", versionId).eq("platform", platform).eq("requested_by", user.id).in("status", ["customer_approved","building","testing","ready","submitted","published"]).limit(1).maybeSingle();
    if (existing) return NextResponse.json({ success: true, request: existing, duplicate: true, releaseReady: true });
    const { data, error } = await supabase.from("publish_requests").insert({ app_id: appId, version_id: versionId, store_listing_id: listingId, platform, status: "customer_approved", requested_by: user.id, customer_approved_at: listing.customer_approved_at }).select("id,app_id,version_id,platform,status,created_at").single();
    if (error) return NextResponse.json({ error: "Unable to create publish request." }, { status: 500 });
    return NextResponse.json({ success: true, request: data, releaseReady: true, note: "Store preparation can continue. Store approval and external platform requirements remain outside SoolenAI's control." });
  } catch (error) {
    console.error("PUBLISH_REQUEST_API_ERROR:", error);
    return NextResponse.json({ error: "Unable to create publish request." }, { status: 500 });
  }
}
