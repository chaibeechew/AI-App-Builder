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

const ACKNOWLEDGEMENTS = {
  "zh-CN": "我听到了。你可以继续修改，或者开始制作应用。",
  "zh-HK": "我聽到了。你可以繼續修改，或者開始製作應用。",
  "ms-MY": "Saya sudah dengar. Anda boleh terus mengubah atau mula membina aplikasi.",
  "id-ID": "Saya sudah mendengar. Anda dapat mengubahnya atau mulai membuat aplikasi.",
  "ta-MY": "நான் கேட்டேன். நீங்கள் தொடர்ந்து திருத்தலாம் அல்லது செயலியை உருவாக்கலாம்.",
  "hi-IN": "मैंने सुन लिया। आप इसे बदल सकते हैं या ऐप बनाना शुरू कर सकते हैं।",
  "ja-JP": "聞き取りました。内容を編集するか、アプリの作成を始められます。",
  "ko-KR": "잘 들었습니다. 내용을 수정하거나 앱 만들기를 시작할 수 있습니다.",
  "th-TH": "ได้ยินแล้ว คุณสามารถแก้ไขหรือเริ่มสร้างแอปได้",
  "vi-VN": "Tôi đã nghe rõ. Bạn có thể chỉnh sửa hoặc bắt đầu tạo ứng dụng.",
  "ar-SA": "لقد سمعتك. يمكنك تعديل الفكرة أو البدء في إنشاء التطبيق.",
  "es-ES": "Te he escuchado. Puedes editar la idea o empezar a crear la aplicación.",
  "fr-FR": "Je vous ai entendu. Vous pouvez modifier l’idée ou commencer à créer l’application.",
  "de-DE": "Ich habe Sie verstanden. Sie können die Idee bearbeiten oder die App erstellen.",
  "pt-BR": "Eu ouvi você. Você pode editar a ideia ou começar a criar o aplicativo.",
  "ru-RU": "Я вас услышал. Можно изменить идею или начать создание приложения.",
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

function detectLanguageFromText(text, fallback) {
  const value = String(text || "");
  if (/[\u4e00-\u9fff]/.test(value)) return fallback === "zh-HK" ? "zh-HK" : "zh-CN";
  if (/[\u3040-\u30ff]/.test(value)) return "ja-JP";
  if (/[\uac00-\ud7af]/.test(value)) return "ko-KR";
  if (/[\u0e00-\u0e7f]/.test(value)) return "th-TH";
  if (/[\u0b80-\u0bff]/.test(value)) return "ta-MY";
  if (/[\u0900-\u097f]/.test(value)) return "hi-IN";
  if (/[\u0600-\u06ff]/.test(value)) return "ar-SA";
  if (/[\u0400-\u04ff]/.test(value)) return "ru-RU";
  return fallback;
}

function friendly(error) {
  const message = String(error?.message || error || "");
  if (/permission|notallowed|denied/i.test(message)) {
    return "Microphone is off. Enable Microphone for Safari in iPhone Settings, then try again.";
  }
  if (/no-speech/i.test(message)) return "No speech was detected. Move closer to the microphone and try again.";
  if (/language-not-supported/i.test(message)) return "This language is not supported by the current browser voice engine. Please choose another language.";
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
  const audio = useRef(null);
  const finalText = useRef("");

  useEffect(() => () => {
    try { speech.current?.abort(); } catch {}
    try { audio.current?.player?.pause(); if (audio.current?.url) URL.revokeObjectURL(audio.current.url); } catch {}
    try { window.speechSynthesis?.cancel(); } catch {}
  }, []);

  function deviceLanguage() {
    const preferred = navigator.languages?.[0] || navigator.language || document.documentElement.lang || "en-US";
    return normalizeLanguage(preferred);
  }

  function recognitionLanguage() {
    return language === "auto" ? deviceLanguage() : language;
  }

  function speakWithDevice(message, selected) {
    if (!("speechSynthesis" in window) || !window.SpeechSynthesisUtterance) {
      setStatus("Voice output is not supported by this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = selected;
    utterance.rate = 0.95;
    utterance.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const exactVoice = voices.find((voice) => normalizeLanguage(voice.lang) === selected);
    if (exactVoice) utterance.voice = exactVoice;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => {
      setSpeaking(false);
      setStatus("Voice output could not be played. Check that the iPhone is not in silent mode.");
    };
    window.speechSynthesis.speak(utterance);
    window.speechSynthesis.resume();
  }

  async function speak(value, requestedLanguage) {
    const message = String(value || "").trim();
    if (!message) return;
    const selected = detectLanguageFromText(message, requestedLanguage || recognitionLanguage());
    stopSpeaking();
    try {
      const response = await fetch("/api/soolenai/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message, language: selected }),
      });
      if (!response.ok) throw new Error("Use device voice fallback.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const player = new Audio(url);
      audio.current = { player, url };
      player.onplay = () => setSpeaking(true);
      player.onended = () => {
        setSpeaking(false);
        URL.revokeObjectURL(url);
        if (audio.current?.url === url) audio.current = null;
      };
      player.onerror = () => {
        setSpeaking(false);
        URL.revokeObjectURL(url);
        if (audio.current?.url === url) audio.current = null;
        speakWithDevice(message, selected);
      };
      await player.play();
    } catch {
      speakWithDevice(message, selected);
    }
  }

  function speakConfirmation() {
    const selected = detectLanguageFromText(finalText.current, recognitionLanguage());
    speak(ACKNOWLEDGEMENTS[selected] || ACKNOWLEDGEMENTS["en-US"], selected);
  }

  function start() {
    if (recording) return;
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setStatus("Voice recognition is not available in this browser. On iPhone, open this website in Safari.");
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
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const transcript = event.results[index][0]?.transcript || "";
          if (event.results[index].isFinal) completed = `${completed} ${transcript}`.trim();
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
          setStatus("Speech captured. Review the text, play it back, or send it to the builder.");
          if (voiceReply) speakConfirmation();
        }
      };

      speech.current = recognition;
      recognition.start();
      setRecording(true);
      setStatus(`Listening in ${LANGUAGES.find(([code]) => code === recognition.lang)?.[1] || recognition.lang}…`);
    } catch (error) {
      setStatus(friendly(error));
      setRecording(false);
    }
  }

  function stop() {
    if (speech.current) {
      try { speech.current.stop(); } catch {}
    }
    setRecording(false);
  }

  function stopSpeaking() {
    try { window.speechSynthesis.cancel(); } catch {}
    try {
      audio.current?.player?.pause();
      if (audio.current?.url) URL.revokeObjectURL(audio.current.url);
      audio.current = null;
    } catch {}
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
      <button className="sv-fab" onClick={() => { setOpen(true); setStatus(""); }}>🎙️<span>Voice Idea</span></button>
      {open && (
        <div className="sv-backdrop">
          <div className="sv-panel">
            <button className="sv-close" onClick={() => { stop(); stopSpeaking(); setOpen(false); }}>×</button>
            <div className="sv-kicker">SOOLEN AI · MULTILINGUAL VOICE</div>
            <h2>Speak in your language</h2>
            <p>Choose a language for best accuracy. Auto follows your iPhone language.</p>

            <label>VOICE LANGUAGE</label>
            <select value={language} onChange={(event) => setLanguage(event.target.value)} disabled={recording}>
              {LANGUAGES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>

            <button className={recording ? "sv-mic recording" : "sv-mic"} onClick={recording ? stop : start}>
              {recording ? "■ STOP LISTENING" : "🎙️ START TALKING"}
            </button>

            <label>YOUR APP IDEA</label>
            <textarea value={text} onChange={(event) => { setText(event.target.value); finalText.current = event.target.value; }} placeholder="Speak or type in any supported language." />

            <div className="sv-actions">
              <button className="sv-play" onClick={speaking ? stopSpeaking : () => speak(text, recognitionLanguage())} disabled={!text.trim()}>
                {speaking ? "■ STOP VOICE" : "🔊 PLAY BACK"}
              </button>
              <label className="sv-toggle"><input type="checkbox" checked={voiceReply} onChange={(event) => setVoiceReply(event.target.checked)} /> AI voice confirmation</label>
            </div>

            <button className="sv-build" onClick={sendToBuilder}>🚀 BUILD MY APP →</button>
            <button className="sv-center" onClick={() => window.location.assign("/soolen-ai")}>✦ OPEN SOOLEN AI CAPABILITY CENTER</button>
            {status && <div className="sv-status">{status}</div>}
            <small className="privacy">Microphone starts only after you tap START TALKING. Audio stays in the browser voice service.</small>
          </div>
        </div>
      )}
      <style jsx global>{`
        .sv-fab{position:fixed;right:18px;bottom:18px;z-index:40;border:1px solid #dfb853;border-radius:999px;padding:14px 20px;background:linear-gradient(135deg,#063b30,#0c8d62);color:#fff;font-size:16px;font-weight:900;box-shadow:0 14px 35px #0005;cursor:pointer}.sv-fab span{margin-left:8px}
        .sv-backdrop{position:fixed;inset:0;z-index:50;background:#001712cc;backdrop-filter:blur(8px);display:grid;place-items:center;padding:18px}
        .sv-panel{position:relative;width:min(540px,100%);max-height:94vh;overflow:auto;background:linear-gradient(180deg,#f8fbf9,#edf4f0);color:#102e25;border:1px solid #d5b45c;border-radius:28px;padding:30px;box-shadow:0 30px 90px #0007}
        .sv-close{position:absolute;right:16px;top:10px;border:0;background:none;font-size:34px;color:#526b62}.sv-kicker{font-size:11px;letter-spacing:.18em;color:#087b55;font-weight:950}
        .sv-panel h2{font-size:34px;line-height:1.08;margin:12px 35px 10px 0}.sv-panel p{font-size:16px;line-height:1.55;color:#61736d}
        .sv-panel>label{display:block;font-size:12px;font-weight:900;margin:12px 0 8px}.sv-panel select{width:100%;border:1px solid #cfdcd6;border-radius:13px;padding:13px;background:#fff;color:#12372c;font:inherit}
        .sv-mic,.sv-build,.sv-play,.sv-center{border:0;border-radius:16px;padding:16px;font-size:16px;font-weight:950;cursor:pointer}.sv-mic{width:100%;background:#0b4739;color:#fff;margin:12px 0 18px}.sv-mic.recording{background:#9b4339}
        .sv-panel textarea{width:100%;min-height:140px;border:1px solid #cfdcd6;border-radius:16px;padding:15px;font:inherit;color:#12372c;background:#fff;box-sizing:border-box}
        .sv-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:center;margin-top:10px}.sv-play{background:#dfeae5;color:#164c3c}.sv-play:disabled{opacity:.5}.sv-toggle{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:800}.sv-toggle input{width:auto;margin:0}
        .sv-build{width:100%;margin-top:12px;background:linear-gradient(135deg,#ffe797,#dca63b);color:#171006;box-shadow:0 10px 25px #c9973644}.sv-center{width:100%;margin-top:9px;background:#14392e;color:#fff;border:0;border-radius:14px;padding:13px;font-weight:900}
        .sv-status{margin-top:12px;padding:11px;border-radius:11px;background:#e5eee9;color:#34594c;font-size:13px}.privacy{display:block;text-align:center;margin-top:12px;color:#71827c}
        @media(max-width:600px){.sv-panel{padding:25px 20px}.sv-panel h2{font-size:29px}.sv-fab{right:14px;bottom:14px}.sv-actions{grid-template-columns:1fr}}
      `}</style>
    </>
  );
}
