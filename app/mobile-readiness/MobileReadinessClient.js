"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./mobile-readiness.module.css";

const MIN_TOUCH_TARGET_PX = 44;
const MIN_INPUT_FONT_PX = 16;
const MIN_VIEWPORT_PX = 320;

function makeCheck(id, label, passed, detail, required = true) {
  return { id, label, passed: Boolean(passed), detail: String(detail || ""), required };
}

function copyWithFallback(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard unavailable");
  return Promise.resolve();
}

function measureTargets() {
  const targets = Array.from(document.querySelectorAll("[data-mobile-probe-target]"));
  if (!targets.length) return { passed: false, detail: "No diagnostic touch targets found" };
  const sizes = targets.map((element) => {
    const rect = element.getBoundingClientRect();
    return { width: Math.round(rect.width), height: Math.round(rect.height) };
  });
  const passed = sizes.every((size) => size.width >= MIN_TOUCH_TARGET_PX && size.height >= MIN_TOUCH_TARGET_PX);
  const smallest = sizes.reduce((current, size) => {
    if (!current) return size;
    return Math.min(size.width, size.height) < Math.min(current.width, current.height) ? size : current;
  }, null);
  return {
    passed,
    detail: smallest ? `Smallest target ${smallest.width}×${smallest.height}px` : "Unable to measure targets",
  };
}

function measureInputFont() {
  const input = document.querySelector("[data-mobile-probe-input]");
  if (!input) return { passed: false, detail: "Input probe missing" };
  const size = Number.parseFloat(getComputedStyle(input).fontSize || "0");
  return { passed: size >= MIN_INPUT_FONT_PX, detail: `Computed input font ${size || 0}px` };
}

function buildChecks() {
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.setAttribute("capture", "environment");

  const target = measureTargets();
  const inputFont = measureInputFont();
  const width = window.innerWidth;
  const noOverflow = document.documentElement.scrollWidth <= width + 1;
  const maxTouchPoints = Number(navigator.maxTouchPoints || 0);
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches === true;
  const safeAreaSyntax = typeof CSS !== "undefined" && CSS.supports?.("padding-top: env(safe-area-inset-top)") === true;
  const speechRecognition = typeof window.SpeechRecognition === "function" || typeof window.webkitSpeechRecognition === "function";

  return [
    makeCheck("secure-context", "Secure HTTPS context", window.isSecureContext, window.isSecureContext ? "Secure context active" : "HTTPS is required for protected browser capabilities"),
    makeCheck("viewport-minimum", "Viewport supports phone widths", width >= MIN_VIEWPORT_PX, `Viewport width ${width}px; minimum ${MIN_VIEWPORT_PX}px`),
    makeCheck("touch-points", "Touch input detected", maxTouchPoints > 0, `${maxTouchPoints} touch point(s) reported`),
    makeCheck("coarse-pointer", "Finger/coarse pointer detected", coarsePointer, coarsePointer ? "Primary pointer is coarse" : "Primary pointer is not reported as coarse"),
    makeCheck("visual-viewport", "Visual viewport API", Boolean(window.visualViewport), window.visualViewport ? "visualViewport available" : "visualViewport unavailable"),
    makeCheck("safe-area", "iPhone safe-area CSS support", safeAreaSyntax, safeAreaSyntax ? "env(safe-area-inset-*) supported" : "Safe-area CSS syntax not supported"),
    makeCheck("horizontal-overflow", "No horizontal page overflow", noOverflow, `Document ${document.documentElement.scrollWidth}px vs viewport ${width}px`),
    makeCheck("pointer-events", "Pointer Events API", "PointerEvent" in window, "PointerEvent" in window ? "PointerEvent available" : "PointerEvent unavailable"),
    makeCheck("tap-target", "44px minimum touch targets", target.passed, target.detail),
    makeCheck("input-font", "16px input zoom safety", inputFont.passed, inputFont.detail),
    makeCheck("file-picker", "Photo/camera file picker capability", "files" in fileInput && "capture" in fileInput, "image/* input with capture attribute is supported"),
    makeCheck("media-devices", "Microphone media API support", typeof navigator.mediaDevices?.getUserMedia === "function", "Capability check only — no microphone permission requested"),
    makeCheck("speech-synthesis", "Browser speech output", "speechSynthesis" in window, "Speech synthesis API capability"),
    makeCheck("speech-recognition", "Browser speech recognition API", speechRecognition, speechRecognition ? "SpeechRecognition API available" : "SpeechRecognition API not exposed; keyboard/dictation fallback may still be available", false),
    makeCheck("service-worker", "Service worker / installable app support", "serviceWorker" in navigator, "Service worker capability", false),
    makeCheck("standalone-mode", "Standalone/PWA mode", window.matchMedia?.("(display-mode: standalone)")?.matches === true || navigator.standalone === true, "Informational: true only when launched as an installed app", false),
    makeCheck("clipboard", "Clipboard report export", Boolean(navigator.clipboard?.writeText || document.queryCommandSupported?.("copy")), "Used only when you tap Copy report", false),
  ];
}

