"use client";

import { useEffect, useRef, useState } from "react";
import { PRODUCT_BRAND } from "../../lib/product-brand.js";
import {
  VOICE_IDEA_POLICY,
  VOICE_LANGUAGE_CODES,
  normalizeVoiceLanguage,
  sanitizeVoiceIdea,
  voiceErrorMessage,
} from "../../lib/voice/voice-idea-policy.js";

const LANGUAGE_LABELS = {
  "zh-CN":"中文（普通话）","zh-HK":"粤语（香港）","en-US":"English","ms-MY":"Bahasa Melayu","id-ID":"Bahasa Indonesia","ta-MY":"தமிழ்","hi-IN":"हिन्दी","ja-JP":"日本語","ko-KR":"한국어","th-TH":"ไทย","vi-VN":"Tiếng Việt","ar-SA":"العربية","es-ES":"Español","fr-FR":"Français","de-DE":"Deutsch","pt-BR":"Português","ru-RU":"Русский",
};
const LANGUAGES = [["auto","Auto · Follow device"], ...VOICE_LANGUAGE_CODES.map((code)=>[code, LANGUAGE_LABELS[code] || code])];
const ACK = {
  "zh-CN":"我听到了。你可以继续修改，或者开始制作你的 APP、游戏或网站。",
  "zh-HK":"我聽到了。你可以繼續修改，或者開始製作你的 APP、遊戲或網站。",
  "ms-MY":"Saya sudah dengar. Anda boleh terus mengubah atau mula mencipta app, game atau website anda.",
  "id-ID":"Saya sudah mendengar. Anda dapat mengubahnya atau mulai membuat app, game, atau website.",
  "en-US":"I heard you. You can keep editing or start creating your app, game or website.",
};

