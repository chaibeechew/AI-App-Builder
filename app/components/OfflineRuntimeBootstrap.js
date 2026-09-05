"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client.js";
import { classifyBrowserConnectivity } from "../../lib/offline/runtime-core.js";
import {
  clearActiveOfflineUser,
  enqueueOfflineMutation,
  getActiveOfflineScope,
  listOfflineMutations,
  offlineStoreStatus,
  saveLocalProjectSnapshot,
  setActiveOfflineUser,
  updateOfflineMutationState,
} from "../../lib/offline/browser-store.js";

const APP_DETAIL = /^\/api\/apps\/([0-9a-f-]{36})\/?$/iu;
const PRIVATE_SAFE_ROUTE = /^\/(?:offline|editor\/[0-9a-f-]{36}|generated\/[0-9a-f-]{36})\/?$/iu;

function currentConnectivity() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  return classifyBrowserConnectivity({
    online: navigator.onLine,
    effectiveType: connection?.effectiveType,
    saveData: Boolean(connection?.saveData),
    meteredHint: Boolean(connection?.metered),
    localPeerAvailable: Boolean(window.__LANERIQ_LOCAL_PEER_AVAILABLE__),
  });
}

function jsonResponse(body, status = 503) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-LANERIQ-OFFLINE": "1" },
  });
}

async function installOfflineShell() {
  if (!("serviceWorker" in navigator) || !globalThis.isSecureContext) return null;
  try {
    await navigator.serviceWorker.register("/laneriq-sw.js", { scope: "/" });
    return navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

async function cacheVerifiedPrivateShell(serviceWorkerReady, scopeKey) {
  if (!scopeKey || !navigator.onLine) return false;
  const path = window.location.pathname;
  if (!PRIVATE_SAFE_ROUTE.test(path)) return false;
  try {
    const registration = await serviceWorkerReady;
    registration?.active?.postMessage({ type: "CACHE_SAFE_ROUTE", path });
    return Boolean(registration?.active);
  } catch {
    return false;
  }
}

async function clearPrivateOfflineShell(serviceWorkerReady) {
  try {
    const registration = await serviceWorkerReady;
    registration?.active?.postMessage({ type: "CLEAR_PRIVATE_SHELL" });
  } catch {}
}

async function establishOfflineScope(supabase, serviceWorkerReady) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      await clearActiveOfflineUser();
      await clearPrivateOfflineShell(serviceWorkerReady);
      return { scopeKey: "", verifiedOnline: true };
    }
    const scopeKey = await setActiveOfflineUser(user.id);
    return { scopeKey, verifiedOnline: true };
  } catch {
    return { scopeKey: await getActiveOfflineScope(), verifiedOnline: false };
  }
}

async function cacheAppDetailResponse(response, url, scopeKey) {
  if (!scopeKey || !response?.ok) return;
  try {
    const parsed = new URL(url, location.origin);
    const match = parsed.origin === location.origin ? parsed.pathname.match(APP_DETAIL) : null;
    if (!match) return;
    const data = await response.clone().json();
    if (!data?.app || !Array.isArray(data?.versions)) return;
    const current = data.versions.find((item) => item?.id === data.app?.current_version_id) || data.versions[0];
    await saveLocalProjectSnapshot({
      scopeKey,
      projectId: match[1],
      snapshot: { app: data.app, versions: data.versions },
      baseVersionId: current?.id || "local",
      privacyClass: "P3",
    });
  } catch {}
}

async function queuePrivateModify(init, scopeKey) {
  if (!scopeKey) return jsonResponse({ success: false, code: "LANERIQ_OFFLINE_SCOPE_REQUIRED", error: "Reconnect once to verify this device before saving private offline work." });
  try {
    const payload = typeof init?.body === "string" ? JSON.parse(init.body) : null;
    const appId = String(payload?.appId || "").trim();
    if (!APP_DETAIL.test(`/api/apps/${appId}`)) throw new Error("invalid app");
    const idempotencyKey = String(payload?.requestId || `offline-${crypto.randomUUID()}`).replace(/[^a-zA-Z0-9._:-]/gu, "-").slice(0, 180);
    await enqueueOfflineMutation({
      idempotencyKey,
      scopeKey,
      projectId: appId,
      type: "AI_MODIFY",
      payload,
      privacyClass: "P3",
      baseVersionId: String(payload?.baseVersionId || "local"),
    });
    window.dispatchEvent(new CustomEvent("laneriq:offline-queue-changed"));
    return jsonResponse({
      success: false,
      queued: true,
      code: "LANERIQ_OFFLINE_QUEUED",
      error: "Working Offline — your requested AI change is saved privately on this device. Reconnect to review and continue it; nothing private was sent automatically.",
    });
  } catch {
    return jsonResponse({ success: false, code: "LANERIQ_OFFLINE_QUEUE_FAILED", error: "Unable to save this offline request safely. Your existing project was not changed." });
  }
}

async function promoteLocalQueueForReview(scopeKey) {
  if (!scopeKey || !navigator.onLine) return 0;
  try {
    const pending = await listOfflineMutations({ scopeKey, state: "PENDING_LOCAL" });
    for (const mutation of pending) {
      await updateOfflineMutationState({ scopeKey, id: mutation.id, state: "READY_FOR_REVIEW" });
    }
    return pending.length;
  } catch {
    return 0;
  }
}

