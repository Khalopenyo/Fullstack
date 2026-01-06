import { clamp } from "./utils";

export function priceForVolume(basePrice, volume, baseVolume) {
  const bv = Number(baseVolume) || 50;
  const v = Number(volume) || bv;
  const p = Number(basePrice) || 0;
  return Math.round((p * (v / bv) + Number.EPSILON) * 100) / 100;
}

export function scorePerfume(p, mustNotes, avoidNotes, seasons, dayNight) {
  const all = [...p.notes.top, ...p.notes.heart, ...p.notes.base];
  const allSet = new Set(all);

  const mustHits = mustNotes.filter((n) => allSet.has(n)).length;
  const avoidHits = avoidNotes.filter((n) => allSet.has(n)).length;

  const seasonHits = seasons.length ? seasons.filter((s) => p.seasons.includes(s)).length : 0;
  const dnHits = dayNight.length ? dayNight.filter((d) => p.dayNight.includes(d)).length : 0;

  const noteCoverageBonus = mustNotes.length ? mustHits / mustNotes.length : 0;
  const avoidPenalty = avoidHits * 2.8;

  const baseScore = mustHits * 4 + seasonHits * 1.8 + dnHits * 1.4 + noteCoverageBonus * 2;
  const score = baseScore - avoidPenalty;

  return clamp(score, -999, 999);
}
