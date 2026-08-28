"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function CommunityChatPage() {
  const [supabase, setSupabase] = useState(null);
  const [user, setUser] = useState(null);
  const [room, setRoom] = useState(null);
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setSupabase(createClient()); }, []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      if (!data.user) { window.location.href = "/auth"; return; }
      setUser(data.user);
      const { data: foundRoom } = await supabase.from("chat_rooms").select("id,name,description").eq("slug", "community").eq("is_active", true).single();
      if (!active) return;
      setRoom(foundRoom);
      if (foundRoom) {
        const { data: member } = await supabase.from("chat_room_members").select("room_id").eq("room_id", foundRoom.id).eq("user_id", data.user.id).maybeSingle();
        if (member) {
          setJoined(true);
          const { data: history } = await supabase.from("chat_messages").select("id,room_id,user_id,sender_type,body,created_at").eq("room_id", foundRoom.id).order("created_at", { ascending: true }).limit(100);
          if (active) setMessages(history || []);
        }
      }
      if (active) setLoading(false);
    }).catch((e) => { if (active) { setError(e?.message || "Unable to load community chat."); setLoading(false); } });
    return () => { active = false; };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !joined || !room) return;
    const channel = supabase.channel(`community-chat-${room.id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${room.id}` }, (payload) => {
      setMessages((current) => current.some((item) => item.id === payload.new.id) ? current : [...current, payload.new]);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [joined, room, supabase]);

  async function openChat() {
    if (!room || !user || !supabase) return;
    setError("");
    const { error: joinError } = await supabase.from("chat_room_members").upsert({ room_id: room.id, user_id: user.id }, { onConflict: "room_id,user_id" });
    if (joinError) { setError(joinError.message); return; }
    setJoined(true);
    const { data: history } = await supabase.from("chat_messages").select("id,room_id,user_id,sender_type,body,created_at").eq("room_id", room.id).order("created_at", { ascending: true }).limit(100);
    setMessages(history || []);
  }

  async function closeChat() {
    if (!room || !user || !supabase) return;
    await supabase.from("chat_room_members").delete().eq("room_id", room.id).eq("user_id", user.id);
    setJoined(false); setMessages([]);
  }

  async function sendMessage(event) {
    event.preventDefault();
    const message = text.trim();
    if (!message || sending || !joined) return;
    setText(""); setSending(true); setError("");
    try {
      const response = await fetch("/api/community-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Unable to send message");
      if (result.message) setMessages((current) => current.some((item) => item.id === result.message.id) ? current : [...current, result.message]);
      if (result.ai) setMessages((current) => current.some((item) => item.id === result.ai.id) ? current : [...current, result.ai]);
    } catch (sendError) { setError(sendError.message); setText(message); } finally { setSending(false); }
  }

  if (loading) return <main className="chatPage"><div className="loading">Loading Community Chat…</div></main>;
  return (
    <main className="chatPage"><section className="chatShell">
      <header className="chatHeader"><div><div className="eyebrow">OPTIONAL COMMUNITY</div><h1>{room?.name || "Community Chat"}</h1><p>{room?.description || "Chat with other users and the AI assistant."}</p></div><div className="headerActions">{joined ? <button className="ghostButton" onClick={closeChat}>Close Chat</button> : <button className="primaryButton" onClick={openChat}>Open Chat</button>}<a className="ghostButton" href="/my-apps">My Apps</a></div></header>
      {!joined ? <section className="optInCard"><div className="icon">💬</div><h2>Community Chat is off</h2><p>This chat is not opened automatically. Tap <strong>Open Chat</strong> only when you want to join. You can close it at any time.</p><button className="primaryButton large" onClick={openChat}>Open Community Chat</button></section> : <><div className="notice">You chose to open this chat. Other participating users can see community messages. The AI assistant is available in the same room.</div><section className="messages" aria-live="polite">{messages.length ? messages.map((message) => <article className={`message ${message.sender_type}`} key={message.id}><div className="messageLabel">{message.sender_type === "ai" ? "AI Assistant" : message.sender_type === "system" ? "System" : message.user_id === user?.id ? "You" : "User"}</div><div className="bubble">{message.body}</div></article>) : <div className="empty">No messages yet. Start the conversation.</div>}</section><form className="composer" onSubmit={sendMessage}><textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={4000} placeholder="Message the community or ask the AI…" rows={2} disabled={sending} /><button className="primaryButton" disabled={sending || !text.trim()}>{sending ? "Sending…" : "Send"}</button></form></>}
      {error && <div className="error">{error}</div>}
    </section><style jsx>{`.chatPage{min-height:100vh;padding:34px 18px;background:linear-gradient(145deg,#03100d,#0a2119 58%,#06140f);color:#f5fff9}.chatShell{max-width:980px;margin:0 auto}.chatHeader{display:flex;justify-content:space-between;gap:20px;align-items:flex-end;margin-bottom:20px}.eyebrow{color:#d8bf62;letter-spacing:.2em;font-size:11px;font-weight:900}h1{font-size:38px;margin:8px 0}p{color:#93aaa0;line-height:1.55}.headerActions{display:flex;gap:9px;flex-wrap:wrap}.primaryButton,.ghostButton{display:inline-flex;align-items:center;justify-content:center;border-radius:13px;padding:12px 16px;font-weight:800;text-decoration:none;cursor:pointer}.primaryButton{background:#d8bf62;color:#07130e;border:0}.primaryButton:disabled{opacity:.45;cursor:not-allowed}.ghostButton{background:rgba(4,20,15,.7);color:#d8bf62;border:1px solid rgba(216,191,98,.25)}.large{padding:14px 20px}.optInCard{padding:60px 24px;text-align:center;border:1px solid rgba(216,191,98,.2);border-radius:24px;background:rgba(4,20,15,.76)}.icon{font-size:42px}.notice{padding:12px 16px;margin-bottom:12px;border-radius:14px;background:rgba(216,191,98,.08);color:#c9d5cf;font-size:13px}.messages{min-height:52vh;max-height:62vh;overflow:auto;padding:18px;border:1px solid rgba(255,255,255,.08);border-radius:20px;background:rgba(3,16,13,.72)}.message{margin:0 0 14px;display:flex;flex-direction:column;max-width:78%}.messageLabel{font-size:11px;color:#7f978d;margin:0 0 5px 4px}.bubble{padding:11px 14px;border-radius:15px;background:#0d2a20;white-space:pre-wrap;line-height:1.5}.message.ai .bubble{background:rgba(216,191,98,.1);border:1px solid rgba(216,191,98,.14);color:#f1e7b7}.composer{display:flex;gap:10px;margin-top:12px}.composer textarea{flex:1;resize:none;border-radius:15px;border:1px solid rgba(255,255,255,.1);background:rgba(3,16,13,.9);color:#fff;padding:13px;font:inherit;outline:none}.empty{text-align:center;color:#71877f;padding:80px 10px}.error{margin-top:12px;padding:10px 13px;border-radius:12px;background:rgba(150,50,50,.18);color:#f2b4b4}.loading{padding:80px;text-align:center;color:#9eb2aa}@media(max-width:700px){.chatHeader{align-items:stretch;flex-direction:column}h1{font-size:32px}.messages{min-height:55vh}.composer{align-items:stretch;flex-direction:column}.message{max-width:90%}}`}</style></main>
  );
}
