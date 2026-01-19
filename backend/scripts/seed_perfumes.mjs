import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..", "..");

const jsonSeedPath = path.join(__dirname, "perfumes.seed.json");
let perfumes = [];

if (fs.existsSync(jsonSeedPath)) {
  const raw = fs.readFileSync(jsonSeedPath, "utf8");
  perfumes = JSON.parse(raw);
} else {
  const perfumesPath = pathToFileURL(path.join(root, "src", "data", "perfumes.js")).href;
  const mod = await import(perfumesPath);
  perfumes = Array.isArray(mod.PERFUMES) ? mod.PERFUMES : [];
}

function sqlString(value) {
  if (value == null) return "''";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlArray(values) {
  if (!Array.isArray(values) || values.length === 0) return "ARRAY[]::text[]";
  const items = values.map((v) => sqlString(v));
  return `ARRAY[${items.join(", ")}]`;
}

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asBool(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function buildInsert(p) {
  const id = String(p.id || "").trim();
  if (!id) return "";
  const brand = p.brand || "";
  const name = p.name || "";
  const family = p.family || "";
  const description = p.description || "";
  const tags = Array.isArray(p.tags) ? p.tags : [];
  const notesTop = p.notes?.top || [];
  const notesHeart = p.notes?.heart || [];
  const notesBase = p.notes?.base || [];
  const seasons = p.seasons || [];
  const dayNight = p.dayNight || [];
  const basePrice = asNumber(p.basePrice ?? p.price, 0);
  const baseVolume = Math.round(asNumber(p.baseVolume ?? p.volume ?? 50, 50));
  const sillage = Math.round(asNumber(p.sillage ?? 3, 3));
  const longevity = Math.round(asNumber(p.longevity ?? 3, 3));
  const image = p.image || "";
  const searchNameRu = p.searchNameRu || "";
  const isHit = asBool(p.isHit, false);
  const orderCount = Math.round(asNumber(p.orderCount ?? 0, 0));
  const inStock = asBool(p.inStock, true);
  const currency = p.currency || "₽";
  const popularity = Math.round(asNumber(p.popularity ?? 0, 0));
  const popularityMonth = Math.round(asNumber(p.popularityMonth ?? 0, 0));
  const popularityMonthKey = p.popularityMonthKey || "";

  return `INSERT INTO perfumes (
  id, catalog_mode, brand, name, family, description,
  tags, notes_top, notes_heart, notes_base,
  seasons, day_night, base_price, base_volume, sillage, longevity,
  image_url, search_name_ru, is_hit, order_count, in_stock, currency,
  popularity, popularity_month, popularity_month_key,
  review_avg, review_count, created_at, updated_at
) VALUES (
  ${sqlString(id)}, 'retail', ${sqlString(brand)}, ${sqlString(name)}, ${sqlString(family)}, ${sqlString(description)},
  ${sqlArray(tags)}, ${sqlArray(notesTop)}, ${sqlArray(notesHeart)}, ${sqlArray(notesBase)},
  ${sqlArray(seasons)}, ${sqlArray(dayNight)}, ${basePrice}, ${baseVolume}, ${sillage}, ${longevity},
  ${sqlString(image)}, ${sqlString(searchNameRu)}, ${isHit}, ${orderCount}, ${inStock}, ${sqlString(currency)},
  ${popularity}, ${popularityMonth}, ${sqlString(popularityMonthKey)},
  0, 0, now(), now()
)
ON CONFLICT (id) DO UPDATE SET
  catalog_mode = EXCLUDED.catalog_mode,
  brand = EXCLUDED.brand,
  name = EXCLUDED.name,
  family = EXCLUDED.family,
  description = EXCLUDED.description,
  tags = EXCLUDED.tags,
  notes_top = EXCLUDED.notes_top,
  notes_heart = EXCLUDED.notes_heart,
  notes_base = EXCLUDED.notes_base,
  seasons = EXCLUDED.seasons,
  day_night = EXCLUDED.day_night,
  base_price = EXCLUDED.base_price,
  base_volume = EXCLUDED.base_volume,
  sillage = EXCLUDED.sillage,
  longevity = EXCLUDED.longevity,
  image_url = EXCLUDED.image_url,
  search_name_ru = EXCLUDED.search_name_ru,
  is_hit = EXCLUDED.is_hit,
  order_count = EXCLUDED.order_count,
  in_stock = EXCLUDED.in_stock,
  currency = EXCLUDED.currency,
  popularity = EXCLUDED.popularity,
  popularity_month = EXCLUDED.popularity_month,
  popularity_month_key = EXCLUDED.popularity_month_key,
  updated_at = now();`;
}

const rows = perfumes.map(buildInsert).filter(Boolean);
const sql = [
  "BEGIN;",
  "DELETE FROM perfumes WHERE catalog_mode = 'retail';",
  ...rows,
  "COMMIT;",
].join("\n\n");

const outPath = path.join(root, "backend", "migrations", "002_seed_perfumes.sql");
fs.writeFileSync(outPath, sql, "utf8");

console.log(`Seed file written to ${outPath}`);
