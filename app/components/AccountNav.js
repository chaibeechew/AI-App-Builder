"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function AccountNav() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUser(data.user || null);
    });
    return () => { mounted = false; };
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/auth");
    router.refresh();
  }

  if (!user) return null;

  return (
    <div className="accountNav">
      <Link href="/my-apps">My Apps</Link>
      <Link href="/credits">Credits</Link>
      <button onClick={signOut}>Sign out</button>
      <style jsx>{`
        .accountNav{position:fixed;right:18px;top:16px;z-index:1000;display:flex;gap:8px;align-items:center;padding:7px;border:1px solid rgba(216,191,98,.2);border-radius:13px;background:rgba(3,16,13,.72);backdrop-filter:blur(12px)}
        a,button{border:0;background:transparent;color:#d8bf62;text-decoration:none;font-size:12px;font-weight:800;padding:8px 10px;border-radius:9px}button{cursor:pointer}a:hover,button:hover{background:rgba(216,191,98,.08)}
      `}</style>
    </div>
  );
}
