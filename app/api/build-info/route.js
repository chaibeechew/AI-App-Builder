import { NextResponse } from "next/server";
import { PRODUCT_BRAND } from "../../../lib/product-brand.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      product: PRODUCT_BRAND.name,
      commitSha: String(process.env.VERCEL_GIT_COMMIT_SHA || "unknown"),
      commitRef: String(process.env.VERCEL_GIT_COMMIT_REF || "unknown"),
      environment: String(process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown"),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}
