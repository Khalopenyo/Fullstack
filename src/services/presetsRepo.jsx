import { apiFetch } from "./api";

export function listPresets() {
  return apiFetch("/api/presets");
}
