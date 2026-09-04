import { NextResponse } from "next/server";
import { publicIndependentRouteStatus } from "../../../../../lib/platform/independent-route.js";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(publicIndependentRouteStatus(), {
    headers: {
      "cache-control": "no-store",
      "x-laneriq-contract": "lir1",
    },
  });
}
