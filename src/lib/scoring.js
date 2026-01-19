import { clamp } from "./utils";

const MIX_PRICE_TABLE = {
  "60/40": {
    100: 5000,
    50: 3000,
    30: 2000,
    20: 1500,
  },
  "80/20": {
    100: 7000,
    50: 4000,
    30: 3000,
    20: 2000,
  },
};

export function priceForVolume(basePrice, volume, baseVolume, mix) {
  const bv = Number(baseVolume) || 50;
  const v = Number(volume) || bv;
  const ratio = mix || "60/40";
  const table = MIX_PRICE_TABLE[ratio];
  if (table && table[v] != null) return table[v];
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
