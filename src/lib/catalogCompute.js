import { scorePerfume } from "./scoring";

function translitRuToLat(input) {
  const map = {
    а: "a", б: "b", в: "v", г: "g", д: "d",
    е: "e", ё: "yo", ж: "zh", з: "z", и: "i",
    й: "y", к: "k", л: "l", м: "m", н: "n",
    о: "o", п: "p", р: "r", с: "s", т: "t",
    у: "u", ф: "f", х: "h", ц: "ts", ч: "ch",
    ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "",
    э: "e", ю: "yu", я: "ya",
  };
  return String(input || "")
    .split("")
    .map((ch) => (map[ch] != null ? map[ch] : ch))
    .join("");
}

function translitLatToRu(input) {
  const s = String(input || "");
  const pairs = [
    ["sch", "щ"],
    ["sh", "ш"],
    ["ch", "ч"],
    ["ya", "я"],
    ["yu", "ю"],
    ["yo", "ё"],
    ["zh", "ж"],
    ["ts", "ц"],
    ["kh", "х"],
    ["ye", "е"],
  ];
  let out = s;
  for (const [from, to] of pairs) {
    out = out.replaceAll(from, to);
  }
  const map = {
    a: "а",
    b: "б",
    v: "в",
    g: "г",
    d: "д",
    e: "е",
    z: "з",
    i: "и",
    y: "й",
    k: "к",
    l: "л",
    m: "м",
    n: "н",
    o: "о",
    p: "п",
    r: "р",
    s: "с",
    t: "т",
    u: "у",
    f: "ф",
    h: "х",
    q: "к",
    w: "в",
    x: "кс",
    j: "дж",
  };
  return out
    .split("")
    .map((ch) => (map[ch] != null ? map[ch] : ch))
    .join("");
}

function normalizeSearch(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-z0-9а-я\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSubsequence(needle, hay) {
  if (!needle || !hay) return false;
  let i = 0;
  for (let j = 0; j < hay.length && i < needle.length; j += 1) {
    if (hay[j] === needle[i]) i += 1;
  }
  return i === needle.length;
}

function levenshtein(a, b) {
  const s = String(a || "");
  const t = String(b || "");
  const n = s.length;
  const m = t.length;
  if (!n) return m;
  if (!m) return n;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1));
  for (let i = 0; i <= n; i += 1) dp[i][0] = i;
  for (let j = 0; j <= m; j += 1) dp[0][j] = j;
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[n][m];
}

function tokenMatches(token, hayToken) {
  if (!token || !hayToken) return false;
  if (hayToken.includes(token)) return true;
  if (token.length >= 3 && isSubsequence(token, hayToken)) return true;
  if (token.length >= 4) {
    const maxEdits = token.length <= 6 ? 1 : 2;
    if (levenshtein(token, hayToken) <= maxEdits) return true;
  }
  return false;
}

export function computeCatalog({ perfumes, q, mustNotes, avoidNotes, seasons, dayNight, sort, presetIds }) {
  const query = normalizeSearch(q);
  const queryAlt = translitRuToLat(query);
  const tokens = query ? query.split(" ").filter(Boolean) : [];
  const altTokens = queryAlt ? queryAlt.split(" ").filter(Boolean) : [];

  const presetIndex = Array.isArray(presetIds)
    ? presetIds.reduce((acc, id, idx) => {
        acc[id] = idx;
        return acc;
      }, {})
    : {};
  const base = Array.isArray(presetIds) && presetIds.length
    ? presetIds.map((id) => perfumes.find((p) => p.id === id)).filter(Boolean)
    : perfumes;

  const raw = base
    .map((p) => ({ perfume: p, score: scorePerfume(p, mustNotes, avoidNotes, seasons, dayNight) }))
    .filter(({ perfume }) => {
      if (!query) return true;
      const hay = [
        perfume.brand,
        perfume.name,
        perfume.searchNameRu,
        perfume.family,
        perfume.description,
        ...(perfume.tags || []),
        ...perfume.notes.top,
        ...perfume.notes.heart,
        ...perfume.notes.base,
      ]
        .join(" ");
      const hayNorm = normalizeSearch(hay);
      const hayAlt = translitRuToLat(hayNorm);
      const hayRu = translitLatToRu(hayNorm);
      const hayTokens = hayNorm.split(" ").filter(Boolean);
      const hayAltTokens = hayAlt.split(" ").filter(Boolean);
      const hayRuTokens = hayRu.split(" ").filter(Boolean);

      if (!tokens.length) return true;
      const tokensOk = tokens.every((t) => {
        return (
          hayNorm.includes(t) ||
          hayAlt.includes(t) ||
          hayRu.includes(t) ||
          hayTokens.some((h) => tokenMatches(t, h)) ||
          hayAltTokens.some((h) => tokenMatches(t, h)) ||
          hayRuTokens.some((h) => tokenMatches(t, h))
        );
      });
      if (tokensOk) return true;

      if (altTokens.length) {
        const altOk = altTokens.every((t) => {
          return (
            hayNorm.includes(t) ||
            hayAlt.includes(t) ||
            hayRu.includes(t) ||
            hayTokens.some((h) => tokenMatches(t, h)) ||
            hayAltTokens.some((h) => tokenMatches(t, h)) ||
            hayRuTokens.some((h) => tokenMatches(t, h))
          );
        });
        if (altOk) return true;
      }
      return false;
    });

  const minScore = mustNotes.length ? 1 : -999;
  const filtered = raw.filter((x) => x.score >= minScore);

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "preset" && presetIds && presetIds.length) {
      const ai = presetIndex[a.perfume.id] ?? 999999;
      const bi = presetIndex[b.perfume.id] ?? 999999;
      return ai - bi;
    }
    if (sort === "hits") {
      const d = (Number(b.perfume.orderCount || 0) - Number(a.perfume.orderCount || 0));
      return d !== 0 ? d : b.score - a.score;
    }
    if (sort === "match") return b.score - a.score;
    if (sort === "popular") {
      const d = (b.perfume.popularity || 0) - (a.perfume.popularity || 0);
      return d !== 0 ? d : b.score - a.score;
    }
    if (sort === "popular_month") {
      const d = (b.perfume.popularityMonth || 0) - (a.perfume.popularityMonth || 0);
      return d !== 0 ? d : (b.perfume.popularity || 0) - (a.perfume.popularity || 0);
    }
    if (sort === "price_asc") return a.perfume.price - b.perfume.price;
    if (sort === "price_desc") return b.perfume.price - a.perfume.price;
    if (sort === "longevity") return b.perfume.longevity - a.perfume.longevity;
    if (sort === "sillage") return b.perfume.sillage - a.perfume.sillage;
    return b.score - a.score;
  });

  return { total: sorted.length, items: sorted };
}
