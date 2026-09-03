"use client";

import { useLayoutEffect } from "react";
import { LAUNCH_MODE, isNoCreditsLaunchMode } from "../../config/launch-mode.js";

const CREDIT_NAV_TEXT = /^(?:✦\s*)?(?:credits|buy credits|add credits|credit balance)\s*(?:›|→)?$/i;
const FREE_FIRST_PROJECT_TEXT = /first project\s+free|free first[ -]?project|free until publish/i;
const CREDIT_SHORTAGE_TEXT = /insufficient credits|more build credits|need more credits|not enough credits/i;

function isAdminPath() {
  return typeof location !== "undefined" && location.pathname.startsWith("/admin");
}

function elementsIncludingRoot(root, selector) {
  const matches = [];
  if (root?.nodeType === 1 && root.matches?.(selector)) matches.push(root);
  root?.querySelectorAll?.(selector)?.forEach((node) => matches.push(node));
  return matches;
}

function sanitize(root) {
  if (!root || !isNoCreditsLaunchMode() || isAdminPath()) return;

  elementsIncludingRoot(root, 'a[href="/credits"],a[href^="/credits?"]').forEach((node) => node.remove());

  elementsIncludingRoot(root, "a,button").forEach((node) => {
    if (CREDIT_NAV_TEXT.test(String(node.textContent || "").trim())) node.remove();
  });

  elementsIncludingRoot(root, ".promiseRow span").forEach((node) => {
    if (FREE_FIRST_PROJECT_TEXT.test(String(node.textContent || ""))) node.remove();
  });

  elementsIncludingRoot(root, ".errorBox,.error,.notice,.toast,[role='alert']").forEach((node) => {
    if (CREDIT_SHORTAGE_TEXT.test(String(node.textContent || ""))) {
      node.textContent = LAUNCH_MODE.userCopy.accessUnavailable;
      node.dataset.laneriqLaunchCopy = "no-credits";
    }
  });
}

export default function LaunchModeGuard() {
  useLayoutEffect(() => {
    if (!isNoCreditsLaunchMode() || isAdminPath()) return undefined;

    document.documentElement.dataset.laneriqLaunchMode = LAUNCH_MODE.id;
    document.documentElement.dataset.laneriqCustomerAccessModel = LAUNCH_MODE.customerAccessModel;
    sanitize(document.body);

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => sanitize(node));
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const blockCreditsNavigation = (event) => {
      const anchor = event.target?.closest?.('a[href="/credits"],a[href^="/credits?"]');
      if (!anchor) return;
      event.preventDefault();
      event.stopPropagation();
    };
    document.addEventListener("click", blockCreditsNavigation, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", blockCreditsNavigation, true);
    };
  }, []);

  return null;
}
