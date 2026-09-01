import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server.js";

const clean = (value, max) => String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);

function yesNo(value) { return value === true || String(value).toLowerCase() === "yes"; }

const PERMISSION_IDS = ["camera", "microphone", "location", "photos", "notifications"];

function buildMetadata({ appName, description, category, keywords, language = "en", customerAnswers = {} }) {
  const name = clean(appName, 30) || "My App";
  const longDescription = clean(description, 4000);
  const shortDescription = clean(description, 80);
  const keywordList = String(keywords || "").split(",").map((x) => clean(x, 30)).filter(Boolean).slice(0, 10);
  const privacyUrl = clean(customerAnswers.privacyPolicyUrl, 500);
  const supportUrl = clean(customerAnswers.supportUrl, 500);
  const websiteUrl = clean(customerAnswers.websiteUrl, 500);
  const supportEmail = clean(customerAnswers.supportEmail, 200);
  const targetAudience = clean(customerAnswers.targetAudience, 300);
  const termsUrl = clean(customerAnswers.termsUrl, 500);
  const ageRating = clean(customerAnswers.ageRating, 300);
  const sellerType = clean(customerAnswers.sellerType, 40) || "individual_or_organization";
  const loginRequired = yesNo(customerAnswers.loginRequired);
  const reviewAccessReady = yesNo(customerAnswers.reviewAccessReady);
  const collectsPersonalData = yesNo(customerAnswers.collectsPersonalData);
  const containsAds = yesNo(customerAnswers.containsAds);
  const paidFeatures = yesNo(customerAnswers.paidFeatures);
  const detectedCapabilities = Array.isArray(customerAnswers.detectedCapabilities) ? customerAnswers.detectedCapabilities.map((item) => clean(typeof item === "string" ? item : item?.id, 40)).filter((item) => PERMISSION_IDS.includes(item)) : [];
  const permissionDisclosures = Object.fromEntries(PERMISSION_IDS.map((id) => [id, clean(customerAnswers[`${id}Purpose`], 500)]).filter(([, purpose]) => purpose));

  return {
    language,
    autoFill: {
      sellerType, targetAudience, supportEmail, loginRequired, reviewAccessReady, collectsPersonalData, containsAds, paidFeatures, detectedCapabilities,
      customerAnsweredFields: Object.keys(customerAnswers || {}).filter((key) => String(customerAnswers[key] ?? "").trim() !== ""),
      generatedFields: ["name", "subtitle", "keywords", "promotionalText", "descriptions", "category", "store checklist"],
    },
    apple: {
      name,
      subtitle: clean(description, 30),
      keywords: keywordList.join(","),
      promotionalText: clean(description, 170),
      description: longDescription,
      category: clean(category, 60),
      privacyUrl,
      supportUrl,
      termsUrl,
      marketingUrl: websiteUrl,
      ageRating,
      loginRequired,
      reviewAccessReady,
      permissionDisclosures,
      reviewNotes: loginRequired ? "App includes authenticated areas. Customer must provide review/demo access details before submission." : "No login required according to customer answers.",
    },
    googlePlay: {
      title: clean(name, 30),
      shortDescription,
      fullDescription: longDescription,
      category: clean(category, 60),
      privacyPolicyUrl: privacyUrl,
      termsUrl,
      developerWebsite: websiteUrl,
      contactEmail: supportEmail,
      audienceSummary: targetAudience,
      ageRating,
      loginRequired,
      reviewAccessReady,
      permissionDisclosures,
    },
    declarations: { loginRequired, reviewAccessReady, collectsPersonalData, containsAds, paidFeatures, detectedCapabilities, permissionDisclosures },
    checklist: [
      { field: "Privacy Policy URL", required: true, value: privacyUrl },
      { field: "Terms URL", required: true, value: termsUrl },
      { field: "Support URL", required: true, value: supportUrl },
      { field: "Support email", required: true, value: supportEmail },
      { field: "Target audience", required: true, value: targetAudience },
      { field: "App icon", required: true, value: "requires_dedicated_app_icon_asset" },
      { field: "Screenshots", required: true, value: "requires_final_store_screenshots" },
      { field: "Age/content rating", required: true, value: ageRating || "requires_customer_confirmation_in_store_console" },
      { field: "Login review access", required: loginRequired, value: loginRequired ? (reviewAccessReady ? "customer_confirmed_ready_for_store_console" : "customer_must_confirm_demo_access") : "not_required" },
      ...detectedCapabilities.map((id) => ({ field: `${id[0].toUpperCase()}${id.slice(1)} purpose disclosure`, required: true, value: permissionDisclosures[id] || "customer_must_confirm_permission_purpose" })),
      { field: "Store developer account", required: true, value: "customer_owned_account" }
    ],
    generatedAt: new Date().toISOString()
  };
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const body = await request.json();
    if (!body?.appName) return NextResponse.json({ error: "appName is required" }, { status: 400 });
    return NextResponse.json(buildMetadata(body));
  } catch (error) {
    console.error("STORE_METADATA_ERROR", error);
    return NextResponse.json({ error: "Unable to prepare store metadata" }, { status: 400 });
  }
}
