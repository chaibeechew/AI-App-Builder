import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server.js";
import { STORE_METADATA_DRAFT_MAX_BYTES, readBoundedStoreJson, sanitizeStoreDraftInput } from "../../../lib/publishing/store-metadata-safety.js";

const clean = (value, max) => String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
function json(payload,status=200){return NextResponse.json(payload,{status,headers:{"Cache-Control":"private, no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff"}});}
function yesNo(value) { return value === true || String(value).toLowerCase() === "yes"; }

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
  const sellerType = clean(customerAnswers.sellerType, 40) || "individual_or_organization";
  const loginRequired = yesNo(customerAnswers.loginRequired);
  const collectsPersonalData = yesNo(customerAnswers.collectsPersonalData);
  const containsAds = yesNo(customerAnswers.containsAds);
  const paidFeatures = yesNo(customerAnswers.paidFeatures);
  const sharesPersonalData = yesNo(customerAnswers.sharesPersonalData);
  const dataEncryptedInTransit = yesNo(customerAnswers.dataEncryptedInTransit);
  const accountDeletionAvailable = yesNo(customerAnswers.accountDeletionAvailable);
  const childDirected = yesNo(customerAnswers.childDirected);

  const dataSafety = {
    status: "customer_review_required",
    autoSubmitted: false,
    collectsData: collectsPersonalData,
    sharesData: sharesPersonalData,
    securityPractices: {
      encryptedInTransit: dataEncryptedInTransit,
      accountDeletionAvailable: loginRequired ? accountDeletionAvailable : false,
    },
    audience: { childDirected, targetAudience },
    source: "customer_answers_draft",
    reviewNote: "Draft only. The customer must review the final app behavior and complete Google Play Data Safety in the customer-owned Play Console before submission.",
  };

  return {
    language,
    autoFill: {
      sellerType, targetAudience, supportEmail, loginRequired, collectsPersonalData, containsAds, paidFeatures,
      customerAnsweredFields: Object.keys(customerAnswers).filter((key) => String(customerAnswers[key] ?? "").trim() !== ""),
      generatedFields: ["name", "subtitle", "keywords", "promotionalText", "descriptions", "category", "store checklist", "Google Play Data Safety draft"],
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
      marketingUrl: websiteUrl,
      reviewNotes: loginRequired ? "App includes authenticated areas. Customer must provide review/demo access details before submission." : "No login required according to customer answers.",
    },
    googlePlay: {
      title: clean(name, 30),
      shortDescription,
      fullDescription: longDescription,
      category: clean(category, 60),
      privacyPolicyUrl: privacyUrl,
      developerWebsite: websiteUrl,
      contactEmail: supportEmail,
      audienceSummary: targetAudience,
      dataSafety,
    },
    declarations: { loginRequired, collectsPersonalData, sharesPersonalData, containsAds, paidFeatures, dataEncryptedInTransit, accountDeletionAvailable, childDirected },
    checklist: [
      { field: "Privacy Policy URL", required: true, value: privacyUrl },
      { field: "Support URL", required: true, value: supportUrl },
      { field: "Support email", required: true, value: supportEmail },
      { field: "Target audience", required: true, value: targetAudience },
      { field: "App icon", required: true, value: "generated_or_customer_asset" },
      { field: "Screenshots", required: true, value: "generate_from_final_build" },
      { field: "Age/content rating", required: true, value: "requires_customer_confirmation_in_store_console" },
      { field: "Google Play Data Safety", required: true, value: "customer_review_required_in_play_console" },
      { field: "Login review access", required: loginRequired, value: loginRequired ? "customer_must_provide_demo_access" : "not_required" },
      { field: "Store developer account", required: true, value: "customer_owned_account" }
    ],
    generatedAt: new Date().toISOString()
  };
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Authentication required." }, 401);

    const parsed=await readBoundedStoreJson(request,STORE_METADATA_DRAFT_MAX_BYTES);
    if(!parsed.ok)return json({error:parsed.status===413?"Store metadata request is too large.":"Invalid store metadata request."},parsed.status);
    const body=sanitizeStoreDraftInput(parsed.value);
    if (!body.appName) return json({ error: "appName is required" }, 400);
    return json(buildMetadata(body));
  } catch (error) {
    console.error("STORE_METADATA_ERROR", error?.code||error?.name||"unknown");
    return json({ error: "Unable to prepare store metadata" }, 400);
  }
}
