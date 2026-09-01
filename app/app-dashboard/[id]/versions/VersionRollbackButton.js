"use client";

import { useRef, useState } from "react";

export default function VersionRollbackButton({ appId, versionId, versionNo, currentVersionId, isCurrent }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const requestIdRef = useRef("");

  async function rollback() {
    if (isCurrent || loading) return;
    const ok = window.confirm(`Restore version ${versionNo}? A new rollback version will be created so your history stays intact.`);
    if (!ok) return;
    setLoading(true);
    setMessage("");
    try {
      if (!requestIdRef.current) requestIdRef.current = globalThis.crypto?.randomUUID?.() || `rollback-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const response = await fetch(`/api/apps/${appId}/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId, expectedCurrentVersionId: currentVersionId, requestId: requestIdRef.current }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Rollback failed.");
      setMessage(`${data?.replayed ? "Recovery already completed" : "Restored"} as version ${data?.version?.version_no || "new"} after the 100-point safety gate.`);
      window.location.reload();
    } catch (error) {
      setMessage(error?.message || "Rollback failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rollbackWrap">
      <button type="button" onClick={rollback} disabled={isCurrent || loading} className={isCurrent ? "currentButton" : "rollbackButton"}>
        {isCurrent ? "Current version" : loading ? "Restoring…" : `Restore v${versionNo}`}
      </button>
      {message ? <small>{message}</small> : null}
      <style jsx>{`
        .rollbackWrap{display:grid;gap:6px;justify-items:end}.rollbackButton,.currentButton{border-radius:11px;padding:10px 13px;font-weight:900;font:inherit}.rollbackButton{border:1px solid rgba(223,196,104,.4);background:#d8bf62;color:#07130e;cursor:pointer}.currentButton{border:1px solid rgba(120,210,165,.25);background:rgba(120,210,165,.08);color:#8de0bb}.rollbackButton:disabled,.currentButton:disabled{cursor:default;opacity:.8}.rollbackWrap small{color:#b9c8c2;max-width:220px;text-align:right}
      `}</style>
    </div>
  );
}
