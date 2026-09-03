"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import { PRODUCT_BRAND } from "../../lib/product-brand.js";
import {
  clearPrivateSessionStorage,
  isPublicAccountPath,
  protectedReturnPath,
} from "../../lib/auth/session-safety.js";

export default function AccountNav() {
  const router = useRouter();
  const rootRef = useRef(null);
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  useEffect(() => {
    const compatibilityClient = createClient();
    let mounted = true;
    let redirecting = false;

    const redirectSignedOutProtectedPage = () => {
      if (redirecting || isPublicAccountPath(window.location.pathname)) return;
      redirecting = true;
      try { clearPrivateSessionStorage(window.sessionStorage); } catch {}
      const next = protectedReturnPath(window.location.pathname, window.location.search);
      window.location.replace(`/auth?next=${encodeURIComponent(next)}`);
    };

    const refreshUser = async () => {
      try {
        const response = await fetch("/api/auth/session", { method: "GET", cache: "no-store", credentials: "same-origin" });
        const session = await response.json().catch(() => ({}));
        if (!mounted) return;
        if (!response.ok || session?.authenticated !== true || session?.sessionAuthority !== "laneriq" || !session?.user?.id) {
          setUser(null);
          redirectSignedOutProtectedPage();
          return;
        }

        // LANERIQ is the authentication truth. The old provider may temporarily enrich
        // the display name while existing profile/data access is being migrated.
        let nextUser = { id: session.user.id };
        try {
          const { data, error } = await compatibilityClient.auth.getUser();
          if (!error && data?.user?.id === session.user.id) nextUser = data.user;
        } catch {}
        if (mounted) setUser(nextUser);
      } catch {
        if (mounted) {
          setUser(null);
          redirectSignedOutProtectedPage();
        }
      }
    };

    void refreshUser();
    const close = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false);
    };
    const revalidate = () => { void refreshUser(); };
    const onVisibility = () => { if (document.visibilityState === "visible") void refreshUser(); };

    document.addEventListener("pointerdown", close);
    window.addEventListener("pageshow", revalidate);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      mounted = false;
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("pageshow", revalidate);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError("");
    setOpen(false);
    try {
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify({ action: "logout" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success !== true || data?.sessionAuthority !== "laneriq") throw new Error("LANERIQ logout failed");
      try { clearPrivateSessionStorage(window.sessionStorage); } catch {}
      window.location.replace("/auth");
    } catch {
      setSignOutError("Sign out did not complete. Your session is still active; please try again.");
      setSigningOut(false);
    }
  }

  function go(path) {
    setOpen(false);
    router.push(path);
  }

  if (!user) return null;
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Account";

  return <div className="accountNav" ref={rootRef}>
    <div className="accountBar">
      <button className="accountTrigger" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Open account menu">
        <span className="avatar">{String(displayName).slice(0, 1).toUpperCase()}</span><b>{displayName}</b><i>⌄</i>
      </button>
      <button className="visibleLogout" onClick={signOut} disabled={signingOut} aria-label="Logout">{signingOut ? "Signing out…" : "Logout"}</button>
    </div>
    {signOutError && <div className="signOutError" role="alert">{signOutError}</div>}
    {open && <div className="accountMenu">
      <small>{PRODUCT_BRAND.name} · {PRODUCT_BRAND.capabilities}</small>
      <button onClick={() => go("/my-apps")}>📁 My Projects</button>
      <button onClick={() => go("/account/security")}>🔐 Security & Email</button>
      <button onClick={() => go("/studio")}>✦ Studio</button>
      <button onClick={() => go("/community-chat")}>Community</button>
      <button onClick={() => go("/credits")}>Credits</button>
      <button className="signout" onClick={signOut} disabled={signingOut}>Sign out</button>
    </div>}
    <style jsx>{`.accountNav{position:fixed;right:14px;top:70px;z-index:1000;font-family:Inter,system-ui,-apple-system,sans-serif}.accountBar{display:flex;align-items:center;gap:7px}.accountTrigger{display:flex;align-items:center;gap:8px;max-width:220px;border:1px solid rgba(216,191,98,.26);border-radius:999px;padding:6px 10px 6px 6px;background:rgba(3,16,13,.9);color:#fff;box-shadow:0 12px 34px #0006;backdrop-filter:blur(14px);cursor:pointer}.visibleLogout{min-height:42px;border:1px solid rgba(216,191,98,.34);border-radius:999px;padding:0 13px;background:rgba(3,16,13,.94);color:#e9c968;font-size:11px;font-weight:950;letter-spacing:.02em;box-shadow:0 12px 34px #0006;backdrop-filter:blur(14px);cursor:pointer}.visibleLogout:disabled,.accountMenu button:disabled{opacity:.55;cursor:not-allowed}.avatar{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#f1d77c,#b88428);color:#07130e;font-weight:1000}.accountTrigger b{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.accountTrigger i{color:#d8bf62;font-style:normal}.accountMenu{position:absolute;right:0;top:49px;width:230px;padding:10px;border:1px solid rgba(216,191,98,.25);border-radius:17px;background:#03120ff5;box-shadow:0 22px 60px #0009;backdrop-filter:blur(20px)}.accountMenu small{display:block;padding:6px 8px 9px;color:#d8bf62;font-size:9px;letter-spacing:.1em;font-weight:900}.accountMenu button{display:block;width:100%;border:0;border-radius:10px;background:transparent;color:#dce7e2;text-align:left;padding:10px 9px;font-weight:800;cursor:pointer}.accountMenu button:hover{background:#ffffff0d}.accountMenu .signout{margin-top:5px;border-top:1px solid #ffffff10;color:#ffb9b2}.signOutError{position:absolute;right:0;top:50px;width:min(320px,calc(100vw - 28px));padding:10px 12px;border:1px solid rgba(255,126,116,.32);border-radius:12px;background:#3a1110f2;color:#ffc1bb;font-size:10px;font-weight:800;line-height:1.4;box-shadow:0 14px 40px #0008}@media(max-width:720px){.accountNav{right:10px;top:62px}.accountTrigger{max-width:118px}.accountTrigger b{display:none}.visibleLogout{min-height:40px;padding:0 11px;font-size:10px}.accountMenu{width:220px}}`}</style>
  </div>;
}
