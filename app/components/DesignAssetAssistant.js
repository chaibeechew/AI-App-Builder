"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const STYLE_CHOICES = ["Premium", "Minimal", "Playful", "Cinematic", "Corporate", "Editorial"];
const LAYOUT_CHOICES = ["Story landing page", "Dashboard", "Marketplace", "Mobile-first cards", "Full-screen visual"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 40 * 1024 * 1024;

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read this file."));
    reader.readAsDataURL(file);
  });
}

function videoPoster(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, Math.max(0, (video.duration || 1) / 4));
    };
    video.onseeked = () => {
      try {
        const width = Math.min(1280, video.videoWidth || 720);
        const height = Math.max(1, Math.round(width * (video.videoHeight || 720) / (video.videoWidth || 1280)));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(video, 0, 0, width, height);
        resolve({ poster: canvas.toDataURL("image/jpeg", .82), duration: video.duration || 0, preview: url });
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Unable to read this video.")); };
    video.src = url;
  });
}

function visualHints(imageData, file) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 48; canvas.height = 48;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(image, 0, 0, 48, 48);
      const pixels = context.getImageData(0, 0, 48, 48).data;
      const buckets = new Map(); let light = 0; let dark = 0; let saturation = 0;
      for (let index = 0; index < pixels.length; index += 16) {
        const red = pixels[index], green = pixels[index + 1], blue = pixels[index + 2];
        const max = Math.max(red, green, blue), min = Math.min(red, green, blue);
        const luminance = .2126 * red + .7152 * green + .0722 * blue;
        if (luminance > 210) light++; if (luminance < 55) dark++;
        saturation += max ? (max - min) / max : 0;
        const key = [red, green, blue].map((value) => Math.min(255, Math.round(value / 48) * 48).toString(16).padStart(2, "0")).join("");
        buckets.set(key, (buckets.get(key) || 0) + 1);
      }
      const total = pixels.length / 16;
      const dominantColors = [...buckets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([value]) => `#${value}`);
      const detectedRegions = [
        image.width > image.height * 1.2 ? "landscape-layout" : image.height > image.width * 1.2 ? "portrait-mobile-layout" : "balanced-square-layout",
        dark / total > .45 ? "dark-background" : light / total > .45 ? "light-background" : "mixed-lighting",
        saturation / total < .16 ? "low-saturation-or-sketch" : "color-rich-reference",
      ];
      resolve({ dominantColors, detectedRegions, likelyUI: /sketch|wire|mock|screen|layout|稿|界面|排版/i.test(file?.name || "") || saturation / total < .12 });
    };
    image.onerror = () => resolve({ dominantColors: [], detectedRegions: [], likelyUI: false });
    image.src = imageData;
  });
}

async function inspectImage(imageData, file, extra = {}) {
  const hints = await visualHints(imageData, file);
  const response = await fetch("/api/images/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageData,
      mimeType: extra.kind === "video" ? "image/jpeg" : file.type || "image/jpeg",
      uiAnalysis: {
        likelyUI: hints.likelyUI,
        detectedRegions: [...(extra.kind === "video" ? ["video-reference-frame"] : ["visual-reference"]), ...hints.detectedRegions],
        dominantColors: hints.dominantColors,
        textHints: [file.name],
      },
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "Visual analysis failed.");
  let result = {};
  try { result = JSON.parse(data.result || "{}"); } catch {}
  return result;
}

