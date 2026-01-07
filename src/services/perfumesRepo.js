import { collection, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";

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

  // Если документ хранит ноты плоским массивом notes: [...]
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

  // Валюта (в статическом датасете она есть, но в Firestore могла не быть)
  const currency = asString(raw.currency, "₽").trim() || "₽";

  // Популярность (лучше поддерживать на бэке через Cloud Functions)
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

    currency,
    popularity,
    popularityMonth,
    popularityMonthKey,
  };

  return perfume;
}

export async function fetchPerfumes() {
  const snap = await getDocs(collection(db, "perfumes"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchPerfumesWithDiagnostics() {
  const snap = await getDocs(collection(db, "perfumes"));
  const issues = [];
  const perfumes = [];

  for (const d of snap.docs) {
    const id = d.id;
    const raw = d.data();
    const localIssues = [];
    const p = normalizePerfume(raw, id, localIssues);

    // Документ «плохой», но мы не дропаем его полностью — только сообщаем.
    // Если ты захочешь, можно сделать строгий drop по условиям.
    issues.push(...localIssues);
    perfumes.push(p);
  }

  const summary = {
    docs: snap.docs.length,
    warnings: issues.filter((x) => x.level === "warn").length,
  };

  return { perfumes, issues, summary };
}

export async function upsertPerfume(id, data) {
  if (!id) throw new Error("id обязателен");
  const ref = doc(db, "perfumes", id);
  await setDoc(
    ref,
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function deletePerfume(id) {
  if (!id) throw new Error("id обязателен");
  await deleteDoc(doc(db, "perfumes", id));
}
