"use client";

import { useEffect, useRef, useState } from "react";

const LANGUAGES = [
  ["auto", "Auto · Follow iPhone"],
  ["zh-CN", "中文（普通话）"],
  ["zh-HK", "粤语（香港）"],
  ["en-US", "English"],
  ["ms-MY", "Bahasa Melayu"],
  ["id-ID", "Bahasa Indonesia"],
  ["ta-MY", "தமிழ்"],
  ["hi-IN", "हिन्दी"],
  ["ja-JP", "日本語"],
  ["ko-KR", "한국어"],
  ["th-TH", "ไทย"],
  ["vi-VN", "Tiếng Việt"],
  ["ar-SA", "العربية"],
  ["es-ES", "Español"],
  ["fr-FR", "Français"],
  ["de-DE", "Deutsch"],
  ["pt-BR", "Português"],
  ["ru-RU", "Русский"],
];

const ACK = {
  "zh-CN": "我听到了。你可以继续修改，或者开始制作应用。",
  "zh-HK": "我聽到了。你可以繼續修改，或者開始製作應用。",
  "ms-MY": "Saya sudah dengar. Anda boleh terus mengubah atau mula membina aplikasi.",
  "id-ID": "Saya sudah mendengar. Anda dapat mengubahnya atau mulai membuat aplikasi.",
  "en-US": "I heard you. You can keep editing or start building your app.",
};

function normalizeLanguage(value) {
  const language = String(value || "").toLowerCase();
  if (language.startsWith("zh-hk") || language.startsWith("zh-tw") || language.startsWith("yue")) return "zh-HK";
  if (language.startsWith("zh")) return "zh-CN";
  if (language.startsWith("ms")) return "ms-MY";
  if (language.startsWith("id")) return "id-ID";
  if (language.startsWith("ta")) return "ta-MY";
  if (language.startsWith("hi")) return "hi-IN";
  if (language.startsWith("ja")) return "ja-JP";
  if (language.startsWith("ko")) return "ko-KR";
  if (language.startsWith("th")) return "th-TH";
  if (language.startsWith("vi")) return "vi-VN";
  if (language.startsWith("ar")) return "ar-SA";
  if (language.startsWith("es")) return "es-ES";
  if (language.startsWith("fr")) return "fr-FR";
  if (language.startsWith("de")) return "de-DE";
  if (language.startsWith("pt")) return "pt-BR";
  if (language.startsWith("ru")) return "ru-RU";
  return "en-US";
}

function friendly(error) {
  const message = String(error?.message || error || "");
  if (/permission|notallowed|denied/i.test(message)) return "Microphone permission is unavailable. You can still type your idea below.";
  if (/no-speech/i.test(message)) return "No speech detected. Try again or type your idea below.";
  return "Voice input is unavailable right now. You can still type your idea below.";
}

