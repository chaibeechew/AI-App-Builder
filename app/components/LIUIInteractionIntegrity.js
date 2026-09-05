"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function onKeyActivate(event, action) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  action();
}

export default function LIUIInteractionIntegrity() {
  const pathname = usePathname() || "";

  useEffect(() => {
    const cleanups = [];

    if (pathname === "/") {
      const spark = document.querySelector(".premiumHome button.spark");
      if (spark && spark.dataset.liuiInteractionBound !== "true") {
        spark.dataset.liuiInteractionBound = "true";
        spark.setAttribute("aria-label", "Start creating with LANERIQ AI");
        const focusComposer = () => {
          const composer = document.querySelector(".premiumHome .promptCard textarea");
          if (composer) {
            composer.scrollIntoView({ behavior: "smooth", block: "center" });
            composer.focus();
          } else {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        };
        spark.addEventListener("click", focusComposer);
        cleanups.push(() => {
          spark.removeEventListener("click", focusComposer);
          delete spark.dataset.liuiInteractionBound;
        });
      }
    }

    if (pathname === "/create" || pathname === "/create/") {
      const upload = document.querySelector("main.page .uploadInfo");
      if (upload && upload.dataset.liuiInteractionBound !== "true") {
        upload.dataset.liuiInteractionBound = "true";
        upload.setAttribute("role", "button");
        upload.setAttribute("tabindex", "0");
        upload.setAttribute("aria-label", "Add photos, video or sketches as private project references");
        upload.style.cursor = "pointer";
        const openReferences = () => {
          const trigger = document.querySelector(".referenceDock .trigger");
          if (trigger instanceof HTMLElement) trigger.click();
        };
        const keyHandler = (event) => onKeyActivate(event, openReferences);
        upload.addEventListener("click", openReferences);
        upload.addEventListener("keydown", keyHandler);
        cleanups.push(() => {
          upload.removeEventListener("click", openReferences);
          upload.removeEventListener("keydown", keyHandler);
          delete upload.dataset.liuiInteractionBound;
        });
      }
    }

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [pathname]);

  return null;
}
