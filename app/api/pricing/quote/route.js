import { NextResponse } from "next/server";

const GENERATE_CREDIT_COST = Math.max(1, Number(process.env.APP_GENERATE_CREDIT_COST || 10));
const MODIFY_BASE_COST = Math.max(1, Number(process.env.APP_MODIFY_CREDIT_COST || 5));

function modificationEstimate(instruction = "") {
  const text = String(instruction).toLowerCase();
  const major = ["database", "payment", "authentication", "login", "signup", "new page", "page", "api", "integration", "publish", "marketplace", "ai feature", "video"].some((term) => text.includes(term));
  const medium = ["add", "remove", "calendar", "form", "field", "search", "filter", "dashboard", "workflow", "section"].some((term) => text.includes(term));
  if (major) return Math.max(MODIFY_BASE_COST, MODIFY_BASE_COST * 2);
  if (medium) return Math.max(1, Math.ceil(MODIFY_BASE_COST * 0.6));
  return Math.max(1, Math.ceil(MODIFY_BASE_COST * 0.2));
}

export async function POST(request) {
  try {
    const body = await request.json();
    const operation = String(body?.operation || "generate").toLowerCase();
    if (operation === "modify") {
      const estimatedCredits = modificationEstimate(body?.instruction || "");
      return NextResponse.json({ success: true, operation, estimatedCredits, pricingMode: "complexity", failedOperationRefund: true, hiddenFees: false });
    }
    return NextResponse.json({ success: true, operation: "generate", estimatedCredits: GENERATE_CREDIT_COST, pricingMode: "transparent", failedOperationRefund: true, hiddenFees: false });
  } catch {
    return NextResponse.json({ success: false, error: "Unable to estimate the operation cost." }, { status: 400 });
  }
}
