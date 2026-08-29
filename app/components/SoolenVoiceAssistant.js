"use client";

import { useRef, useState } from "react";

const friendlyVoiceError = (error) => {
  const message = String(error?.message || error || "");
  if (/permission|notallowed|denied|microphone/i.test(message)) return "Microphone access is needed. Please allow microphone access and try again.";
  if (/not supported|mediarecorder|mime|pattern|constraint|format/i.test(message)) return "Voice input is not supported in this browser mode. Try Safari again or use Text instead.";
  if (/401|403|429|quota|credit|billing/i.test(message)) return "Voice service is temporarily unavailable. Your app is safe. You can continue with Text input.";
  return "We couldn't process your voice right now. Your app is safe. Please try again or use Text input.";
};

export default function SoolenVoiceAssistant() {
  const [open, setOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState("");
  const [transcript, setTranscript] = useState("");
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const speechRef = useRef(null);
  const speechTextRef = useRef("");

  async function start() {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = document.documentElement.lang || "en-US";
        recognition.continuous = true;
        recognition.interimResults = true;
        speechTextRef.current = transcript || "";
        recognition.onresult = (event) => {
          let finalText = speechTextRef.current;
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const text = event.results[i][0]?.transcript || "";
            if (event.results[i].isFinal) finalText = `${finalText} ${text}`.trim();
            else interim += text;
          }
          speechTextRef.current = finalText;
          setTranscript(`${finalText} ${interim}`.trim());
        };
        recognition.onerror = (event) => {
          if (event.error === "not-allowed" || event.error === "service-not-allowed") setStatus("Microphone access is needed. Please allow microphone access and try again.");
          else if (event.error !== "aborted") setStatus("Voice input paused. You can try again or use Text input.");
          setRecording(false);
        };
        recognition.onend = () => setRecording(false);
        speechRef.current = recognition;
        recognition.start();
        setRecording(true);
        setStatus("Listening… Speak naturally. Your words will appear here.");
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("Voice input is not supported in this browser mode.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let options = {};
      if (MediaRecorder.isTypeSupported?.("audio/mp4")) options = { mimeType: "audio/mp4" };
      else if (MediaRecorder.isTypeSupported?.("audio/webm;codecs=opus")) options = { mimeType: "audio/webm;codecs=opus" };
      else if (MediaRecorder.isTypeSupported?.("audio/webm")) options = { mimeType: "audio/webm" };
      const rec = new MediaRecorder(stream, options);
      chunksRef.current = [];
      rec.ondataavailable = (event) => event.data?.size && chunksRef.current.push(event.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        setStatus("Soolen AI is processing your voice…");
        try {
          const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
          const buffer = await blob.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = "";
          for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
          const response = await fetch("/api/voice/transcribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ audioBase64: btoa(binary), mimeType: blob.type }) });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.transcript) throw new Error(data.error || `Voice service unavailable (${response.status})`);
          setTranscript(data.transcript);
          setStatus("Ready. Review your idea, then build your app.");
        } catch (error) {
          setStatus(friendlyVoiceError(error));
        }
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      setStatus("Listening… Speak naturally.");
    } catch (error) {
      setRecording(false);
      setStatus(friendlyVoiceError(error));
    }
  }

  function stop() {
    if (speechRef.current) {
      speechRef.current.stop();
      speechRef.current = null;
      setRecording(false);
      setStatus(speechTextRef.current.trim() ? "Ready. Review your idea, then build your app." : "I didn't catch that. Please try again.");
      return;
    }
    recorderRef.current?.stop();
  }

  async function build() {
    if (!transcript.trim()) return;
    setStatus("Soolen AI is building your app…");
    try {
      const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idea: transcript, voiceTranscript: transcript }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Generation failed");
      setStatus(`App ready: ${data?.app?.name || data?.specification?.name || "Your app"}`);
    } catch {
      setStatus("We couldn't build the app yet. Your idea is safe—please try again.");
    }
  }

  return (
    <>
      <button className="sv-fab" onClick={() => setOpen(true)} aria-label="Open Soolen AI voice assistant">🎙️<span>Soolen AI</span></button>
      {open && <div className="sv-backdrop" onClick={() => setOpen(false)}><div className="sv-panel" onClick={(event) => event.stopPropagation()}><button className="sv-close" onClick={() => setOpen(false)} aria-label="Close">×</button><div className="sv-kicker">SOOLEN AI</div><h2>Build with Soolen AI</h2><p>Describe your app naturally. Use your voice or text.</p><button className={recording ? "sv-mic recording" : "sv-mic"} onClick={recording ? stop : start}>{recording ? "■ Stop listening" : "🎙️ Start voice"}</button>{transcript && <div className="sv-transcript">{transcript}</div>}{transcript && <button className="sv-build" onClick={build}>✨ Build App →</button>}<div className="sv-grid"><a href="/image-studio">🎨 Image</a><a href="/vision">📷 Recognize</a><a href="/video-studio">🎬 Video</a></div>{status && <div className="sv-status" role="status">{status}</div>}</div></div>}
      <style jsx global>{`.sv-fab{position:fixed;right:18px;bottom:18px;z-index:40;border:0;border-radius:999px;padding:12px 16px;background:linear-gradient(135deg,#087b50,#14a36f);color:#fff;font-weight:900;box-shadow:0 14px 35px #0004;cursor:pointer}.sv-fab span{margin-left:7px}.sv-backdrop{position:fixed;inset:0;z-index:50;background:#001c16aa;backdrop-filter:blur(7px);display:grid;place-items:end center;padding:18px}.sv-panel{position:relative;width:min(520px,100%);background:#f7fbf8;color:#15352b;border-radius:26px;padding:28px;box-shadow:0 30px 90px #0005}.sv-close{position:absolute;right:14px;top:10px;border:0;background:none;color:#60736c;font-size:30px}.sv-kicker{font-size:10px;letter-spacing:.2em;color:#0b8a5d;font-weight:950}.sv-panel h2{font-size:29px;margin:8px 30px 8px 0}.sv-panel p{color:#687a73}.sv-mic,.sv-build,.sv-grid a{width:100%;border:0;border-radius:15px;padding:15px;font-weight:900;cursor:pointer;display:block;text-align:center;text-decoration:none}.sv-mic{background:#123f33;color:#fff}.sv-mic.recording{background:#9b4339}.sv-build{margin-top:10px;background:#d8bf62;color:#07130e}.sv-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}.sv-grid a{background:#e7eee9;color:#123f33}.sv-transcript{margin-top:15px;padding:15px;border:1px solid #d8e3df;border-radius:15px;background:#fff;white-space:pre-wrap}.sv-status{margin-top:12px;font-size:12px;color:#557069;line-height:1.5}@media(max-width:600px){.sv-panel{padding:24px}.sv-grid{grid-template-columns:1fr}}`}</style>
    </>
  );
}
