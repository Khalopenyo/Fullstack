export function isPrerender() {
  if (typeof navigator === "undefined") return false;
  return String(navigator.userAgent || "").includes("ReactSnap");
}
