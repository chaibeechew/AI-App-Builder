"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { I18N_STORAGE_KEY, normalizeLanguage, translateUiText } from "../../lib/i18n/catalog.js";
import { LANERIQ_18_PAGES, CREATION_JOURNEY } from "../../lib/product/laneriq-18-page-master.js";
import { liuiContextText } from "../../lib/i18n/liui-context-translations.js";

const PAGE_BY_ID = new Map(LANERIQ_18_PAGES.map((page) => [page.id, page]));
const pageById = (id) => PAGE_BY_ID.get(id) || null;

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
  if (normalized.includes("external") || normalized.includes("store")) return "External publication evidence";
  if (normalized.includes("release") || normalized.includes("production")) return "Release evidence";
  if (normalized.includes("runtime") || normalized.includes("live")) return "Live runtime evidence";
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

export default function LIUIContextIntelligence() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = useMemo(() => resolvePage(pathname, searchParams), [pathname, searchParams]);
  const [language, setLanguage] = useState("en");

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
    if (!page) return undefined;
    const body = document.body;
    body.dataset.liuiContextPage = String(page.id);
    body.dataset.liuiContextRisk = String(page.riskLevel || "low").toLowerCase();
    body.dataset.liuiContextApproval = page.humanApproval ? "required" : "bounded";
    body.dataset.liuiContextEvidence = String(page.evidenceRequirement || "code-only");

    let frame = 0;
    const scheduleAnnotation = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(annotateExistingStates);
    };
    scheduleAnnotation();
    const observer = new MutationObserver(scheduleAnnotation);
    observer.observe(body, { subtree: true, childList: true });
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      delete body.dataset.liuiContextPage;
      delete body.dataset.liuiContextRisk;
      delete body.dataset.liuiContextApproval;
      delete body.dataset.liuiContextEvidence;
    };
  }, [page]);

  if (!page || page.id === 1) return null;

  const t = (key) => liuiContextText(key, language);
  const canonical = (text) => translateUiText(String(text || ""), language);
  const journeyIndex = page.id >= 1 && page.id <= 6 ? page.id - 1 : -1;
  const risk = t(riskKey(page.riskLevel));
  const evidence = t(evidenceKey(page.evidenceRequirement));
  const stage = journeyIndex >= 0 ? canonical(CREATION_JOURNEY[journeyIndex]) : canonical(page.name);

  return (
    <aside
      className="liuiContextIntelligence"
      data-liui-context-intelligence="true"
      data-page-id={page.id}
      data-risk={String(page.riskLevel || "low").toLowerCase()}
      data-approval={page.humanApproval ? "required" : "bounded"}
      aria-label={t("Page intelligence")}
    >
      <details className="liuiContextDetails">
        <summary aria-label={t("Open page intelligence")}>
          <span className="liuiContextMark" aria-hidden="true">✦</span>
          <span className="liuiContextCounter">{t("Page")} {page.id}/18</span>
          <strong>{canonical(page.name)}</strong>
          <span className="liuiContextRisk">{t("Risk")}: {risk}</span>
        </summary>
        <div className="liuiContextPanel">
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
                {CREATION_JOURNEY.map((item, index) => (
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
    </aside>
  );
}
