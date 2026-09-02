const HIDDEN_EXACT_PATHS = new Set([
  "/",
  "/auth",
  "/studio",
  "/production-e2e",
  "/mobile-readiness",
]);

const HIDDEN_PREFIXES = [
  "/a/",
  "/website/",
  "/release/",
];

export function shouldHideBuilderGlobalOverlay(pathname) {
  const path = String(pathname || "/").split("?")[0] || "/";
  return HIDDEN_EXACT_PATHS.has(path) || HIDDEN_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function shouldShowBuilderGlobalOverlay(pathname) {
  return !shouldHideBuilderGlobalOverlay(pathname);
}
