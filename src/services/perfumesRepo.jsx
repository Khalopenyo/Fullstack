import { apiFetch } from "./api";

const ALLOWED_SEASONS = new Set(["Зима", "Весна", "Лето", "Осень"]);
const ALLOWED_DAYNIGHT = new Set(["Утро", "День", "Вечер", "Ночь"]);

function asString(v, fallback = "") {
  return typeof v === "string" ? v : fallback;
}

function asNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clampInt(n, min, max) {
  const x = Math.round(asNumber(n, min));
  return Math.max(min, Math.min(max, x));
}

function asStringArray(v) {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === "string").map((s) => s.trim()).filter(Boolean);
}

function uniq(arr) {
  const out = [];
  const seen = new Set();
  for (const x of arr) {
    if (!seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  }
  return out;
}

function normalizeNotes(rawNotes, issues, id) {
  const notes = rawNotes && typeof rawNotes === "object" ? rawNotes : {};
  const top = asStringArray(notes.top);
  const heart = asStringArray(notes.heart);
  const base = asStringArray(notes.base);

  const flat = asStringArray(rawNotes);
  const merged = flat.length ? { top: flat, heart: [], base: [] } : { top, heart, base };

  if (!rawNotes) {
    issues.push({ id, level: "warn", field: "notes", msg: "notes отсутствует → использую пустые массивы" });
  }
  return {
    top: uniq(merged.top).slice(0, 60),
    heart: uniq(merged.heart).slice(0, 60),
    base: uniq(merged.base).slice(0, 60),
  };
}

export function normalizePerfume(raw, id, issues = []) {
  const brand = asString(raw.brand, "").trim();
  const name = asString(raw.name, "").trim();

  if (!brand) issues.push({ id, level: "warn", field: "brand", msg: "brand пустой" });
  if (!name) issues.push({ id, level: "warn", field: "name", msg: "name пустой" });

  const basePrice = asNumber(raw.basePrice ?? raw.price, 0);
  const baseVolume = clampInt(raw.baseVolume ?? raw.volume ?? 50, 10, 200);

  const seasons = uniq(asStringArray(raw.seasons).filter((s) => ALLOWED_SEASONS.has(s))).slice(0, 4);
  const dayNight = uniq(asStringArray(raw.dayNight).filter((d) => ALLOWED_DAYNIGHT.has(d))).slice(0, 4);

  if (Array.isArray(raw.seasons) && seasons.length !== raw.seasons.length) {
    issues.push({ id, level: "warn", field: "seasons", msg: "часть значений seasons невалидна и была отброшена" });
  }
  if (Array.isArray(raw.dayNight) && dayNight.length !== raw.dayNight.length) {
    issues.push({ id, level: "warn", field: "dayNight", msg: "часть значений dayNight невалидна и была отброшена" });
  }

  const tags = uniq(asStringArray(raw.tags)).slice(0, 40);
  const notes = normalizeNotes(raw.notes, issues, id);

  const sillage = clampInt(raw.sillage ?? raw.trail, 1, 5);
  const longevity = clampInt(raw.longevity ?? raw.duration, 1, 5);

  const image = asString(raw.image, "").trim();
  const searchNameRu = asString(raw.searchNameRu, "").trim();
  const isHit = typeof raw.isHit === "boolean" ? raw.isHit : false;
  const orderCount = asNumber(raw.orderCount ?? 0, 0);
  const inStock = typeof raw.inStock === "boolean" ? raw.inStock : true;
  const stockQty = raw.stockQty == null ? null : clampInt(raw.stockQty, 0, 1000000, 0);

  const currency = asString(raw.currency, "₽").trim() || "₽";

  const popularity = asNumber(raw.popularity ?? raw.popularityScore ?? 0, 0);
  const popularityMonth = asNumber(raw.popularityMonth ?? raw.popularityMonthScore ?? 0, 0);
  const popularityMonthKey = asString(raw.popularityMonthKey, "").trim();

  const perfume = {
    id,
    brand: brand || "—",
    name: name || "Без названия",
    family: asString(raw.family, "").trim(),
    description: asString(raw.description, "").trim(),
    tags,
    notes,
    seasons,
    dayNight,
    basePrice,
    price: basePrice,
    baseVolume,
    volume: baseVolume,
    sillage,
    longevity,
    image,
    searchNameRu,
    isHit,
    orderCount,
    inStock,
    stockQty,

    currency,
    popularity,
    popularityMonth,
    popularityMonthKey,
    reviewAvg: asNumber(raw.reviewAvg ?? raw.ratingAvg ?? 0, 0),
    reviewCount: asNumber(raw.reviewCount ?? raw.ratingCount ?? 0, 0),
  };

  return perfume;
}

function modeFromCollection(name) {
  return name === "wholesale_perfumes" ? "wholesale" : "retail";
}

export async function fetchPerfumes(mode = "retail") {
  return apiFetch(`/api/perfumes?mode=${encodeURIComponent(mode)}`);
}

export async function fetchPerfumesPage({
  mode = "retail",
  page = 1,
  pageSize = 6,
  q = "",
  mustNotes = [],
  avoidNotes = [],
  seasons = [],
  dayNight = [],
  sort = "",
  presetIds = [],
} = {}) {
  const params = new URLSearchParams();
  params.set("mode", mode);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (q) params.set("q", q);
  if (sort) params.set("sort", sort);
  if (Array.isArray(mustNotes) && mustNotes.length) params.set("mustNotes", mustNotes.join(","));
  if (Array.isArray(avoidNotes) && avoidNotes.length) params.set("avoidNotes", avoidNotes.join(","));
  if (Array.isArray(seasons) && seasons.length) params.set("seasons", seasons.join(","));
  if (Array.isArray(dayNight) && dayNight.length) params.set("dayNight", dayNight.join(","));
  if (Array.isArray(presetIds) && presetIds.length) params.set("presetIds", presetIds.join(","));
  return apiFetch(`/api/perfumes?${params.toString()}`);
}

export async function fetchCatalogWithDiagnostics(collectionName) {
  const mode = modeFromCollection(collectionName || "perfumes");
  const data = await fetchPerfumes(mode);
  const issues = [];
  const perfumes = [];

  for (const raw of data || []) {
    const id = raw.id;
    const localIssues = [];
    const p = normalizePerfume(raw, id, localIssues);
    issues.push(...localIssues);
    perfumes.push(p);
  }

  const summary = {
    docs: perfumes.length,
    warnings: issues.filter((x) => x.level === "warn").length,
  };

  return { perfumes, issues, summary };
}

export async function fetchPerfumesWithDiagnostics() {
  return fetchCatalogWithDiagnostics("perfumes");
}

export async function upsertPerfume(id, data, catalogMode = "retail") {
  if (!id) throw new Error("id обязателен");
  const payload = { ...data, id, catalogMode };
  await apiFetch(`/api/perfumes/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deletePerfume(id) {
  if (!id) throw new Error("id обязателен");
  await apiFetch(`/api/perfumes/${encodeURIComponent(id)}`, { method: "DELETE" });
}