function buildReport(checks) {
  const required = checks.filter((check) => check.required);
  const passedRequired = required.filter((check) => check.passed).length;
  const score = Math.round((passedRequired / Math.max(1, required.length)) * 100);
  return {
    reportVersion: 1,
    product: "LANERIQ AI",
    generatedAt: new Date().toISOString(),
    origin: window.location.origin,
    path: window.location.pathname,
    permissionPromptsTriggered: false,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      visualWidth: window.visualViewport?.width ?? null,
      visualHeight: window.visualViewport?.height ?? null,
      devicePixelRatio: window.devicePixelRatio || 1,
    },
    language: navigator.language || "unknown",
    maxTouchPoints: Number(navigator.maxTouchPoints || 0),
    requiredChecks: required.length,
    passedRequiredChecks: passedRequired,
    score,
    checks,
  };
}

export default function MobileReadinessClient() {
  const [report, setReport] = useState(null);
  const [copyState, setCopyState] = useState("");

  const runChecks = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const checks = buildChecks();
        setReport(buildReport(checks));
        setCopyState("");
      });
    });
  }, []);

  useEffect(() => {
    runChecks();
    let timer = null;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(runChecks, 180);
    };
    window.addEventListener("resize", refresh, { passive: true });
    window.addEventListener("orientationchange", refresh, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", refresh);
      window.removeEventListener("orientationchange", refresh);
    };
  }, [runChecks]);

  const reportJson = useMemo(() => (report ? JSON.stringify(report, null, 2) : "Running checks…"), [report]);
  const requiredChecks = report?.checks?.filter((check) => check.required) || [];
  const optionalChecks = report?.checks?.filter((check) => !check.required) || [];

  const copyReport = async () => {
    try {
      await copyWithFallback(reportJson);
      setCopyState("Report copied. You can paste it back into ChatGPT for evidence review.");
    } catch {
      setCopyState("Clipboard was unavailable. Select the report text below and copy it manually.");
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <div className={styles.eyebrow}>LANERIQ AI · REAL DEVICE EVIDENCE</div>
        <h1>Mobile Readiness Check</h1>
        <p className={styles.lead}>
          Permission-free diagnostics for iPhone and mobile browsers. This page does not request microphone, camera, Photos, contacts or SMS access and does not upload this report.
        </p>

        <div className={styles.scoreCard}>
          <div>
            <span className={styles.scoreLabel}>Device baseline</span>
            <strong>{report ? `${report.score}/100` : "…"}</strong>
          </div>
          <div className={styles.scoreMeta}>
            <span>{report ? `${report.passedRequiredChecks}/${report.requiredChecks} required checks passed` : "Checking browser capabilities"}</span>
            <span>{report?.permissionPromptsTriggered === false ? "0 permission prompts triggered" : ""}</span>
          </div>
        </div>

        <div className={styles.actions}>
          <button data-mobile-probe-target type="button" onClick={runChecks}>Run again</button>
          <button data-mobile-probe-target type="button" onClick={copyReport} disabled={!report}>Copy report</button>
          <a data-mobile-probe-target href="/auth">Open login test</a>
          <a data-mobile-probe-target href="/">Back to LANERIQ AI</a>
        </div>
        {copyState ? <p className={styles.copyState} role="status">{copyState}</p> : null}

        <label className={styles.inputProbe}>
          <span>Input zoom-safety probe</span>
          <input data-mobile-probe-input value="16px mobile input" readOnly aria-label="16px mobile input font probe" />
        </label>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>Required phone baseline</h2>
            <span>These checks contribute to the device score.</span>
          </div>
          <div className={styles.grid}>
            {requiredChecks.map((check) => (
              <article className={styles.checkCard} key={check.id} data-pass={check.passed ? "true" : "false"}>
                <div className={styles.checkTop}>
                  <strong>{check.label}</strong>
                  <span>{check.passed ? "PASS" : "CHECK"}</span>
                </div>
                <p>{check.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>Optional / informational</h2>
            <span>Useful context; these do not lower the baseline score.</span>
          </div>
          <div className={styles.grid}>
            {optionalChecks.map((check) => (
              <article className={styles.checkCard} key={check.id} data-pass={check.passed ? "true" : "false"}>
                <div className={styles.checkTop}>
                  <strong>{check.label}</strong>
                  <span>{check.passed ? "YES" : "INFO"}</span>
                </div>
                <p>{check.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>Evidence report</h2>
            <span>No user ID, phone number, email address or browser user-agent is collected.</span>
          </div>
          <textarea className={styles.report} readOnly value={reportJson} aria-label="Mobile readiness evidence report" />
        </section>
      </section>
    </main>
  );
}
