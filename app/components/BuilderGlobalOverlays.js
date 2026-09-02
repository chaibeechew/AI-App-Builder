"use client";

import { usePathname } from "next/navigation";
import { shouldHideBuilderGlobalOverlay } from "../../lib/ui/global-overlay-policy.js";
import StudioLauncher from "./StudioLauncher";
import ReferenceUploader from "./ReferenceUploader";
import SoolenVoiceAssistant from "./SoolenVoiceAssistant";

export default function BuilderGlobalOverlays() {
  const pathname = usePathname();
  if (shouldHideBuilderGlobalOverlay(pathname)) return null;

  return (
    <>
      <StudioLauncher />
      <ReferenceUploader />
      <SoolenVoiceAssistant />
    </>
  );
}