export default function SoolenVoiceAssistant() {
  const [open,setOpen]=useState(false);
  const [recording,setRecording]=useState(false);
  const [speaking,setSpeaking]=useState(false);
  const [status,setStatus]=useState("");
  const [text,setText]=useState("");
  const [language,setLanguage]=useState("auto");
  const [voiceReply,setVoiceReply]=useState(true);
  const recognitionRef=useRef(null);
  const timeoutRef=useRef(null);
  const finalTextRef=useRef("");

  function resolvedLanguage(){
    const device = typeof navigator !== "undefined" ? (navigator.languages?.[0] || navigator.language || "en-US") : "en-US";
    return language === "auto" ? normalizeVoiceLanguage(device) : normalizeVoiceLanguage(language);
  }

  function clearListeningTimeout(){
    if(timeoutRef.current){window.clearTimeout(timeoutRef.current);timeoutRef.current=null;}
  }

  function stopRecognition({abort=false}={}){
    clearListeningTimeout();
    const recognition=recognitionRef.current;
    recognitionRef.current=null;
    try{abort?recognition?.abort():recognition?.stop();}catch{}
    setRecording(false);
  }

  function stopSpeaking(){
    try{window.speechSynthesis?.cancel();}catch{}
    setSpeaking(false);
  }

  useEffect(()=>{
    const stopForLifecycle=()=>stopRecognition({abort:true});
    const onVisibility=()=>{if(document.visibilityState==="hidden")stopForLifecycle();};
    window.addEventListener("pagehide",stopForLifecycle);
    document.addEventListener("visibilitychange",onVisibility);
    return()=>{
      window.removeEventListener("pagehide",stopForLifecycle);
      document.removeEventListener("visibilitychange",onVisibility);
      stopRecognition({abort:true});
      stopSpeaking();
    };
  },[]);

  function speak(value){
    const message=sanitizeVoiceIdea(value);
    if(!message || !("speechSynthesis" in window) || !window.SpeechSynthesisUtterance)return;
    stopSpeaking();
    const utterance=new SpeechSynthesisUtterance(message);
    utterance.lang=resolvedLanguage();
    utterance.rate=.95;
    utterance.onstart=()=>setSpeaking(true);
    utterance.onend=()=>setSpeaking(false);
    utterance.onerror=()=>setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function start(){
    if(recording || recognitionRef.current)return;
    setStatus("");
    try{
      const SpeechRecognition=window.SpeechRecognition || window.webkitSpeechRecognition;
      if(!SpeechRecognition){setStatus("Voice recognition is unavailable in this browser. You can still type your idea below.");return;}
      const recognition=new SpeechRecognition();
      recognition.lang=resolvedLanguage();
      recognition.continuous=!/iPhone|iPad|iPod/i.test(navigator.userAgent);
      recognition.interimResults=VOICE_IDEA_POLICY.interimResults;
      recognition.maxAlternatives=VOICE_IDEA_POLICY.maxAlternatives;
      finalTextRef.current=sanitizeVoiceIdea(text);
      recognition.onresult=(event)=>{
        let completed=finalTextRef.current;
        let interim="";
        for(let index=event.resultIndex;index<event.results.length;index+=1){
          const transcript=String(event.results[index][0]?.transcript||"");
          if(event.results[index].isFinal)completed=sanitizeVoiceIdea(`${completed} ${transcript}`);
          else interim+=` ${transcript}`;
        }
        finalTextRef.current=completed;
        setText(sanitizeVoiceIdea(`${completed} ${interim}`));
      };
      recognition.onerror=(event)=>{
        if(event.error!=="aborted")setStatus(voiceErrorMessage(event));
        stopRecognition({abort:true});
      };
      recognition.onend=()=>{
        clearListeningTimeout();
        recognitionRef.current=null;
        setRecording(false);
        const captured=sanitizeVoiceIdea(finalTextRef.current);
        if(captured){
          setText(captured);
          setStatus("Speech captured. Review it or start creating.");
          if(voiceReply)speak(ACK[resolvedLanguage()]||ACK["en-US"]);
        }
      };
      recognitionRef.current=recognition;
      recognition.start();
      setRecording(true);
      setStatus("Listening…");
      timeoutRef.current=window.setTimeout(()=>{
        stopRecognition();
        setStatus("Voice capture stopped after 60 seconds. Review the text or tap again to continue.");
      },VOICE_IDEA_POLICY.maxListeningMs);
    }catch(error){
      stopRecognition({abort:true});
      setStatus(voiceErrorMessage(error));
    }
  }

  function sendToBuilder(){
    const value=sanitizeVoiceIdea(text);
    if(!value){setStatus("Tell us what you want to create first.");return;}
    try{sessionStorage.setItem("soolenAppIdea",value);}catch{}
    try{window.dispatchEvent(new CustomEvent("soolen-app-idea",{detail:{idea:value,source:"voice"}}));}catch{}
    stopRecognition({abort:true});
    stopSpeaking();
    setOpen(false);
    setStatus("");
  }

  function close(){stopRecognition({abort:true});stopSpeaking();setOpen(false);setStatus("");}

  return <>
    <button className="sv-fab" onClick={()=>{setOpen(true);setStatus("");}} aria-label="Voice idea">🎙️<span>Voice Idea</span></button>
    {open&&<div className="sv-backdrop" role="dialog" aria-modal="true" aria-label="Voice Idea">
      <div className="sv-panel">
        <button className="sv-close" onClick={close} aria-label="Close Voice Idea">×</button>
        <div className="sv-topline"><div className="sv-globe">◎</div><div className="sv-brand">{PRODUCT_BRAND.name}<div className="sv-brandline"/></div><div className="sv-langtag">AI</div></div>
        <div className="sv-heroicon">🎙️</div>
        <h2>Speak in your language</h2>
        <p className="sv-sub">Voice starts only after you tap the microphone. Browser or device speech services may process recognition according to their own privacy settings.</p>
        <label className="sv-label">VOICE LANGUAGE</label>
        <select value={language} onChange={(event)=>setLanguage(event.target.value)} disabled={recording}>{LANGUAGES.map(([code,label])=><option key={code} value={code}>{label}</option>)}</select>
        <div className="sv-voicecard">
          <button className={recording?"sv-mic recording":"sv-mic"} onClick={recording?()=>stopRecognition():start} aria-label={recording?"Stop listening":"Start listening"}><span>🎤</span></button>
          <strong>{recording?"Listening…":"Tap to start speaking"}</strong>
          <span>{recording?"Speak naturally. Capture automatically stops after 60 seconds.":"You can always type or edit the transcript before sending it to Builder."}</span>
          <button className="sv-play" onClick={speaking?stopSpeaking:()=>speak(text)} disabled={!text.trim()}>{speaking?"■ STOP PLAYBACK":"▶ PLAY BACK TEXT"}</button>
        </div>
        <label className="sv-label">YOUR IDEA</label>
        <textarea value={text} maxLength={VOICE_IDEA_POLICY.maxTranscriptLength} onChange={(event)=>{const value=sanitizeVoiceIdea(event.target.value);setText(value);finalTextRef.current=value;}} placeholder="Speak or type the app, game or website you want to create."/>
        <div className="sv-count">{text.length}/{VOICE_IDEA_POLICY.maxTranscriptLength}</div>
        <label className="sv-toggle"><input type="checkbox" checked={voiceReply} onChange={(event)=>setVoiceReply(event.target.checked)}/> AI voice confirmation</label>
        <button className="sv-build" onClick={sendToBuilder}>CREATE APP · WEB · GAME →</button>
        {status&&<div className="sv-status" role="status">{status}</div>}
      </div>
    </div>}
    <style jsx global>{`
      .sv-fab{position:fixed;right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));z-index:40;min-height:48px;border:1px solid #e1b83d;border-radius:999px;padding:12px 18px;background:#0a6d54;color:#fff;font-size:15px;font-weight:900;box-shadow:0 14px 35px #0005}.sv-fab span{margin-left:8px}
      .sv-backdrop{position:fixed;inset:0;z-index:50;background:#00130fe8;backdrop-filter:blur(8px);display:grid;place-items:center;padding:12px}.sv-panel{position:relative;width:min(560px,100%);max-height:min(900px,96svh);overflow:auto;background:#fffdf7;color:#151d1a;border-radius:28px;padding:28px;box-shadow:0 30px 90px #0008}.sv-close{position:absolute;right:12px;top:8px;min-width:44px;min-height:44px;border:0;background:none;font-size:31px;color:#68716d}.sv-topline{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;margin-bottom:18px}.sv-globe{font-size:29px;color:#f4b71b;font-weight:900}.sv-brand{text-align:center;font-size:22px;font-weight:950}.sv-brandline{width:74px;height:4px;border-radius:999px;background:#f3b617;margin:7px auto 0}.sv-langtag{justify-self:end;border:1px solid #eee3cf;border-radius:13px;padding:9px;font-weight:900}.sv-heroicon{width:82px;height:82px;border-radius:999px;display:grid;place-items:center;margin:8px auto 14px;background:#fff4cf;font-size:38px}.sv-panel h2{text-align:center;font-size:32px;line-height:1.08;margin:0 0 9px}.sv-sub{text-align:center;font-size:14px;line-height:1.55;color:#69716d;margin:0 auto 22px;max-width:470px}.sv-label{display:block;font-size:11px;font-weight:950;margin:14px 0 7px;letter-spacing:.05em}.sv-panel select,.sv-panel textarea{width:100%;border:1px solid #ddd8cb;border-radius:15px;padding:13px 15px;background:#fff;color:#17201d;font:inherit;font-size:16px;box-sizing:border-box}.sv-panel textarea{min-height:126px;resize:vertical}.sv-voicecard{border:1px solid #eee4d1;border-radius:22px;padding:20px;text-align:center;background:#fffefb;margin-top:16px}.sv-mic{width:82px;height:82px;border:0;border-radius:999px;background:#ffc21f;box-shadow:0 12px 28px #d99c1745}.sv-mic.recording{animation:svpulse 1.2s infinite}.sv-mic span{font-size:31px}.sv-voicecard strong{display:block;font-size:20px;margin-top:13px}.sv-voicecard>span{display:block;color:#6f7672;margin:7px auto 14px;font-size:13px;line-height:1.45}.sv-play{width:100%;min-height:44px;border:0;border-radius:14px;padding:12px;background:#fff;color:#5d615f;box-shadow:0 6px 18px #0000000c;font-weight:900}.sv-play:disabled{opacity:.45}.sv-count{text-align:right;color:#888;font-size:10px;margin-top:4px}.sv-toggle{display:flex;align-items:center;gap:10px;font-weight:900;margin:16px 0 13px}.sv-toggle input{width:20px;height:20px;accent-color:#f1b517}.sv-build{width:100%;min-height:50px;border:0;border-radius:16px;padding:14px;background:linear-gradient(90deg,#ffd84c,#ffc11f);font-size:16px;font-weight:950}.sv-status{margin-top:11px;border-radius:13px;padding:10px 12px;background:#edf7f1;color:#1e5f49;font-size:12px;font-weight:750;line-height:1.45}@keyframes svpulse{0%,100%{box-shadow:0 0 0 0 #ffc21f55}50%{box-shadow:0 0 0 14px #ffc21f00}}
      @media(max-width:600px){.sv-backdrop{padding:0}.sv-panel{width:100%;height:100svh;max-height:none;border-radius:0;padding:calc(18px + env(safe-area-inset-top)) 16px calc(24px + env(safe-area-inset-bottom));}.sv-panel h2{font-size:28px}.sv-fab span{display:none}.sv-heroicon{width:70px;height:70px;font-size:32px}.sv-sub{font-size:13px}.sv-voicecard{padding:16px}.sv-mic{width:72px;height:72px}}
      @media(prefers-reduced-motion:reduce){.sv-mic.recording{animation:none}}
    `}</style>
  </>;
}
