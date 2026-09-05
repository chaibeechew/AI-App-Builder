"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { I18N_STORAGE_KEY, normalizeLanguage, translateUiText } from "../../lib/i18n/catalog.js";
import { LANERIQ_18_PAGES, LANERIQ_APPROVED_CREATION_JOURNEY } from "../../lib/product/laneriq-18-page-master.js";
import { liuiContextText } from "../../lib/i18n/liui-context-translations.js";

const PAGE_BY_ID = new Map(LANERIQ_18_PAGES.map((page) => [page.id, page]));
const pageById = (id) => PAGE_BY_ID.get(id) || null;
const PAGE_GROUPS = Object.freeze([
  { id: "creation", label: "Creation Journey", range: "Pages 1–6", from: 1, to: 6, note: "Idea → Plan → Build → Preview → Launch → Manage" },
  { id: "destinations", label: "Core Destinations", range: "Pages 7–12", from: 7, to: 12, note: "Projects · Templates · AI Assistant · Automation · Analytics · More" },
  { id: "workspace", label: "Project Workspace", range: "Pages 13–18", from: 13, to: 18, note: "AI Editor · Template Detail · Workflow · Database · Testing · Publish" },
]);

function groupForPage(pageId) {
  return PAGE_GROUPS.find((group) => pageId >= group.from && pageId <= group.to) || PAGE_GROUPS[0];
}

function resolvePage(pathname, searchParams) {
  const path = String(pathname || "/");
  if (path === "/") {
    const flow = searchParams?.get("flow") || "";
    if (flow === "create-project") return pageById(2);
    if (flow === "build-progress") return pageById(3);
    return pageById(1);
  }
  if (path === "/create") return pageById(2);
  if (path.startsWith("/preview/")) return pageById(4);
  if (path.startsWith("/release/")) return pageById(5);
  if (path.startsWith("/app-dashboard/")) return pageById(6);
  if (path === "/my-apps" || path === "/projects") return pageById(7);
  if (path === "/templates") return pageById(8);
  if (path.startsWith("/templates/")) return pageById(14);
  if (path === "/soolen-ai") return pageById(9);
  if (path.startsWith("/workflows/")) return searchParams?.get("view") === "editor" ? pageById(15) : pageById(10);
  if (path.startsWith("/analytics/")) return pageById(11);
  if (path === "/studio") return pageById(12);
  if (path.startsWith("/editor/")) return pageById(13);
  if (path.startsWith("/database/")) return pageById(16);
  if (path.startsWith("/operations/")) return pageById(17);
  if (path.startsWith("/publish/")) return pageById(18);
  return null;
}

function evidenceKey(value) {
  const normalized = String(value || "code-only").toLowerCase();
  if (normalized.includes("store") || normalized.includes("external")) return "External publication evidence";
  if (normalized.includes("production") || normalized.includes("release")) return "Release evidence";
  if (normalized.includes("runtime") || normalized.includes("browser") || normalized.includes("live")) return "Live runtime evidence";
  return "Code evidence";
}

function riskKey(value) {
  const normalized = String(value || "low").toLowerCase();
  if (normalized === "critical") return "Critical";
  if (normalized === "high") return "High";
  if (normalized === "medium") return "Medium";
  return "Low";
}

function annotateExistingStates() {
  const annotate = (selector, role, live, busy = false) => {
    for (const node of document.querySelectorAll(selector)) {
      if (!node.hasAttribute("role")) node.setAttribute("role", role);
      if (!node.hasAttribute("aria-live")) node.setAttribute("aria-live", live);
      if (busy && !node.hasAttribute("aria-busy")) node.setAttribute("aria-busy", "true");
    }
  };
  annotate(".error,.errorBox,[data-state='error']", "alert", "assertive");
  annotate(".success,.successBox,.notice,[data-state='success']", "status", "polite");
  annotate(".loading,.loadingState,[data-state='loading']", "status", "polite", true);
  annotate(".emptyState,[data-state='empty']", "status", "polite");
}

