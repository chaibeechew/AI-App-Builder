import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server.js";

function featureText(spec) {
  const pages = Array.isArray(spec?.pages) ? spec.pages : [];
  const features = Array.isArray(spec?.features) ? spec.features : [];
  return [spec?.name, spec?.description, ...pages.flatMap(p => [p?.name, p?.purpose, p?.description]), ...features.flatMap(f => [typeof f === "string" ? f : f?.name, typeof f === "string" ? "" : f?.description])].filter(Boolean).join(" ").toLowerCase();
}

function entity(name, fields, note) {
  return { name, fields, note, access: "owner-scoped by default" };
}

function buildSuggestedSchema(spec) {
  const text = featureText(spec);
  const entities = [entity("users", ["id: uuid", "display_name: text", "email: text", "created_at: timestamptz"], "Account profile only; authentication secrets are never stored here.")];
  const add = (match, value) => { if (match.some(k => text.includes(k)) && !entities.some(e => e.name === value.name)) entities.push(value); };
  add(["customer","client","crm","lead","contact"], entity("customers", ["id: uuid", "owner_id: uuid", "name: text", "email: text", "phone: text", "status: text", "created_at: timestamptz"], "Private customer records with explicit ownership."));
  add(["property","listing","real estate","house","unit"], entity("properties", ["id: uuid", "owner_id: uuid", "title: text", "price: numeric", "status: text", "location: text", "created_at: timestamptz"], "Property inventory or listings."));
  add(["booking","appointment","reservation","schedule"], entity("appointments", ["id: uuid", "owner_id: uuid", "customer_id: uuid?", "starts_at: timestamptz", "status: text", "notes: text"], "Bookings and appointments with ownership checks."));
  add(["product","store","ecommerce","shop","inventory"], entity("products", ["id: uuid", "owner_id: uuid", "name: text", "price: numeric", "stock_qty: integer", "status: text"], "Product catalog with stock state."));
  add(["order","checkout","purchase"], entity("orders", ["id: uuid", "owner_id: uuid", "customer_id: uuid?", "total: numeric", "status: text", "created_at: timestamptz"], "Order records; payment credentials remain with payment providers."));
  add(["message","chat","inbox","conversation"], entity("messages", ["id: uuid", "owner_id: uuid", "sender_id: uuid", "recipient_id: uuid", "body: text", "created_at: timestamptz"], "Private messaging data; sender/recipient authorization required."));
  add(["post","community","social","feed","comment"], entity("posts", ["id: uuid", "owner_id: uuid", "author_id: uuid", "body: text", "visibility: text", "created_at: timestamptz"], "Content with explicit visibility controls."));
  add(["document","file","asset","photo","video","upload"], entity("assets", ["id: uuid", "owner_id: uuid", "storage_path: text", "mime_type: text", "size_bytes: bigint", "created_at: timestamptz"], "Metadata only; file bytes stay in private object storage."));
  if (entities.length === 1) entities.push(entity("records", ["id: uuid", "owner_id: uuid", "title: text", "status: text", "metadata: jsonb", "created_at: timestamptz"], "Flexible starter record for the app's main business object."));
  const relationships = [];
  if (entities.some(e=>e.name==="appointments") && entities.some(e=>e.name==="customers")) relationships.push("appointments.customer_id → customers.id");
  if (entities.some(e=>e.name==="orders") && entities.some(e=>e.name==="customers")) relationships.push("orders.customer_id → customers.id");
  return { version: 1, providerHidden: true, entities, relationships, policies: ["Private by default","Signed-in users can access only rows they own unless a feature explicitly requires sharing","Sensitive writes require server-side validation","No API keys, passwords or payment credentials in generated business tables","Deletion/export paths should exist for personal data where relevant"] };
}

async function getOwnedApp(supabase, id, userId) {
  const { data: app } = await supabase.from("apps").select("id,name,current_version_id,owner_id").eq("id", id).eq("owner_id", userId).single();
  return app;
}

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const app = await getOwnedApp(supabase, id, user.id);
    if (!app) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    const { data: model } = await supabase.from("app_backend_models").select("id,app_id,schema_json,status,created_at,updated_at").eq("app_id", id).eq("owner_id", user.id).maybeSingle();
    return NextResponse.json({ success: true, app: { id: app.id, name: app.name }, model: model || null });
  } catch (error) {
    console.error("DATABASE_BUILDER_GET_ERROR:", error);
    return NextResponse.json({ error: "Unable to load data model." }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const app = await getOwnedApp(supabase, id, user.id);
    if (!app?.current_version_id) return NextResponse.json({ error: "A saved project version is required first." }, { status: 409 });
    const body = await request.json().catch(() => ({}));
    let schema = body?.schema;
    if (!schema) {
      const { data: version } = await supabase.from("app_versions").select("specification").eq("id", app.current_version_id).eq("app_id", id).single();
      schema = buildSuggestedSchema(version?.specification || {});
    }
    if (!Array.isArray(schema?.entities) || schema.entities.length < 1) return NextResponse.json({ error: "At least one data entity is required." }, { status: 400 });
    if (schema.entities.length > 30) return NextResponse.json({ error: "Too many data entities for one project model." }, { status: 400 });
    const { data: model, error } = await supabase.from("app_backend_models").upsert({ app_id: id, owner_id: user.id, schema_json: schema, status: "ready", updated_at: new Date().toISOString() }, { onConflict: "app_id" }).select("id,app_id,schema_json,status,created_at,updated_at").single();
    if (error || !model) throw error || new Error("Unable to save model.");
    return NextResponse.json({ success: true, model, message: "Data model saved inside AI App Builder." });
  } catch (error) {
    console.error("DATABASE_BUILDER_POST_ERROR:", error);
    return NextResponse.json({ error: error?.message || "Unable to build data model." }, { status: 500 });
  }
}
