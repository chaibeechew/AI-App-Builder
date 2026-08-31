import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server.js";
import { buildStoreReadiness } from "../../../../../lib/publishing/store-readiness-policy.js";

function present(value) { return String(value ?? "").trim().length > 0; }

function listingMetadata(listing) {
  if (!listing) return null;
  return {
    language: listing.language || "en",
    apple: listing.apple || {},
    googlePlay: listing.google_play || {},
    checklist: Array.isArray(listing.checklist) ? listing.checklist : [],
  };
}

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const { data: app } = await supabase
      .from("apps")
      .select("id,name,description,current_version_id,owner_id")
      .eq("id", id)
      .eq("owner_id", user.id)
      .single();
    if (!app) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    if (!app.current_version_id) return NextResponse.json({ error: "A saved project version is required first." }, { status: 409 });

    const [{ data: version }, { data: listing }, { data: projectAssets }] = await Promise.all([
      supabase.from("app_versions").select("id,version_no,specification").eq("id", app.current_version_id).eq("app_id", id).single(),
      supabase.from("store_listings").select("id,version_id,language,apple,google_play,checklist,customer_approved_at,updated_at").eq("app_id", id).eq("version_id", app.current_version_id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("project_assets").select("id,asset_id,suggested_page,suggested_role,placement_reason").eq("app_id", id).eq("owner_id", user.id),
    ]);

    if (!version) return NextResponse.json({ error: "Current project version not found." }, { status: 404 });

    const assetIds=(projectAssets||[]).map(item=>item.asset_id).filter(Boolean);
    let assetLibrary=[];
    if(assetIds.length){
      const { data }=await supabase.from("asset_library").select("id,file_name,mime_type,category").eq("user_id",user.id).in("id",assetIds);
      assetLibrary=data||[];
    }
    const libraryById=new Map(assetLibrary.map(item=>[item.id,item]));
    const assets=(projectAssets||[]).map(item=>({...item,...(libraryById.get(item.asset_id)||{})}));

    const apple = listing?.apple || {};
    const google = listing?.google_play || {};
    const inferredAnswers = {
      supportEmail: google.contactEmail || "",
      privacyPolicyUrl: apple.privacyUrl || google.privacyPolicyUrl || "",
      supportUrl: apple.supportUrl || "",
      websiteUrl: apple.marketingUrl || google.developerWebsite || "",
      targetAudience: google.audienceSummary || "",
      loginRequired: /authenticated areas|provide review\/demo access/i.test(String(apple.reviewNotes || "")),
    };

    const needsCustomer = [];
    if (!present(inferredAnswers.supportEmail)) needsCustomer.push({ key: "supportEmail", label: "Support email", reason: "The stores need a real customer support contact and AI must not invent it." });
    if (!present(inferredAnswers.targetAudience)) needsCustomer.push({ key: "targetAudience", label: "Target audience", reason: "Audience and age suitability are customer/product declarations." });
    if (!present(inferredAnswers.privacyPolicyUrl)) needsCustomer.push({ key: "privacyPolicyUrl", label: "Privacy Policy URL", reason: "A real privacy policy location must be confirmed by the customer." });
    if (!present(inferredAnswers.supportUrl)) needsCustomer.push({ key: "supportUrl", label: "Support URL", reason: "The support destination must be a real reachable page." });
    if (inferredAnswers.loginRequired) needsCustomer.push({ key: "reviewAccess", label: "Store review login access", reason: "If login is required, the customer must provide valid reviewer/demo access in the official store console." });

    const readiness=buildStoreReadiness({specification:version.specification||{},listing,assets,inferredAnswers});
    for(const item of readiness.customerRequired){
      if(!needsCustomer.some(existing=>existing.key===item.key))needsCustomer.push({key:item.key,label:item.label,reason:item.reason});
    }

    const autoFilled = [
      ["App name", apple.name || google.title],
      ["Short description / subtitle", apple.subtitle || google.shortDescription],
      ["Long description", apple.description || google.fullDescription],
      ["Category", apple.category || google.category],
      ["Keywords", apple.keywords],
      ["Website", apple.marketingUrl || google.developerWebsite],
    ].filter(([, value]) => present(value)).map(([label]) => label);

    const checklist = Array.isArray(listing?.checklist) ? listing.checklist : [];
    const unresolvedChecklist = checklist.filter((item) => item?.required && (!present(item?.value) || String(item.value).startsWith("requires_") || String(item.value).startsWith("customer_")));

    const externalActions = [
      { platform: "apple", label: "Apple Developer Program account", payer: "customer_direct_to_apple" },
      { platform: "apple", label: "Bundle ID, signing and App Store Connect release", payer: "customer_action" },
      { platform: "google_play", label: "Google Play developer account", payer: "customer_direct_to_google" },
      { platform: "google_play", label: "Package name, signing and Play Console release", payer: "customer_action" },
      { platform: "stores", label: "Final store declarations and review", payer: "customer_action" },
    ];

    const readyForReview = Boolean(listing) && readiness.readyForCustomerReview;

    return NextResponse.json({
      success: true,
      app: { id: app.id, name: app.name },
      version: { id: version.id, versionNo: version.version_no },
      listing: listing || null,
      metadata: listingMetadata(listing),
      inferredAnswers,
      autoFilled,
      needsCustomer,
      unresolvedChecklist,
      externalActions,
      assetCount: assets.length,
      storeReadiness: readiness,
      readyForReview,
      customerApproved: Boolean(listing?.customer_approved_at),
      readyForOfficialSubmission: false,
      note: "SoolenAI can prepare and validate store information, icon/screenshot requirements and permission-purpose gaps, but it must not guess customer declarations, store credentials, signing credentials or platform review answers. Official submission remains controlled by the customer and Apple/Google.",
    });
  } catch (error) {
    console.error("PUBLISHING_AGENT_ERROR", error);
    return NextResponse.json({ error: "Unable to evaluate store publishing readiness." }, { status: 500 });
  }
}
