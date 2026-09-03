"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    makeCheck("media-devices", "Microphone media API support", typeof navigator.mediaDevices?.getUserMedia === "function", "Capability check only — no microphone permission requested during baseline"),
    makeCheck("speech-synthesis", "Browser speech output", "speechSynthesis" in window, "Speech synthesis API capability"),
    makeCheck("speech-recognition", "Browser speech recognition API", speechRecognition, speechRecognition ? "SpeechRecognition API available" : "SpeechRecognition API not exposed; keyboard/dictation fallback may still be available", false),
    makeCheck("service-worker", "Service worker / installable app support", "serviceWorker" in navigator, "Service worker capability", false),
    makeCheck("standalone-mode", "Standalone/PWA mode", window.matchMedia?.("(display-mode: standalone)")?.matches === true || navigator.standalone === true, "Informational: true only when launched as an installed app", false),
    makeCheck("clipboard", "Clipboard report export", Boolean(navigator.clipboard?.writeText || document.queryCommandSupported?.("copy")), "Used only when you tap Copy report", false),
  ];
}

function interactionSnapshot(interaction) {
  return {
    microphone: { ...interaction.microphone },
    photoLibrary: { ...interaction.photoLibrary },
    camera: { ...interaction.camera },
  };
}

function buildReport(checks, interaction) {
  const required = checks.filter((check) => check.required);
  const passedRequired = required.filter((check) => check.passed).length;
  const score = Math.round((passedRequired / Math.max(1, required.length)) * 100);
  return {
    reportVersion: 2,
    product: "LANERIQ AI",
    generatedAt: new Date().toISOString(),
    origin: window.location.origin,
    path: window.location.pathname,
    evidenceLevel: "REAL_DEVICE_SELF_TEST",
    physicalDeviceVerified: false,
    permissionPromptsTriggered: Boolean(interaction.microphonePromptAttempted),
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
    interactiveEvidence: interactionSnapshot(interaction),
    checks,
  };
}

const INITIAL_INTERACTION = {
  microphonePromptAttempted: false,
  microphone: { status: "not-run", passed: false, detail: "Tap Test microphone to request access. No audio is uploaded." },
  photoLibrary: { status: "not-run", passed: false, detail: "Tap Test Photos to open the device picker. Selected media stays local to this diagnostic." },
  camera: { status: "not-run", passed: false, detail: "Tap Test camera to open the rear-camera capture path when supported." },
};