export default function DesignAssetAssistant({ mode = "create", initialBrief = "", onBriefChange, onContinue }) {
  const inputRef = useRef(null);
  const assetsRef = useRef([]);
  const [assets, setAssets] = useState([]);
  const [style, setStyle] = useState("");
  const [layout, setLayout] = useState("");
  const [background, setBackground] = useState("");
  const [notes, setNotes] = useState(initialBrief);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const brief = useMemo(() => {
    const references = assets.map((asset, index) => {
      const size = asset.analysis?.dimensions;
      const colors = Array.isArray(asset.analysis?.dominantColors) ? asset.analysis.dominantColors.join(", ") : "";
      const regions = Array.isArray(asset.analysis?.detectedRegions) ? asset.analysis.detectedRegions.join(", ") : "";
      return `Reference ${index + 1}: ${asset.kind} "${asset.name}"${size ? ` (${size.width}×${size.height})` : ""}${asset.duration ? ` (${Math.round(asset.duration)}s)` : ""}. Visual cues: ${[regions, colors && `palette ${colors}`].filter(Boolean).join("; ") || "general visual reference"}. Use it for visual direction and layout only; do not identify private people.`;
    });
    return [
      "SOOLEN DESIGN COLLABORATION BRIEF",
      style && `Visual style: ${style}.`,
      layout && `Preferred layout: ${layout}.`,
      background && `Background, color and atmosphere: ${background}.`,
      notes && `User design notes: ${notes}.`,
      ...references,
      "Keep all required app and customer website functions working. Adapt the design responsively for phone and desktop.",
    ].filter(Boolean).join("\n");
  }, [assets, background, layout, notes, style]);

  useEffect(() => { onBriefChange?.(brief); }, [brief, onBriefChange]);
  useEffect(() => { assetsRef.current = assets; }, [assets]);
  useEffect(() => () => assetsRef.current.forEach((asset) => asset.objectUrl && URL.revokeObjectURL(asset.objectUrl)), []);

  async function addFiles(event) {
    const files = Array.from(event.target.files || []).slice(0, 6);
    event.target.value = "";
    if (!files.length) return;
    setBusy(true);
    setError("");
    try {
      for (const file of files) {
        const isVideo = file.type.startsWith("video/");
        const isImage = file.type.startsWith("image/");
        if (!isImage && !isVideo) throw new Error(`${file.name}: please upload an image, sketch or video.`);
        if (isImage && file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name}: image must be under 5 MB.`);
        if (isVideo && file.size > MAX_VIDEO_BYTES) throw new Error(`${file.name}: video must be under 40 MB.`);
        if (isVideo) {
          const frame = await videoPoster(file);
          const analysis = await inspectImage(frame.poster, file, { kind: "video" });
          setAssets((value) => [...value, { id: crypto.randomUUID(), kind: "video", name: file.name, preview: frame.preview, objectUrl: frame.preview, poster: frame.poster, duration: frame.duration, analysis }]);
        } else {
          const dataUrl = await readAsDataUrl(file);
          const analysis = await inspectImage(dataUrl, file, { kind: /sketch|wire|稿/i.test(file.name) ? "sketch" : "image" });
          setAssets((value) => [...value, { id: crypto.randomUUID(), kind: /sketch|wire|稿/i.test(file.name) ? "sketch" : "image", name: file.name, preview: dataUrl, analysis }]);
        }
      }
    } catch (err) {
      setError(err?.message || "Unable to analyze this reference.");
    } finally {
      setBusy(false);
    }
  }

  function removeAsset(id) {
    setAssets((value) => {
      const target = value.find((asset) => asset.id === id);
      if (target?.objectUrl) URL.revokeObjectURL(target.objectUrl);
      return value.filter((asset) => asset.id !== id);
    });
  }

  return <section className="designAssistant">
    <div className="assistantHeading">
      <div><small>AI DESIGN CONVERSATION</small><h3>{mode === "create" ? "Show AI what you want" : "Modify with references"}</h3></div>
      <button type="button" className="uploadButton" onClick={() => inputRef.current?.click()} disabled={busy}>{busy ? "Analyzing…" : "＋ Photo · Sketch · Video"}</button>
      <input ref={inputRef} hidden type="file" multiple accept="image/*,video/*" onChange={addFiles}/>
    </div>
    <p className="helper">Upload references, your own drawing, a demo screen or a short video. AI extracts visual structure and adds it to the design conversation.</p>
    {!!assets.length && <div className="assetGrid">{assets.map((asset) => <article key={asset.id}>
      {asset.kind === "video" ? <video src={asset.preview} poster={asset.poster} controls muted/> : <img src={asset.preview} alt={asset.name}/>}
      <div><b>{asset.kind === "sketch" ? "Sketch" : asset.kind === "video" ? "Video" : "Image"}</b><span>{asset.name}</span></div>
      <button type="button" onClick={() => removeAsset(asset.id)} aria-label={`Remove ${asset.name}`}>×</button>
    </article>)}</div>}
    <div className="guide">
      <label>Style<div className="chips">{STYLE_CHOICES.map((value) => <button type="button" key={value} className={style === value ? "selected" : ""} onClick={() => setStyle(value)}>{value}</button>)}</div></label>
      <label>Layout<div className="chips">{LAYOUT_CHOICES.map((value) => <button type="button" key={value} className={layout === value ? "selected" : ""} onClick={() => setLayout(value)}>{value}</button>)}</div></label>
      <label>Talk to AI about the background, colors and atmosphere<input maxLength={500} value={background} onChange={(event) => setBackground(event.target.value)} placeholder="Example: deep jade glass cards, cinematic city at night, gold details"/></label>
      <label>What should AI keep, change or emphasize?<textarea maxLength={1800} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Example: follow my sketch for the home page; keep checkout simple; show the product video near the top."/></label>
    </div>
    {error && <p className="assistantError">{error}</p>}
    <div className="briefStatus"><span>✓ Design brief ready</span><small>{assets.length} reference{assets.length === 1 ? "" : "s"} · editable before AI builds</small></div>
    {onContinue && <button type="button" className="continueButton" onClick={() => onContinue(brief)} disabled={busy}>Continue in Modify →</button>}
    <style jsx>{`
      .designAssistant{margin-top:16px;padding:18px;border:1px solid rgba(227,187,88,.28);border-radius:20px;background:rgba(2,18,13,.76);color:#eefbf4}.assistantHeading{display:flex;justify-content:space-between;gap:12px;align-items:center}.assistantHeading small{color:#dfbd62;letter-spacing:.14em;font-weight:900}.assistantHeading h3{margin:5px 0;font-size:20px}.uploadButton,.continueButton{border:1px solid rgba(227,187,88,.45);border-radius:12px;padding:10px 13px;background:linear-gradient(135deg,#f2d784,#c8932e);color:#07130e;font-weight:900}.helper{margin:8px 0 14px;color:#9fb4a9;font-size:13px;line-height:1.5}.assetGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:9px;margin-bottom:14px}.assetGrid article{position:relative;overflow:hidden;border:1px solid #ffffff18;border-radius:13px;background:#071b13}.assetGrid img,.assetGrid video{width:100%;height:95px;object-fit:cover;display:block}.assetGrid article div{padding:8px;display:grid;gap:2px}.assetGrid b{font-size:11px;color:#dfbd62}.assetGrid span{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.assetGrid article>button{position:absolute;right:6px;top:6px;width:25px;height:25px;border:0;border-radius:50%;background:#06150fd9;color:#fff;font-size:18px}.guide{display:grid;gap:12px}.guide label{display:grid;gap:7px;color:#d7e5dd;font-size:12px;font-weight:800}.chips{display:flex;gap:6px;flex-wrap:wrap}.chips button{border:1px solid #ffffff20;border-radius:999px;padding:7px 10px;background:#ffffff08;color:#c8d8d0}.chips button.selected{border-color:#dfbd62;background:#dfbd6220;color:#f4d77e}.guide input,.guide textarea{width:100%;box-sizing:border-box;border:1px solid #ffffff1c;border-radius:11px;padding:11px;background:#04130e;color:#fff;outline:none}.guide textarea{min-height:78px;resize:vertical}.assistantError{color:#ff9b9b;font-size:12px}.briefStatus{margin-top:12px;display:flex;justify-content:space-between;gap:8px;color:#82d7ae}.briefStatus small{color:#789187}.continueButton{width:100%;margin-top:13px}@media(max-width:620px){.assistantHeading,.briefStatus{align-items:flex-start;flex-direction:column}.uploadButton{width:100%}}
    `}</style>
  </section>;
}
