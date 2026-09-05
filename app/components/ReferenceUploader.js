"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { REFERENCE_LIMITS, buildReferenceBrief, referenceKindFromMime, validateReferenceFileMeta } from "../../lib/media/reference-policy.js";
import { buildReferenceReusePlan, referenceIntelligenceFromAsset } from "../../lib/media/reference-reuse.js";

const sizeLabel = (bytes) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
function canvasBase64(canvas, q = .68) { return canvas.toDataURL("image/jpeg", q).split(",")[1] || ""; }
function boundedCanvasBase64(canvas) {
  for (const quality of [.68, .58, .48]) {
    const data = canvasBase64(canvas, quality);
    if (data && data.length <= REFERENCE_LIMITS.maxAnalysisItemBase64Chars) return data;
  }
  throw new Error("This reference is too detailed to analyze safely. Try a smaller image.");
}
async function hashFile(file) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
}
async function compressImage(file) {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 960 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return { mimeType: "image/jpeg", data: boundedCanvasBase64(canvas), kind: "image-or-sketch", name: file.name, sourceName: file.name };
  } finally {
    bitmap.close?.();
  }
}
function waitFor(target, name) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Media processing timed out.")), 12000);
    target.addEventListener(name, () => { clearTimeout(timer); resolve(); }, { once: true });
    target.addEventListener("error", () => { clearTimeout(timer); reject(new Error("Unable to read media.")); }, { once: true });
  });
}
async function frames(file) {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";
  const url = URL.createObjectURL(file);
  video.src = url;
  try {
    await waitFor(video, "loadedmetadata");
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
    const out = [];
    for (const [index, ratio] of [.08, .5, .9].entries()) {
      video.currentTime = Math.max(0, Math.min(Math.max(0, duration - .05), duration * ratio));
      await waitFor(video, "seeked");
      const scale = Math.min(1, 640 / Math.max(video.videoWidth || 1, video.videoHeight || 1));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round((video.videoWidth || 1) * scale));
      canvas.height = Math.max(1, Math.round((video.videoHeight || 1) * scale));
      canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
      out.push({ mimeType: "image/jpeg", data: boundedCanvasBase64(canvas), kind: `video-frame-${index + 1}`, name: `${file.name} frame ${index + 1}`, sourceName: file.name });
    }
    return out;
  } finally {
    video.removeAttribute("src");
    video.load?.();
    URL.revokeObjectURL(url);
  }
}
function cleanIntel(value) {
  if (!value || typeof value !== "object") return {};
  return {
    role: String(value.role || "content").slice(0, 40),
    label: String(value.label || "").slice(0, 120),
    subject: String(value.subject || "").slice(0, 240),
    description: String(value.description || "").slice(0, 600),
    tags: Array.isArray(value.tags) ? value.tags.slice(0, 12).map((item) => String(item).slice(0, 60)) : [],
    suggestedSections: Array.isArray(value.suggestedSections) ? value.suggestedSections.slice(0, 8).map((item) => String(item).slice(0, 80)) : [],
    confidence: Math.max(0, Math.min(1, Number(value.confidence) || 0)),
  };
}
function friendlyReferenceError(error) {
  const message = String(error?.message || "");
  if (/sign in|authentication/i.test(message)) return "Please sign in before preparing private project references.";
  if (/too large|too detailed/i.test(message)) return message;
  if (/supported image or video|empty or unreadable/i.test(message)) return message;
  if (/timed out|unable to read media/i.test(message)) return message;
  return "Unable to prepare these private references right now. Your original files were not shared across customers.";
}