export default function SoolenVoiceAssistant() {
  const [open, setOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [status, setStatus] = useState("");
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("auto");
  const [voiceReply, setVoiceReply] = useState(true);
  const speech = useRef(null);
  const finalText = useRef("");

  useEffect(() => () => {
    try { speech.current?.abort(); } catch {}
    try { window.speechSynthesis?.cancel(); } catch {}
  }, []);

  function deviceLanguage() {
    return normalizeLanguage(navigator.languages?.[0] || navigator.language || "en-US");
  }

  function recognitionLanguage() {
    return language === "auto" ? deviceLanguage() : language;
  }

  function speak(value) {
    const message = String(value || "").trim();
    if (!message || !("speechSynthesis" in window) || !window.SpeechSynthesisUtterance) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = recognitionLanguage();
    utterance.rate = 0.95;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function start() {
    if (recording) return;
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setStatus("Voice recognition is unavailable in this browser. You can type your idea below.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = recognitionLanguage();
      recognition.continuous = !/iPhone|iPad|iPod/i.test(navigator.userAgent);
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
      finalText.current = text;

      recognition.onresult = (event) => {
        let completed = finalText.current;
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const transcript = event.results[i][0]?.transcript || "";
          if (event.results[i].isFinal) completed = `${completed} ${transcript}`.trim();
          else interim += transcript;
        }
        finalText.current = completed;
        setText(`${completed} ${interim}`.trim());
      };

      recognition.onerror = (event) => {
        if (event.error !== "aborted") setStatus(friendly(event.error));
        setRecording(false);
        speech.current = null;
      };

      recognition.onend = () => {
        setRecording(false);
        speech.current = null;
        if (finalText.current.trim()) {
          setStatus("Speech captured. Review it or build your app.");
          if (voiceReply) speak(ACK[recognitionLanguage()] || ACK["en-US"]);
        }
      };

      speech.current = recognition;
      recognition.start();
      setRecording(true);
      setStatus("Listening…");
    } catch (error) {
      setStatus(friendly(error));
      setRecording(false);
    }
  }

  function stop() {
    try { speech.current?.stop(); } catch {}
    setRecording(false);
  }

  function stopSpeaking() {
    try { window.speechSynthesis.cancel(); } catch {}
    setSpeaking(false);
  }

  function sendToBuilder() {
    const value = text.trim();
    if (!value) {
      setStatus("Tell us the app you want first.");
      return;
    }
    try { sessionStorage.setItem("soolenAppIdea", value); } catch {}
    try { window.dispatchEvent(new CustomEvent("soolen-app-idea", { detail: { idea: value } })); } catch {}
    setOpen(false);
    setStatus("");
  }

  return (
    <>
      <button className="sv-fab" onClick={() => { setOpen(true); setStatus(""); }} aria-label="Voice idea">🎙️<span>Voice Idea</span></button>
      {open && (
        <div className="sv-backdrop" role="dialog" aria-modal="true">
          <div className="sv-panel">
            <button className="sv-close" onClick={() => { stop(); stopSpeaking(); setOpen(false); }} aria-label="Close">×</button>

            <div className="sv-topline">
              <div className="sv-globe">◎</div>
              <div className="sv-brand">AI App Builder<div className="sv-brandline" /></div>
              <div className="sv-langtag">EN⌄</div>
            </div>

            <div className="sv-heroicon">🎙️</div>
            <h2>Speak in your language</h2>
            <p className="sv-sub">Choose a language for best accuracy.<br />Auto follows your iPhone language.</p>

            <label className="sv-label">VOICE LANGUAGE</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} disabled={recording}>
              {LANGUAGES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>

            <div className="sv-privacycard">
              <div className="sv-shield">✓</div>
              <div><strong>Your voice is private and secure</strong><span>Voice input starts only when you tap the microphone.</span></div>
            </div>

            <div className="sv-voicecard">
              <button className={recording ? "sv-mic recording" : "sv-mic"} onClick={recording ? stop : start}>
                <span className="sv-micicon">🎤</span>
              </button>
              <strong>{recording ? "Listening…" : "Tap to start speaking"}</strong>
              <span>{recording ? "Speak naturally in your selected language." : "We’ll convert your speech to text instantly."}</span>
              <div className="sv-wave">▮ ▪ ▮ ▪ ▪ ▮ ▪ ▮ ▪ ▪ ▮ ▪ ▮ ▪ ▮</div>
              <button className="sv-play" onClick={speaking ? stopSpeaking : () => speak(text)} disabled={!text.trim()}>
                {speaking ? "■ STOP PLAYBACK" : "▶ PLAY BACK LAST RECORDING"}
              </button>
            </div>

            <label className="sv-label">YOUR APP IDEA</label>
            <textarea value={text} onChange={(e) => { setText(e.target.value); finalText.current = e.target.value; }} placeholder="Speak or type the app you want to build." />

            <label className="sv-toggle"><input type="checkbox" checked={voiceReply} onChange={(e) => setVoiceReply(e.target.checked)} /> AI voice confirmation</label>
            <button className="sv-build" onClick={sendToBuilder}>🚀 BUILD MY APP →</button>
            {status && <div className="sv-status">{status}</div>}
          </div>
        </div>
      )}

      <style jsx global>{`
        .sv-fab{position:fixed;right:18px;bottom:18px;z-index:40;border:1px solid #e1b83d;border-radius:999px;padding:14px 20px;background:#0a6d54;color:#fff;font-size:16px;font-weight:900;box-shadow:0 14px 35px #0004;cursor:pointer}.sv-fab span{margin-left:8px}
        .sv-backdrop{position:fixed;inset:0;z-index:50;background:#00130fcf;backdrop-filter:blur(8px);display:grid;place-items:center;padding:12px}
        .sv-panel{position:relative;width:min(560px,100%);max-height:96vh;overflow:auto;background:#fffdf7;color:#151d1a;border-radius:28px;padding:28px;box-shadow:0 30px 90px #0007}
        .sv-close{position:absolute;right:14px;top:9px;border:0;background:none;font-size:32px;color:#68716d;cursor:pointer}
        .sv-topline{display:grid;grid-template-columns:44px 1fr 60px;align-items:center;margin-bottom:20px}.sv-globe{font-size:31px;color:#f4b71b;font-weight:900}.sv-brand{text-align:center;font-size:24px;font-weight:950}.sv-brandline{width:78px;height:5px;border-radius:999px;background:#f3b617;margin:8px auto 0}.sv-langtag{justify-self:end;border:1px solid #eee3cf;border-radius:14px;padding:10px 12px;font-weight:900;background:#fff}
        .sv-heroicon{width:92px;height:92px;border-radius:999px;display:grid;place-items:center;margin:10px auto 18px;background:#fff4cf;font-size:42px}.sv-panel h2{text-align:center;font-size:34px;line-height:1.08;margin:0 0 10px}.sv-sub{text-align:center;font-size:17px;line-height:1.5;color:#69716d;margin:0 0 24px}
        .sv-label{display:block;font-size:12px;font-weight:950;margin:14px 0 8px;letter-spacing:.04em}.sv-panel select,.sv-panel textarea{width:100%;border:1px solid #ddd8cb;border-radius:16px;padding:14px 16px;background:#fff;color:#17201d;font:inherit;box-sizing:border-box}.sv-panel textarea{min-height:120px;resize:vertical}
        .sv-privacycard{display:flex;gap:14px;align-items:center;background:#fff8e7;border-radius:20px;padding:18px;margin:18px 0}.sv-shield{width:44px;height:44px;border-radius:13px;background:#f2b311;color:#fff;display:grid;place-items:center;font-size:24px;font-weight:950}.sv-privacycard strong{display:block;font-size:15px}.sv-privacycard span{display:block;color:#727772;font-size:13px;margin-top:4px}
        .sv-voicecard{border:1px solid #eee4d1;border-radius:24px;padding:22px;text-align:center;background:#fffefb}.sv-mic{width:86px;height:86px;border:0;border-radius:999px;background:#ffc21f;box-shadow:0 12px 28px #d99c1745;cursor:pointer}.sv-mic.recording{animation:svpulse 1.2s infinite}.sv-micicon{font-size:34px}.sv-voicecard strong{display:block;font-size:22px;margin-top:15px}.sv-voicecard>span{display:block;color:#6f7672;margin-top:8px}.sv-wave{color:#f0bb32;letter-spacing:5px;margin:22px 0}.sv-play{width:100%;border:0;border-radius:16px;padding:14px;background:#fff;color:#5d615f;box-shadow:0 6px 18px #0000000c;font-weight:900}.sv-play:disabled{opacity:.45}
        .sv-toggle{display:flex;align-items:center;gap:10px;font-weight:900;margin:18px 0 14px}.sv-toggle input{width:20px;height:20px;accent-color:#f1b517}.sv-build{width:100%;border:0;border-radius:18px;padding:17px;background:linear-gradient(90deg,#ffd84c,#ffc11f);font-size:18px;font-weight:950;cursor:pointer}.sv-status{margin-top:12px;border-radius:14px;padding:11px 13px;background:#edf7f1;color:#1e5f49;font-size:13px;font-weight:750}
        @keyframes svpulse{0%,100%{box-shadow:0 0 0 0 #ffc21f55}50%{box-shadow:0 0 0 14px #ffc21f00}}
        @media(max-width:600px){.sv-backdrop{padding:0}.sv-panel{width:100%;height:100%;max-height:none;border-radius:0;padding:24px 20px 34px}.sv-panel h2{font-size:31px}.sv-fab{right:12px;bottom:12px}.sv-fab span{display:none}}
      `}</style>
    </>
  );
}