function publishContextState(present, open, pageId) {
  const body = document.body;
  if (present) {
    body.dataset.liuiContextPresent = "true";
    body.dataset.liuiDecisionOpen = open ? "true" : "false";
  } else {
    delete body.dataset.liuiContextPresent;
    delete body.dataset.liuiDecisionOpen;
  }
  window.dispatchEvent(new CustomEvent("laneriq:context-intelligence-state", {
    detail: { present: Boolean(present), open: Boolean(open), pageId: Number(pageId) || 0 },
  }));
}

export default function LIUIContextIntelligence() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = useMemo(() => resolvePage(pathname, searchParams), [pathname, searchParams]);
  const [language, setLanguage] = useState("en");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const currentLanguage = () => {
      try {
        return normalizeLanguage(window.__LANERIQ_LANGUAGE__ || localStorage.getItem(I18N_STORAGE_KEY) || navigator.language || "en");
      } catch {
        return "en";
      }
    };
    setLanguage(currentLanguage());
    const handleLanguage = (event) => setLanguage(normalizeLanguage(event?.detail?.language || currentLanguage()));
    window.addEventListener("laneriq-language-change", handleLanguage);
    return () => window.removeEventListener("laneriq-language-change", handleLanguage);
  }, []);

  useEffect(() => {
    const present = Boolean(page);
    setOpen(false);
    publishContextState(present, false, present ? page.id : 0);
    return () => publishContextState(false, false, 0);
  }, [page?.id]);

  useEffect(() => {
    if (!page) return undefined;
    const body = document.body;
    body.dataset.liuiContextPage = String(page.id);
    body.dataset.liuiContextGroup = groupForPage(page.id).id;
    body.dataset.liuiContextRisk = String(page.risk || "low").toLowerCase();
    body.dataset.liuiContextApproval = page.humanApproval ? "required" : "bounded";
    body.dataset.liuiContextEvidence = String(page.evidence || "code-only");

    const annotationRoot = document.querySelector("main") || body;
    let frame = 0;
    const scheduleAnnotation = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(annotateExistingStates);
    };
    scheduleAnnotation();
    const observer = new MutationObserver(scheduleAnnotation);
    observer.observe(annotationRoot, { subtree: true, childList: true });
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      delete body.dataset.liuiContextPage;
      delete body.dataset.liuiContextGroup;
      delete body.dataset.liuiContextRisk;
      delete body.dataset.liuiContextApproval;
      delete body.dataset.liuiContextEvidence;
    };
  }, [page]);

  if (!page) return null;

  const t = (key) => liuiContextText(key, language);
  const canonical = (text) => translateUiText(String(text || ""), language);
  const journeyIndex = page.id >= 1 && page.id <= 6 ? page.id - 1 : -1;
  const risk = t(riskKey(page.risk));
  const evidence = t(evidenceKey(page.evidence));
  const stage = journeyIndex >= 0 ? canonical(LANERIQ_APPROVED_CREATION_JOURNEY[journeyIndex]) : canonical(page.name);
  const group = groupForPage(page.id);

  return (
    <aside
      className={`liuiContextIntelligence page-${page.id}`}
      data-liui-context-intelligence="true"
      data-page-id={page.id}
      data-page-group={group.id}
      data-risk={String(page.risk || "low").toLowerCase()}
      data-approval={page.humanApproval ? "required" : "bounded"}
      aria-label={t("Page intelligence")}
    >
      <details
        key={page.id}
        className="liuiContextDetails"
        onToggle={(event) => {
          const nextOpen = event.currentTarget.open === true;
          setOpen(nextOpen);
          publishContextState(true, nextOpen, page.id);
        }}
      >
        <summary aria-label={t("Open page intelligence")}>
          <span className="liuiContextMark" aria-hidden="true">✦</span>
          <span className="liuiContextCounter">{t("Page")} {page.id}/18</span>
          <strong>{canonical(page.name)}</strong>
          <span className="liuiContextGroup">{canonical(group.label)}</span>
          <span className="liuiContextRisk">{t("Risk")}: {risk}</span>
        </summary>
        <div className="liuiContextPanel">
          <section className="liuiMasterLayout" aria-label="18-page master layout">
            <div className="liuiMasterHeading">
              <small>LANERIQ AI · 18-PAGE MASTER LAYOUT</small>
              <h3>One product. Eighteen purpose-built screens.</h3>
              <p>The 18 pages are grouped into three product zones, not exposed as an 18-step wizard. The five primary tabs remain Home / Projects / Create / Templates / More.</p>
            </div>
            <div className="liuiMasterGroups">
              {PAGE_GROUPS.map((item) => (
                <article key={item.id} data-current={item.id === group.id ? "true" : "false"}>
                  <span>{item.range}</span>
                  <b>{canonical(item.label)}</b>
                  <small>{canonical(item.note)}</small>
                </article>
              ))}
            </div>
          </section>

          <div className="liuiContextBento" aria-label={t("Current stage")}>
            <section>
              <small>{t("Current stage")}</small>
              <b>{stage}</b>
            </section>
            <section>
              <small>{t("Evidence")}</small>
              <b>{evidence}</b>
            </section>
            <section>
              <small>{t("Approval")}</small>
              <b>{page.humanApproval ? t("Approval required") : t("No separate approval required")}</b>
            </section>
          </div>

          <section className="liuiContextNext" aria-label={t("Next best action")}>
            <small>{t("Next best action")}</small>
            <h3>{canonical(page.primaryAction)}</h3>
            <p>{page.humanApproval ? t("Human approval required before consequential actions.") : t("AI may assist within current permissions.")}</p>
          </section>

          {journeyIndex >= 0 && (
            <section className="liuiContextJourney" aria-label={t("Creation journey")}>
              <small>{t("Creation journey")}</small>
              <ol>
                {LANERIQ_APPROVED_CREATION_JOURNEY.map((item, index) => (
                  <li key={item} data-state={index < journeyIndex ? "done" : index === journeyIndex ? "current" : "next"}>
                    <span aria-hidden="true">{index < journeyIndex ? "✓" : index + 1}</span>
                    <b>{canonical(item)}</b>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </details>
      <style jsx global>{`
        .liuiContextIntelligence{position:fixed;z-index:70;top:max(10px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);width:min(780px,calc(100% - 24px));pointer-events:none;font-family:Inter,system-ui,-apple-system,sans-serif}
        .liuiContextDetails{pointer-events:auto}
        .liuiContextDetails>summary{list-style:none;display:flex;align-items:center;gap:8px;min-height:42px;padding:8px 11px;border:1px solid rgba(126,190,236,.24);border-radius:15px;background:linear-gradient(145deg,rgba(4,19,37,.86),rgba(8,14,31,.82));box-shadow:0 12px 34px rgba(0,0,0,.28);backdrop-filter:blur(20px) saturate(140%);-webkit-backdrop-filter:blur(20px) saturate(140%);color:#eef7ff;cursor:pointer}
        .liuiContextDetails>summary::-webkit-details-marker{display:none}
        .liuiContextMark{display:grid;place-items:center;width:26px;height:26px;border-radius:9px;background:linear-gradient(145deg,#ffe58b,#c98b1f);color:#101925;font-weight:950;flex:0 0 auto}
        .liuiContextCounter{color:#f2c862;font-size:10px;font-weight:950;letter-spacing:.09em;white-space:nowrap}
        .liuiContextDetails>summary strong{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .liuiContextGroup{margin-left:auto;color:#a9bac8;font-size:10px;white-space:nowrap}
        .liuiContextRisk{color:#8ce0b8;font-size:10px;white-space:nowrap}
        .liuiContextDetails[open]>summary{border-color:rgba(242,200,98,.42);border-radius:15px 15px 10px 10px}
        .liuiContextPanel{margin-top:7px;max-height:min(72vh,650px);overflow:auto;padding:13px;border:1px solid rgba(126,190,236,.25);border-radius:18px;background:linear-gradient(155deg,rgba(4,19,37,.96),rgba(10,14,31,.96));box-shadow:0 28px 70px rgba(0,0,0,.45);color:#eef7ff}
        .liuiMasterLayout{padding:15px;border:1px solid rgba(242,200,98,.2);border-radius:17px;background:linear-gradient(145deg,rgba(242,200,98,.07),rgba(51,88,166,.08))}
        .liuiMasterHeading small{color:#f2c862;font-size:9px;letter-spacing:.13em;font-weight:950}
        .liuiMasterHeading h3{margin:6px 0 4px;font-size:18px}
        .liuiMasterHeading p{margin:0;color:#a9bac8;font-size:11px;line-height:1.55}
        .liuiMasterGroups{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
        .liuiMasterGroups article{display:grid;gap:4px;min-height:92px;padding:11px;border:1px solid rgba(255,255,255,.08);border-radius:13px;background:rgba(7,24,45,.68)}
        .liuiMasterGroups article[data-current="true"]{border-color:rgba(242,200,98,.55);box-shadow:inset 0 0 0 1px rgba(242,200,98,.1)}
        .liuiMasterGroups article span{color:#f2c862;font-size:9px;font-weight:950}
        .liuiMasterGroups article b{font-size:12px}
        .liuiMasterGroups article small{color:#91a6b8;font-size:9px;line-height:1.4}
        .liuiContextBento{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:9px}
        .liuiContextBento section,.liuiContextNext,.liuiContextJourney{padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(7,24,45,.6)}
        .liuiContextBento small,.liuiContextNext small,.liuiContextJourney>small{color:#91a6b8;font-size:9px;text-transform:uppercase;letter-spacing:.08em}
        .liuiContextBento b{display:block;margin-top:5px;font-size:11px}
        .liuiContextNext{margin-top:8px}
        .liuiContextNext h3{margin:5px 0;font-size:15px}.liuiContextNext p{margin:0;color:#9fb2c2;font-size:10px;line-height:1.45}
        .liuiContextJourney{margin-top:8px}.liuiContextJourney ol{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;padding:0;margin:9px 0 0;list-style:none}.liuiContextJourney li{display:grid;gap:4px;justify-items:center;text-align:center;color:#7f92a3}.liuiContextJourney li>span{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;border:1px solid rgba(255,255,255,.14);font-size:9px}.liuiContextJourney li b{font-size:9px}.liuiContextJourney li[data-state="current"]{color:#f2c862}.liuiContextJourney li[data-state="current"]>span{border-color:#f2c862;background:rgba(242,200,98,.12)}.liuiContextJourney li[data-state="done"]{color:#8ce0b8}
        body[data-liui-context-page="1"] .liuiContextIntelligence{top:max(8px,env(safe-area-inset-top))}
        @media(max-width:620px){.liuiContextIntelligence{width:calc(100% - 18px)}.liuiContextDetails>summary{gap:6px;min-height:38px;padding:6px 8px}.liuiContextMark{width:24px;height:24px}.liuiContextCounter{font-size:9px}.liuiContextDetails>summary strong{font-size:10px}.liuiContextGroup{display:none}.liuiContextRisk{font-size:9px}.liuiMasterGroups,.liuiContextBento{grid-template-columns:1fr}.liuiMasterGroups article{min-height:0}.liuiContextJourney ol{grid-template-columns:repeat(3,1fr)}}
        @media(prefers-reduced-motion:reduce){.liuiContextIntelligence *{transition:none!important;animation:none!important}}
      `}</style>
    </aside>
  );
}
