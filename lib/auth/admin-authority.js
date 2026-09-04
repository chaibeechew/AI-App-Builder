import { createServerClient } from "../supabase/server.js";
import { createAdminClient } from "../supabase/admin.js";
import {
  LANERIQ_SESSION_COOKIE,
  LANERIQ_SESSION_MODE_COOKIE,
  isLaneriqPrimarySessionMode,
  validateLaneriqSessionToken,
} from "./laneriq-session.js";

function failure(code, error, status) {
  return Object.freeze({ ok: false, code, error, status });
}

function authorized(user, sessionAuthority) {
  return Object.freeze({
    ok: true,
    userId: String(user.id),
    sessionAuthority,
    role: "admin",
  });
}

function adminRole(user) {
  return String(user?.app_metadata?.role || "").trim().toLowerCase() === "admin";
}

export async function resolveLaneriqAdminRequest(request) {
  const token = String(request.cookies.get(LANERIQ_SESSION_COOKIE)?.value || "");
  const sessionMode = request.cookies.get(LANERIQ_SESSION_MODE_COOKIE)?.value;
  let laneriqSession = null;

  try {
    laneriqSession = await validateLaneriqSessionToken(token);
  } catch {
    return failure("SESSION_NOT_READY", "Authentication service is temporarily unavailable.", 503);
  }

  if (laneriqSession?.userId) {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(laneriqSession.userId);
    const user = data?.user;
    if (error || !user?.id || user.id !== laneriqSession.userId) {
      return failure("ACCOUNT_NOT_READY", "Account identity is temporarily unavailable.", 503);
    }
    if (!adminRole(user)) return failure("ADMIN_PERMISSION_REQUIRED", "Admin permission required.", 403);
    return authorized(user, "laneriq");
  }

  // A browser that has migrated to LANERIQ-primary must never fall back to a stale
  // provider compatibility cookie after logout, revocation or session expiry.
  if (isLaneriqPrimarySessionMode(sessionMode)) {
    return failure("AUTHENTICATION_REQUIRED", "Authentication required.", 401);
  }

  // Temporary compatibility bridge only for not-yet-migrated sessions.
  const provider = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await provider.auth.getUser();
  if (authError || !user) return failure("AUTHENTICATION_REQUIRED", "Authentication required.", 401);
  if (!adminRole(user)) return failure("ADMIN_PERMISSION_REQUIRED", "Admin permission required.", 403);
  return authorized(user, "legacy_bridge");
}