export default function OfflineRuntimeBootstrap() {
  const [connectivity, setConnectivity] = useState("online_fast");
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    let disposed = false;
    let authSubscription = null;
    const nativeFetch = window.fetch.bind(window);
    let activeScope = "";
    const serviceWorkerReady = installOfflineShell();

    const refreshStatus = async () => {
      const next = currentConnectivity();
      setConnectivity(next);
      window.__LANERIQ_CONNECTIVITY_STATE__ = next;
      window.dispatchEvent(new CustomEvent("laneriq:connectivity", { detail: { state: next } }));
      const scopeKey = activeScope || await getActiveOfflineScope();
      if (scopeKey) {
        const status = await offlineStoreStatus(scopeKey).catch(() => null);
        if (!disposed && status) setQueueCount((status.pendingCount || 0) + (status.readyCount || 0));
      } else if (!disposed) {
        setQueueCount(0);
      }
    };

    const wrappedFetch = async (input, init) => {
      const rawUrl = typeof input === "string" ? input : input?.url;
      const method = String(init?.method || (typeof input !== "string" ? input?.method : "GET") || "GET").toUpperCase();
      let parsed;
      try { parsed = new URL(rawUrl || "", location.origin); } catch { return nativeFetch(input, init); }

      if (parsed.origin === location.origin && parsed.pathname === "/api/modify" && method === "POST" && !navigator.onLine) {
        return queuePrivateModify(init, activeScope || await getActiveOfflineScope());
      }

      try {
        const response = await nativeFetch(input, init);
        if (method === "GET" && parsed.origin === location.origin && APP_DETAIL.test(parsed.pathname) && response.ok) {
          void cacheAppDetailResponse(response, parsed.href, activeScope || await getActiveOfflineScope());
        }
        return response;
      } catch (error) {
        if (method === "GET" && parsed.origin === location.origin) {
          const match = parsed.pathname.match(APP_DETAIL);
          if (match) {
            const scopeKey = activeScope || await getActiveOfflineScope();
            if (scopeKey) {
              const { getLocalProjectSnapshot } = await import("../../lib/offline/browser-store.js");
              const local = await getLocalProjectSnapshot({ scopeKey, projectId: match[1] }).catch(() => null);
              if (local?.snapshot) return jsonResponse(local.snapshot, 200);
            }
          }
        }
        throw error;
      }
    };

    window.fetch = wrappedFetch;

    let supabase;
    try { supabase = createClient(); } catch { supabase = null; }
    if (supabase) {
      void establishOfflineScope(supabase, serviceWorkerReady).then(async ({ scopeKey, verifiedOnline }) => {
        if (disposed) return;
        activeScope = scopeKey;
        if (verifiedOnline && activeScope) await cacheVerifiedPrivateShell(serviceWorkerReady, activeScope);
        if (navigator.onLine) await promoteLocalQueueForReview(activeScope);
        await refreshStatus();
      });
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
          activeScope = "";
          void Promise.all([clearActiveOfflineUser(), clearPrivateOfflineShell(serviceWorkerReady)]).then(refreshStatus);
          return;
        }
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          void establishOfflineScope(supabase, serviceWorkerReady).then(async ({ scopeKey, verifiedOnline }) => {
            if (disposed) return;
            activeScope = scopeKey;
            if (verifiedOnline && activeScope) await cacheVerifiedPrivateShell(serviceWorkerReady, activeScope);
            await refreshStatus();
          });
        }
      });
      authSubscription = data?.subscription || null;
    } else {
      void getActiveOfflineScope().then((scopeKey) => { activeScope = scopeKey; return refreshStatus(); });
    }

    const onOnline = async () => {
      const scopeKey = activeScope || await getActiveOfflineScope();
      if (scopeKey) await promoteLocalQueueForReview(scopeKey);
      await refreshStatus();
    };
    const onOffline = () => void refreshStatus();
    const onQueue = () => void refreshStatus();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("laneriq:offline-queue-changed", onQueue);
    navigator.connection?.addEventListener?.("change", onOffline);
    void refreshStatus();

    return () => {
      disposed = true;
      if (window.fetch === wrappedFetch) window.fetch = nativeFetch;
      authSubscription?.unsubscribe?.();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("laneriq:offline-queue-changed", onQueue);
      navigator.connection?.removeEventListener?.("change", onOffline);
    };
  }, []);

  if (connectivity !== "offline" && connectivity !== "local_network_only" && queueCount < 1) return null;
  return (
    <div className="laneriqOfflineState" role="status" aria-live="polite">
      <strong>{connectivity === "offline" || connectivity === "local_network_only" ? "Working Offline" : "Connected"}</strong>
      <span>{connectivity === "offline" || connectivity === "local_network_only" ? "Private work stays on this device." : `${queueCount} local task${queueCount === 1 ? "" : "s"} ready to review.`}</span>
      <a href="/offline">Open</a>
      <style jsx>{`.laneriqOfflineState{position:fixed;right:14px;bottom:14px;z-index:120;display:grid;grid-template-columns:auto auto auto;align-items:center;gap:9px;padding:9px 11px;border:1px solid #d8bf6244;border-radius:14px;background:#061813ef;color:#f5fff9;box-shadow:0 16px 45px #0007;backdrop-filter:blur(18px);font:600 11px/1.3 Inter,system-ui,sans-serif}.laneriqOfflineState strong{color:#e6ca72}.laneriqOfflineState span{color:#b7c9c1}.laneriqOfflineState a{color:#07130e;background:#d8bf62;border-radius:9px;padding:6px 8px;text-decoration:none;font-weight:900}@media(max-width:650px){.laneriqOfflineState{left:10px;right:10px;bottom:10px;grid-template-columns:auto 1fr auto}}`}</style>
    </div>
  );
}