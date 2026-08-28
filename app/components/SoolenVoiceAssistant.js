"use client";
import { useRef, useState } from "react";

export default function SoolenVoiceAssistant() {
  const [open, setOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState("");
  const [transcript, setTranscript] = useState("");
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        setStatus("Soolen AI is listening to your idea…");
        try {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
          const buffer = await blob.arrayBuffer();
          let binary = "";
          const bytes = new Uint8Array(buffer);
          for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
          const r = await fetch("/api/voice/transcribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audioBase64: btoa(binary), mimeType: blob.type }) });
          const d = await r.json();
          if (!r.ok || !d.transcript) throw new Error(d?.error || "Voice transcription failed.");
          setTranscript(d.transcript);
          setStatus("Ready. Review your idea, then build.");
        } catch (e) { setStatus(e?.message || "Unable to process voice input."); }
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true); setStatus("Listening… tap the microphone again when finished.");
    } catch (e) { setStatus(e?.message || "Microphone permission is required."); }
  }

  function stop() { recorderRef.current?.stop(); }

  async function build() {
    if (!transcript.trim()) return;
    setStatus("Soolen AI is building your app…");
    try {
      const r = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idea: transcript, voiceTranscript: transcript }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Generation failed.");
      setStatus(`App ready: ${d?.app?.name || d?.specification?.name || "Your app"}`);
    } catch (e) { setStatus(e?.message || "Unable to build the app."); }
  }

  return <>
    <button className="sv-fab" onClick={() => setOpen(true)} aria-label="Talk to Soolen AI">🎙️<span>Soolen AI</span></button>
    {open && <div className="sv-backdrop" onClick={() => setOpen(false)}><div className="sv-panel" onClick={(e) => e.stopPropagation()}>
      <button className="sv-close" onClick={() => setOpen(false)}>×</button>
      <div className="sv-kicker">SOOLEN AI</div><h2>Tell me what you want to build.</h2><p>Speak naturally. Soolen AI will understand your idea and use the right industry patterns.</p>
      <button className={recording ? "sv-mic recording" : "sv-mic"} onClick={recording ? stop : start}>{recording ? "■ Stop listening" : "🎙️ Start voice"}</button>
      {transcript && <div className="sv-transcript">{transcript}</div>}
      {transcript && <button className="sv-build" onClick={build}>✨ Build with Soolen AI →</button>}
      {status && <div className="sv-status">{status}</div>}
    </div></div>}
    <style jsx global>{`.sv-fab{position:fixed;right:18px;bottom:18px;z-index:40;border:0;border-radius:999px;padding:12px 16px;background:linear-gradient(135deg,#087b50,#14a36f);color:#fff;font-weight:900;box-shadow:0 14px 35px #0004;cursor:pointer}.sv-fab span{margin-left:7px}.sv-backdrop{position:fixed;inset:0;z-index:50;background:#001c16aa;backdrop-filter:blur(7px);display:grid;place-items:end center;padding:18px}.sv-panel{position:relative;width:min(520px,100%);background:#f7fbf8;color:#15352b;border-radius:26px;padding:28px;box-shadow:0 30px 90px #0005}.sv-close{position:absolute;right:14px;top:10px;border:0;background:none;color:#60736c;font-size:30px;cursor:pointer}.sv-kicker{font-size:10px;letter-spacing:.2em;color:#0b8a5d;font-weight:950}.sv-panel h2{font-size:29px;line-height:1.05;margin:8px 30px 8px 0}.sv-panel p{color:#687a73;line-height:1.5}.sv-mic,.sv-build{width:100%;border:0;border-radius:15px;padding:15px;font-weight:900;cursor:pointer}.sv-mic{background:#123f33;color:#fff}.sv-mic.recording{background:#9b4339}.sv-build{margin-top:10px;background:#d8bf62;color:#07130e}.sv-transcript{margin-top:15px;padding:15px;border:1px solid #d8e3df;border-radius:15px;background:#fff;line-height:1.5}.sv-status{margin-top:12px;font-size:12px;color:#557069}@media(max-width:600px){.sv-fab{right:12px;bottom:12px}.sv-fab span{display:none}.sv-panel{padding:24px;border-radius:22px}}`}</style>
  </>;
}
