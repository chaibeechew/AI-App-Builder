import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server.js";

const clean = (value, max) => String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);

function buildMetadata({ appName, description, category, keywords, language = "en" }) {
  const name = clean(appName, 30) || "My App";
  const longDescription = clean(description, 4000);
  const shortDescription = clean(description, 80);
  const keywordList = String(keywords || "").split(",").map((x) => clean(x, 30)).filter(Boolean).slice(0, 10);

  return {
    language,
    apple: {
      name,
      subtitle: clean(description, 30),
      keywords: keywordList.join(","),
      promotionalText: clean(description, 170),
      description: longDescription,
      category: clean(category, 60),
      privacyUrl: "",
      supportUrl: "",
      marketingUrl: ""
    },
    googlePlay: {
      title: clean(name, 30),
      shortDescription,
      fullDescription: longDescription,
      category: clean(category, 60),
      privacyPolicyUrl: "",
      developerWebsite: ""
    },
    checklist: [
      { field: "Privacy Policy URL", required: true, value: "" },
      { field: "Support URL", required: true, value: "" },
      { field: "App icon", required: true, value: "" },
      { field: "Screenshots", required: true, value: "" },
      { field: "Age/content rating", required: true, value: "" },
      { field: "Store account credentials", required: true, value: "" }
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