export default function MobileReadinessClient() {
  const [report, setReport] = useState(null);
  const [copyState, setCopyState] = useState("");
  const [interaction, setInteraction] = useState(INITIAL_INTERACTION);
  const photoProbeRef = useRef(null);
  const cameraProbeRef = useRef(null);

  const runChecks = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const checks = buildChecks();
        setReport(buildReport(checks, interaction));
        setCopyState("");
      });
    });
  }, [interaction]);

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

  async function testMicrophone() {
    if (typeof navigator.mediaDevices?.getUserMedia !== "function") {
      setInteraction((current) => ({
        ...current,
        microphone: { status: "unsupported", passed: false, detail: "This browser does not expose getUserMedia for microphone testing." },
      }));
      return;
    }
    setInteraction((current) => ({
      ...current,
      microphonePromptAttempted: true,
      microphone: { status: "running", passed: false, detail: "Requesting microphone access from this explicit tap…" },
    }));
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const liveTracks = stream.getAudioTracks().filter((track) => track.readyState === "live").length;
      setInteraction((current) => ({
        ...current,
        microphonePromptAttempted: true,
        microphone: { status: "pass", passed: liveTracks > 0, detail: liveTracks > 0 ? "Microphone opened successfully from a user tap and was released immediately. No audio was uploaded." : "Microphone stream opened but no live audio track was reported." },
      }));
    } catch (error) {
      const name = String(error?.name || "");
      const denied = /NotAllowed|Permission/i.test(name);
      setInteraction((current) => ({
        ...current,
        microphonePromptAttempted: true,
        microphone: { status: "fail", passed: false, detail: denied ? "Microphone access was not granted. Enable microphone permission for LANERIQ AI in browser/iPhone settings and retry." : "Microphone could not be opened on this device/browser." },
      }));
    } finally {
      for (const track of stream?.getTracks?.() || []) {
        try { track.stop(); } catch {}
      }
    }
  }

  function recordPicker(source, event) {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    if (!file) return;
    const detail = `${file.type || "unknown media"}, ${Math.max(1, Math.round(Number(file.size || 0) / 1024))} KB selected locally; not uploaded.`;
    setInteraction((current) => ({
      ...current,
      [source]: { status: "pass", passed: true, detail },
    }));
  }

  const interactiveCards = [
    { id: "microphone", label: "Microphone tap test", value: interaction.microphone },
    { id: "photoLibrary", label: "Photos picker test", value: interaction.photoLibrary },
    { id: "camera", label: "Rear camera test", value: interaction.camera },
  ];

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <div className={styles.eyebrow}>LANERIQ AI · REAL DEVICE EVIDENCE</div>
        <h1>Mobile Readiness Check</h1>
        <p className={styles.lead}>
          The baseline runs without permission prompts. Microphone, Photos and Camera are tested only when you tap the matching button; selected media and microphone audio are not uploaded by this diagnostic.
        </p>

        <div className={styles.scoreCard}>
          <div>
            <span className={styles.scoreLabel}>Device baseline</span>
            <strong>{report ? `${report.score}/100` : "…"}</strong>
          </div>
          <div className={styles.scoreMeta}>
            <span>{report ? `${report.passedRequiredChecks}/${report.requiredChecks} required checks passed` : "Checking browser capabilities"}</span>
            <span>{report?.permissionPromptsTriggered ? "Interactive permission test was requested" : "Baseline triggered 0 permission prompts"}</span>
          </div>
        </div>

        <div className={styles.actions}>
          <button data-mobile-probe-target type="button" onClick={runChecks}>Run baseline again</button>
          <button data-mobile-probe-target type="button" onClick={copyReport} disabled={!report}>Copy report</button>
          <button data-mobile-probe-target type="button" onClick={testMicrophone}>Test microphone</button>
          <button data-mobile-probe-target type="button" onClick={() => photoProbeRef.current?.click()}>Test Photos</button>
          <button data-mobile-probe-target type="button" onClick={() => cameraProbeRef.current?.click()}>Test camera</button>
          <a data-mobile-probe-target href="/auth">Open login test</a>
          <a data-mobile-probe-target href="/">Back to LANERIQ AI</a>
        </div>
        <input ref={photoProbeRef} data-mobile-photo-probe hidden type="file" accept="image/*" onChange={(event) => recordPicker("photoLibrary", event)} />
        <input ref={cameraProbeRef} data-mobile-camera-probe hidden type="file" accept="image/*" capture="environment" onChange={(event) => recordPicker("camera", event)} />
        {copyState ? <p className={styles.copyState} role="status">{copyState}</p> : null}

        <label className={styles.inputProbe}>
          <span>Input zoom-safety probe</span>
          <input data-mobile-probe-input value="16px mobile input" readOnly aria-label="16px mobile input font probe" />
        </label>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>Interactive device tests</h2>
            <span>Run these from the real phone when you want permission/picker evidence.</span>
          </div>
          <div className={styles.grid}>
            {interactiveCards.map((item) => (
              <article className={styles.checkCard} key={item.id} data-pass={item.value.passed ? "true" : "false"}>
                <div className={styles.checkTop}>
                  <strong>{item.label}</strong>
                  <span>{item.value.status.toUpperCase()}</span>
                </div>
                <p>{item.value.detail}</p>
              </article>
            ))}
          </div>
        </section>

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
            <span>No user ID, phone number, email address, file name or browser user-agent is collected.</span>
          </div>
          <textarea className={styles.report} readOnly value={reportJson} aria-label="Mobile readiness evidence report" />
        </section>
      </section>
    </main>
  );
}
