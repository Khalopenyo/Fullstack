import { uniq } from "./utils";

export function buildAllNotes(perfumes, groups) {
  const fromGroups = groups.flatMap((g) => g.notes);
  const fromPerfumes = perfumes.flatMap((p) => [...p.notes.top, ...p.notes.heart, ...p.notes.base]);
  return uniq([...fromGroups, ...fromPerfumes]).sort((a, b) => a.localeCompare(b, "ru"));
}

export function buildDefaultVolumeById(perfumes) {
  const out = {};
  for (const p of perfumes) out[p.id] = Number(p.baseVolume) || 50;
  return out;
}
