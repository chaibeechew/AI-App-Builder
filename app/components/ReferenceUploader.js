"use client";

import { useMemo, useRef, useState } from "react";

const MAX_FILES = 8;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;

function fileKind(file) {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "file";
}

function readableSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ReferenceUploader() {
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const countLabel = useMemo(() => items.length ? `${items.length} reference${items.length > 1 ? "s" : ""}` : "Add references", [items.length]);

  function choose() {
    inputRef.current?.click();
  }

  function addFiles(event) {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selected.length) return;

    const room = Math.max(0, MAX_FILES - items.length);
    if (!room) {
      setError(`Maximum ${MAX_FILES} references per build.`);
      return;
    }

    const accepted = [];
    for (const file of selected.slice(0, room)) {
      const kind = fileKind(file);
      const max = kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      if (kind === "file") continue;
      if (file.size > max) {
        setError(`${file.name} is too large. Images/sketches: 12 MB max. Video: 80 MB max.`);
        continue;
      }
      accepted.push({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        size: file.size,
        type: file.type,
        kind,
        file,
        url: URL.createObjectURL(file),
      });
    }

    if (accepted.length) {
      setItems((current) => [...current, ...accepted]);
      setError("");
      try {
        sessionStorage.setItem("soolenReferenceSummary", JSON.stringify(accepted.map((item) => ({ name: item.name, type: item.type, kind: item.kind }))));
      } catch {}
    }
  }

  function remove(id) {
    setItems((current) => {
      const target = current.find((item) => item.id === id);
      if (target?.url) URL.revokeObjectURL(target.url);
      return current.filter((item) => item.id !== id);
    });
  }

  return (
    <div className="referenceDock">
      <input ref={inputRef} hidden type="file" multiple accept="image/*,video/*" onChange={addFiles} />
      <button className="referenceTrigger" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span>＋</span><b>{countLabel}</b>
      </button>

      {open && <section className="referencePanel">
        <div className="referenceHead">
          <div><small>AI REFERENCES</small><h3>Show AI what you mean.</h3></div>
          <button type="button" onClick={() => setOpen(false)}>×</button>
        </div>
        <p>Upload photos, screenshots, video or hand-drawn sketches. SoolenAI uses them as inspiration and requirements context — never as a copy command.</p>

        <button className="referenceDrop" type="button" onClick={choose}>
          <b>Upload Photo · Video · Sketch</b>
          <span>Images/sketches up to 12 MB · video up to 80 MB · max {MAX_FILES} files</span>
        </button>

        {!!items.length && <div className="referenceGrid">
          {items.map((item) => <article key={item.id}>
            {item.kind === "image" ? <img src={item.url} alt="User reference preview"/> : <video src={item.url} muted playsInline/>}
            <div><b>{item.kind === "image" ? "Image / sketch" : "Video reference"}</b><small>{readableSize(item.size)}</small></div>
            <button type="button" onClick={() => remove(item.id)}>Remove</button>
          </article>)}
        </div>}

        {error && <div className="referenceError">{error}</div>}
        <div className="referenceRule"><b>AI rule:</b> Analyze → understand → reimagine → generate an original App + Website. Do not copy third-party branding, text, images, code or distinctive layouts.</div>
      </section>}

      <style jsx>{`
        .referenceDock{position:fixed;right:18px;bottom:86px;z-index:80;font-family:Inter,system-ui,sans-serif}.referenceTrigger{display:flex;align-items:center;gap:9px;border:1px solid #e0bd61aa;border-radius:999px;background:#061611e8;color:#f4d274;padding:11px 15px;box-shadow:0 14px 45px #0008;backdrop-filter:blur(12px)}.referenceTrigger span{font-size:20px}.referenceTrigger b{font-size:12px}.referencePanel{position:absolute;right:0;bottom:54px;width:min(420px,calc(100vw - 24px));max-height:70vh;overflow:auto;background:#f8fbf9;color:#17352d;border:1px solid #ddb95d;border-radius:22px;padding:18px;box-shadow:0 24px 70px #0009}.referenceHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.referenceHead small{color:#9c7428;font-size:10px;font-weight:900;letter-spacing:.16em}.referenceHead h3{font-size:25px;margin:4px 0}.referenceHead>button{border:0;background:#e9efec;border-radius:10px;width:34px;height:34px;font-size:24px}.referencePanel>p{color:#63746d;line-height:1.55;font-size:13px}.referenceDrop{width:100%;border:1px dashed #b89443;border-radius:16px;background:#fff9e9;padding:18px;text-align:left;color:#244138}.referenceDrop b,.referenceDrop span{display:block}.referenceDrop span{font-size:11px;color:#7e7b68;margin-top:5px}.referenceGrid{display:grid;gap:9px;margin-top:12px}.referenceGrid article{display:grid;grid-template-columns:68px 1fr auto;align-items:center;gap:10px;border:1px solid #dde5e1;border-radius:13px;padding:8px;background:#fff}.referenceGrid img,.referenceGrid video{width:68px;height:52px;object-fit:cover;border-radius:9px;background:#102018}.referenceGrid article div b,.referenceGrid article div small{display:block}.referenceGrid article div b{font-size:12px}.referenceGrid article div small{font-size:10px;color:#718078;margin-top:3px}.referenceGrid article>button{border:0;background:#eef3f0;border-radius:8px;padding:8px;font-size:10px}.referenceRule{margin-top:12px;background:#e8f4ee;color:#315d4d;padding:11px;border-radius:12px;font-size:11px;line-height:1.5}.referenceError{margin-top:10px;background:#fff0ed;color:#9b3b32;padding:10px;border-radius:11px;font-size:11px}@media(max-width:640px){.referenceDock{right:12px;bottom:78px}.referencePanel{width:calc(100vw - 24px)}.referenceTrigger b{max-width:170px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
      `}</style>
    </div>
  );
}
