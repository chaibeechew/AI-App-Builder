import { NextResponse } from "next/server";
import { TEMPLATE_OBJECTS } from "../../../engine/templates.js";

export async function GET(request) {
  const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() || "";
  const templates = q
    ? TEMPLATE_OBJECTS.filter((t) => `${t.name} ${t.description}`.toLowerCase().includes(q))
    : TEMPLATE_OBJECTS;
  return NextResponse.json({ templates, total: templates.length });
}
