"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function AccountNav() {
  const router = useRouter();
  const [supabase, setSupabase] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const client = createClient();
    setSupabase(client);
    let mounted = true;
    client.auth.getUser().then(({ data }) => {
      if (mounted) setUser(data.user || null);
    });
    return () => { mounted = false; };
  }, []);

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace("/auth");
    router.refresh();
  }

  function openFolder() {
    router.push("/my-apps");
  }

  if (!user) return null;

  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Account";

  return (
    <div className="accountNav">
      <button className="ownerName" onClick={openFolder} title="Open your App Folder">{displayName}</button>
      <button className="appFolderButton" onClick={openFolder}>📁 App Folder</button>
      <button className="chatButton" onClick={() => router.push("/community-chat")}>Community Chat</button>
      <button onClick={() => router.push("/credits")}>Credits</button>
      <button onClick={signOut}>Sign out</button>
      <style jsx>{`
        .accountNav{position:fixed;right:18px;top:16px;z-index:1000;display:flex;gap:8px;align-items:center;padding:7px;border:1px solid rgba(216,191,98,.2);border-radius:13px;background:rgba(3,16,13,.88);backdrop-filter:blur(12px)}
        button{border:0;background:transparent;color:#d8bf62;text-decoration:none;font-size:12px;font-weight:800;padding:8px 10px;border-radius:9px;cursor:pointer}
        button:hover{background:rgba(216,191,98,.08)}
        .ownerName{color:#fff;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .appFolderButton{background:rgba(216,191,98,.12);border:1px solid rgba(216,191,98,.28)}
        .chatButton{background:rgba(121,215,172,.08);border:1px solid rgba(121,215,172,.16);color:#9fe2c1}
        @media(max-width:720px){.accountNav{right:8px;left:8px;top:8px;justify-content:flex-end;flex-wrap:wrap}.accountNav button{font-size:11px;padding:7px 8px}.ownerName{max-width:110px}}
      `}</style>
    </div>
  );
}
