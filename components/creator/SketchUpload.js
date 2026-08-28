"use client";

import { useRef, useState } from "react";

const MAX_BYTES = 4 * 1024 * 1024;

export default function SketchUpload({ onReady }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");

  function handleFile(file) {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please upload an image file.");
    if (file.size > MAX_BYTES) return setError("Please keep the sketch under 4 MB.");
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setPreview(dataUrl);
      onReady?.({ dataUrl, name: file.name, type: file.type, size: file.size });
    };
    reader.onerror = () => setError("Unable to read this image. Please try again.");
    reader.readAsDataURL(file);
  }

  return (
    <div className="soolen-sketch-upload">
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
      <button type="button" onClick={() => inputRef.current?.click()} className="soolen-sketch-button">
        <span aria-hidden="true">✏️</span>
        <span><b>Draw or upload a sketch</b><small>AI can turn your design into an app template.</small></span>
      </button>
      {preview && <img src={preview} alt="Uploaded app sketch preview" className="soolen-sketch-preview" />}
      {error && <p className="soolen-sketch-error">{error}</p>}
      <style jsx>{`
        .soolen-sketch-upload{display:grid;gap:10px;margin-top:12px}
        .soolen-sketch-button{display:flex;align-items:center;gap:12px;width:100%;padding:14px 16px;border:1px solid rgba(15,55,45,.14);border-radius:16px;background:rgba(255,255,255,.78);color:#12352c;text-align:left;cursor:pointer;box-shadow:0 8px 24px rgba(15,55,45,.08)}
        .soolen-sketch-button>span:first-child{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:#e6f3ee;font-size:20px}
        .soolen-sketch-button b,.soolen-sketch-button small{display:block}.soolen-sketch-button b{font-size:14px}.soolen-sketch-button small{margin-top:3px;font-size:11px;opacity:.7}
        .soolen-sketch-preview{width:100%;max-height:220px;object-fit:contain;border-radius:14px;border:1px solid rgba(15,55,45,.12);background:#fff}
        .soolen-sketch-error{margin:0;color:#a33a2b;font-size:12px}
      `}</style>
    </div>
  );
}