export default function ReferenceUploader() {
  const supabase = useMemo(() => createClient(), []);
  const libraryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const previewUrls = useRef(new Set());
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => () => {
    for (const url of previewUrls.current) {
      try { URL.revokeObjectURL(url); } catch {}
    }
    previewUrls.current.clear();
  }, []);

  function addFiles(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    const room = Math.max(0, REFERENCE_LIMITS.maxFiles - items.length);
    let total = items.reduce((sum, item) => sum + Number(item.size || 0), 0);
    const accepted = [];
    for (const file of files.slice(0, room)) {
      const validation = validateReferenceFileMeta({ mimeType: file.type, size: file.size });
      if (!validation.ok) { setError(`${file.name}: ${validation.error}`); continue; }
      if (total + file.size > REFERENCE_LIMITS.maxTotalSourceBytes) {
        setError("Reference set is too large. Keep the selected files under 160 MB total.");
        break;
      }
      const url = URL.createObjectURL(file);
      previewUrls.current.add(url);
      total += file.size;
      accepted.push({ id: `${file.name}-${file.size}-${file.lastModified}`, file, name: file.name, size: file.size, type: String(file.type || "").toLowerCase(), kind: validation.kind, url });
    }
    if (accepted.length) {
      setItems((value) => [...value, ...accepted]);
      setReady(false);
      setError("");
    }
  }

  function remove(id) {
    setItems((value) => {
      const item = value.find((entry) => entry.id === id);
      if (item?.url) {
        URL.revokeObjectURL(item.url);
        previewUrls.current.delete(item.url);
      }
      return value.filter((entry) => entry.id !== id);
    });
    setReady(false);
  }

  async function fingerprintItems() {
    const fingerprinted = [];
    for (const item of items) {
      const validation = validateReferenceFileMeta({ mimeType: item.type, size: item.size });
      if (!validation.ok) throw new Error(validation.error);
      fingerprinted.push({ ...item, fingerprint: await hashFile(item.file) });
    }
    return fingerprinted;
  }

  async function findExistingAssets(userId, fingerprinted) {
    const fingerprints = [...new Set(fingerprinted.map((item) => item.fingerprint).filter(Boolean))];
    if (!fingerprints.length) return [];
    const { data, error: existingError } = await supabase.from("asset_library")
      .select("id,file_name,mime_type,category,intelligence,content_fingerprint")
      .eq("user_id", userId)
      .in("content_fingerprint", fingerprints);
    if (existingError) throw new Error("Unable to check your private asset library.");
    return Array.isArray(data) ? data : [];
  }

  async function saveAnalyzedAssets(analysisItems, intelligence, user) {
    if (!user?.id) throw new Error("Authentication required.");
    const byName = new Map((Array.isArray(intelligence) ? intelligence : []).map((item) => [String(item?.sourceName || ""), cleanIntel(item)]));
    const saved = [];
    for (const item of analysisItems) {
      const validation = validateReferenceFileMeta({ mimeType: item.type, size: item.size });
      if (!validation.ok) throw new Error(validation.error);
      const fingerprint = item.fingerprint;
      const intel = byName.get(item.name) || {};
      if (item.existingAsset) {
        saved.push({ ...item.existingAsset, intelligence: { ...intel, purpose: "app_reference", reusableAcrossUsers: false, privateCustomerAsset: true } });
        continue;
      }
      const safe = item.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-100) || "asset";
      const storagePath = `${user.id}/${crypto.randomUUID()}-${safe}`;
      const { error: uploadError } = await supabase.storage.from("user-assets").upload(storagePath, item.file, { contentType: item.type, upsert: false });
      if (uploadError) throw new Error("Unable to save this reference in private storage.");
      const { data: asset, error: dbError } = await supabase.from("asset_library").insert({
        user_id: user.id,
        file_name: item.name.slice(0, 180),
        storage_path: storagePath,
        mime_type: item.type,
        file_size: item.size,
        category: referenceKindFromMime(item.type),
        alt_text: intel.description || intel.subject || "Customer-owned project media",
        intelligence: { ...intel, purpose: "app_reference", reusableAcrossUsers: false, privateCustomerAsset: true },
        content_fingerprint: fingerprint,
      }).select("id,file_name,mime_type,category,intelligence,content_fingerprint").single();
      if (dbError) {
        await supabase.storage.from("user-assets").remove([storagePath]);
        if (String(dbError.code || "") === "23505") {
          const { data: replayed } = await supabase.from("asset_library").select("id,file_name,mime_type,category,intelligence,content_fingerprint").eq("user_id", user.id).eq("content_fingerprint", fingerprint).maybeSingle();
          if (replayed) { saved.push(replayed); continue; }
        }
        throw new Error("Unable to save this reference in your private asset library.");
      }
      saved.push(asset);
    }
    return saved;
  }

  async function analyze() {
    if (!items.length || busy) return;
    setBusy(true);
    setError("");
    setReady(false);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Authentication required.");

      const fingerprinted = await fingerprintItems();
      const existingAssets = await findExistingAssets(user.id, fingerprinted);
      const reusePlan = buildReferenceReusePlan(fingerprinted, existingAssets);
      const references = [];
      let totalBase64 = 0;

      for (const item of reusePlan.analysisItems) {
        const prepared = item.kind === "image" ? [await compressImage(item.file)] : await frames(item.file);
        for (const reference of prepared) {
          if (references.length >= REFERENCE_LIMITS.maxAnalysisReferences) break;
          if (totalBase64 + reference.data.length > REFERENCE_LIMITS.maxAnalysisBase64Chars) break;
          references.push(reference);
          totalBase64 += reference.data.length;
        }
        if (references.length >= REFERENCE_LIMITS.maxAnalysisReferences || totalBase64 >= REFERENCE_LIMITS.maxAnalysisBase64Chars) break;
      }

      let freshIntelligence = [];
      if (reusePlan.analysisItems.length) {
        if (!references.length) throw new Error("Unable to read media.");
        const response = await fetch("/api/reference-analyze", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", credentials: "same-origin", body: JSON.stringify({ references }) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result?.analysis) throw new Error(response.status === 401 ? "Authentication required." : result?.error || "Reference analysis failed.");
        freshIntelligence = Array.isArray(result.assets) ? result.assets : [];
      }

      const analyzedAssets = await saveAnalyzedAssets(reusePlan.analysisItems, freshIntelligence, user);
      const assets = [...reusePlan.reusedAssets, ...analyzedAssets];
      if (!assets.length) throw new Error("No private references were saved.");

      const combinedIntelligence = [
        ...reusePlan.reusedAssets.map((asset) => referenceIntelligenceFromAsset(asset)),
        ...freshIntelligence,
      ];
      const analysis = buildReferenceBrief(combinedIntelligence);
      const brief = `Use these customer references only as inspiration and requirements context. Reimagine them into an original App + Website; do not copy third-party branding, text, images, code or distinctive layouts.\n\nVISUAL REFERENCE ANALYSIS:\n${String(analysis).slice(0, 4000)}`;
      const safeMeta = assets.map((asset) => ({ id: asset.id, file_name: asset.file_name, mime_type: asset.mime_type, category: asset.category }));
      try {
        sessionStorage.setItem("soolenReferenceAnalysis", brief);
        sessionStorage.setItem("soolenPendingAssetIds", JSON.stringify(assets.map((item) => item.id)));
        sessionStorage.setItem("soolenPendingAssetMeta", JSON.stringify(safeMeta));
        sessionStorage.setItem("soolenReferenceReuseStats", JSON.stringify({
          exactPrivateReuse: reusePlan.reuseCount,
          analysisRequired: reusePlan.analysisCount,
          duplicateSelectionsSkipped: reusePlan.duplicateSelectionCount,
          crossUserReuseAllowed: false,
        }));
      } catch {}
      const current = String(document.querySelector("textarea")?.value || "").trim();
      window.dispatchEvent(new CustomEvent("soolen-app-idea", { detail: {
        idea: current || "Use my uploaded references to help design this App + Website.",
        assetIds: assets.map((item) => item.id),
        referenceReuse: { exactPrivateReuse: reusePlan.reuseCount, analysisRequired: reusePlan.analysisCount },
      } }));
      setReady(true);
      setOpen(false);
    } catch (caught) {
      setError(friendlyReferenceError(caught));
    } finally {
      setBusy(false);
    }
  }

  return <div className="referenceDock">
    <input ref={libraryInputRef} data-reference-library-input hidden type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,video/mp4,video/quicktime,video/webm" onChange={addFiles} />
    <input ref={cameraInputRef} data-reference-camera-input hidden type="file" accept="image/*" capture="environment" onChange={addFiles} />
    <button className="trigger" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Add private project references">＋ <span>{items.length ? `${items.length} references` : ready ? "References ready" : "Add references"}</span></button>
    {open && <section className="panel" role="dialog" aria-modal="true" aria-label="Private project references">
      <header><div><small>PRIVATE PROJECT REFERENCES</small><h3>Show AI what you mean.</h3></div><button type="button" onClick={() => setOpen(false)} aria-label="Close private references">×</button></header>
      <p>Upload photos, screenshots, video or sketches. LANERIQ reuses your own exact private matches first, then analyzes only compact local frames that still need understanding.</p>
      <div className="pickerRow">
        <button className="upload" type="button" onClick={() => libraryInputRef.current?.click()}>Photos · Video · Files</button>
        <button className="camera" type="button" onClick={() => cameraInputRef.current?.click()}>Take Photo</button>
      </div>
      <div className="grid">{items.map((item) => <article key={item.id}>{item.kind === "image" ? <img src={item.url} alt="Customer reference" /> : <video src={item.url} muted playsInline />}<div><b>{item.name}</b><small>{sizeLabel(item.size)}</small></div><button type="button" onClick={() => remove(item.id)} aria-label={`Remove ${item.name}`}>×</button></article>)}</div>
      {items.length > 0 && <button className="analyze" type="button" disabled={busy} onClick={analyze}>{busy ? "PREPARING + REUSING…" : "UNDERSTAND + USE →"}</button>}
      {error && <div className="error" role="alert">{error}</div>}
      <footer>Learn the intent, not copy the asset. Exact reuse is same-user only. Raw private customer media is never reused across customers.</footer>
    </section>}
    <style jsx>{`.referenceDock{position:fixed;right:max(14px,env(safe-area-inset-right));bottom:max(78px,calc(env(safe-area-inset-bottom) + 68px));z-index:90;font-family:Inter,system-ui,-apple-system,sans-serif}.trigger{min-height:44px;border:1px solid #e0bd61aa;border-radius:999px;background:#061611e8;color:#f4d274;padding:11px 14px;font-weight:900;box-shadow:0 14px 45px #0008;backdrop-filter:blur(12px);touch-action:manipulation}.trigger span{margin-left:5px}.panel{position:absolute;right:0;bottom:52px;width:min(430px,calc(100vw - 24px));max-height:min(70svh,720px);overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;background:#f8fbf9;color:#17352d;border:1px solid #ddb95d;border-radius:22px;padding:18px;box-shadow:0 24px 70px #0009}.panel header{display:flex;justify-content:space-between;gap:12px}.panel header small{color:#9c7428;font-size:9px;font-weight:900;letter-spacing:.14em}.panel h3{font-size:25px;margin:4px 0}.panel header>button{border:0;background:#e9efec;border-radius:12px;min-width:44px;min-height:44px;font-size:22px;touch-action:manipulation}.panel>p,.panel footer{color:#63746d;line-height:1.5;font-size:12px}.pickerRow{display:grid;grid-template-columns:1fr 1fr;gap:8px}.upload,.camera,.analyze{width:100%;min-height:44px;border-radius:13px;padding:12px;font-weight:950;touch-action:manipulation}.upload,.camera{border:1px dashed #b89443;background:#fff9e9;color:#244138}.camera{border-style:solid;background:#eef7f2}.analyze{margin-top:10px;border:0;background:linear-gradient(135deg,#f4d981,#c68f2d);color:#102018}.analyze:disabled{opacity:.55}.grid{display:grid;gap:7px;margin-top:10px}.grid article{display:grid;grid-template-columns:62px 1fr auto;gap:9px;align-items:center;background:#fff;border:1px solid #dde5e1;border-radius:12px;padding:7px}.grid img,.grid video{width:62px;height:48px;object-fit:cover;border-radius:8px;background:#102018}.grid b,.grid small{display:block;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.grid b{font-size:11px}.grid small{color:#718078;font-size:9px;margin-top:3px}.grid article>button{min-width:44px;min-height:44px;border:0;background:#eef3f0;border-radius:10px;padding:7px;touch-action:manipulation}.error{margin-top:10px;padding:10px;border-radius:10px;background:#fff0ed;color:#9b3b32;font-size:11px}.panel footer{margin-top:12px;padding-top:10px;border-top:1px solid #dde5e1}@media(max-width:640px){.referenceDock{right:max(10px,env(safe-area-inset-right));bottom:max(72px,calc(env(safe-area-inset-bottom) + 62px))}.trigger span{display:none}.panel{position:fixed;inset:0;width:100%;max-height:none;border:0;border-radius:0;padding:calc(16px + env(safe-area-inset-top)) 14px calc(22px + env(safe-area-inset-bottom));box-sizing:border-box}.pickerRow{grid-template-columns:1fr 1fr}}@media(max-width:380px){.pickerRow{grid-template-columns:1fr}}`}</style>
  </div>;
}
