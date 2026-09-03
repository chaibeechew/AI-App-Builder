# Batch 12 — Mobile Real-Device Readiness

This batch prepares LANERIQ AI for truthful physical-iPhone verification without relabeling browser emulation as device proof.

## Account
- Account trigger, visible Logout and account menu actions are explicitly 44px+.
- Floating account controls respect iPhone safe-area insets.
- Logout continues to use LANERIQ session authority and fail-closed behavior.

## Upload Ref
- Separates Photos/Video/Files selection from rear-camera capture.
- Camera path uses `capture="environment"`; library path does not force camera capture.
- Close, remove, picker and analyze controls are 44px+.
- Mobile panel uses safe-area-aware full-screen layout.
- Existing private storage, bounded preprocessing, dedupe and customer isolation remain unchanged.

## Voice Idea
- On iPhone/iPad, microphone permission is primed only after the explicit microphone tap.
- The temporary getUserMedia stream is released immediately before SpeechRecognition continues.
- No microphone request occurs on mount, visibility change or other lifecycle events.
- Apple/browser permission prompts are not hidden or bypassed.

## Mobile Readiness
- Baseline remains permission-free.
- Adds explicit real-device tests for microphone, Photos and rear camera.
- Diagnostic media/audio stays local and file names are not included in the report.
- Report remains `physicalDeviceVerified:false` until real-device evidence is reviewed.

## Production evidence
- Adds WebKit/iPhone 13 Production QA for the deployed real-device test entries.
- Verifies 44px+ controls, picker contracts, exact Production SHA and zero automatic permission actions.
- Evidence remains BROWSER_EMULATION; microphone/picker interactions are not exercised by automation.

SMS remains ON HOLD.
