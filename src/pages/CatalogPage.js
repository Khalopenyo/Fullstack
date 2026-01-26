import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import { useShop } from "../state/shop";
import { useAuth } from "../state/auth";
import { clamp } from "../lib/utils";
import { THEME } from "../data/theme";
import { ALL_NOTES_GROUPS} from "../data/perfumes";

import { buildAllNotes, buildDefaultVolumeById } from "../lib/catalog";
import { setCanonical, setMeta, setOpenGraphImage } from "../lib/seo";

import { logStatEvent } from "../services/statsRepo";
import { computeReviewSummary } from "../services/reviewsRepo";
import { listPresets } from "../services/presetsRepo";
import { fetchPerfumesPage } from "../services/perfumesRepo";
import PerfumeCard from "../components/PerfumeCard";
import CatalogFilters from "../components/Filters";
import MobileFiltersSheet from "../components/MobileFiltersSheet";
import HelpModal from "../components/HelpModal";
import PerfumeDetailsModal from "../components/PerfumeDetailsModal";

import CatalogHeader from "../components/CatalogHeader";
import CatalogToolbar from "../components/CatalogToolbar";
import EmptyResults from "../components/EmptyResults";
import CatalogFooter from "../components/CatalogFooter";
import PaginationBar from "../components/PaginationBar";

export default function CatalogPage() {
  const navigate = useNavigate();
  const { openAuthModal, user } = useAuth();
  const authLabel = user ? (user.isAnonymous ? "Гость" : (user.email || "Аккаунт")) : "Аккаунт";
  const { cart, favorites, toggleFavorite, addToCart, perfumes, perfumesError, perfumesDiagnostics } = useShop();
  const cartCount = cart.reduce((sum, x) => sum + (Number(x.qty) || 0), 0);

  const allNotes = useMemo(() => buildAllNotes(perfumes, ALL_NOTES_GROUPS), [perfumes]);

const [volumeById, setVolumeById] = useState({});
const [mixById, setMixById] = useState({});

useEffect(() => {
  setVolumeById(buildDefaultVolumeById(perfumes));
}, [perfumes]);

useEffect(() => {
  setMeta({
    title: "Bakhur — каталог масляных ароматов",
    description: "Каталог масляных ароматов: подбор по нотам, сезонам и времени дня. Заказ через мессенджеры.",
  });
  setCanonical(window.location.origin + "/");
  setOpenGraphImage(window.location.origin + "/logo192.png");
}, []);

useEffect(() => {
  let alive = true;
  (async () => {
    try {
      const data = await listPresets();
      if (!alive) return;
      setPresetsData(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      if (alive) setPresetsData([]);
    }
  })();
  return () => {
    alive = false;
  };
}, []);


  const getVolume = (id) => (volumeById[id] != null ? volumeById[id] : 50);
  const getMix = (id) => (mixById[id] != null ? mixById[id] : "60/40");
  const setVolume = (id, v) => {
    const safe = clamp(Number(v) || 50, 20, 100);
    setVolumeById((prev) => ({ ...prev, [id]: safe }));
  };
  const setMix = (id, v) => {
    setMixById((prev) => ({ ...prev, [id]: v || "60/40" }));
  };

  const [mustNotes, setMustNotes] = useState([]);
  const [avoidNotes, setAvoidNotes] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [dayNight, setDayNight] = useState([]);
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const [presetIds, setPresetIds] = useState([]);
  const [activePresetId, setActivePresetId] = useState("");
  const [activeGroupId, setActiveGroupId] = useState("");
  const [presetsData, setPresetsData] = useState([]);

  const searchSuggestions = useMemo(() => {
    const normalizeSearch = (input) =>
      String(input || "")
        .toLowerCase()
        .replace(/ё/g, "е")
        .replace(/[^a-z0-9а-я\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const levenshtein = (a, b) => {
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
    };

    const tokenMatches = (token, hayToken) => {
      if (!token || !hayToken) return false;
      if (hayToken.includes(token)) return true;
      if (token.length >= 3) {
        let i = 0;
        for (let j = 0; j < hayToken.length && i < token.length; j += 1) {
          if (hayToken[j] === token[i]) i += 1;
        }
        if (i === token.length) return true;
      }
      if (token.length >= 4) {
        const maxEdits = token.length <= 6 ? 1 : 2;
        if (levenshtein(token, hayToken) <= maxEdits) return true;
      }
      return false;
    };

    const matchTokens = (tokens, text) => {
      if (!tokens.length) return false;
      const hay = normalizeSearch(text);
      if (!hay) return false;
      const words = hay.split(" ").filter(Boolean);
      return tokens.every((t) => words.some((w) => tokenMatches(t, w)));
    };

    const query = normalizeSearch(q);
    if (query.length < 2) return [];
    const tokens = query.split(/\s+/).filter(Boolean);
    const matches = perfumes
      .map((p) => {
        const name = String(p.name || "");
        const brand = String(p.brand || "");
        const nameHit = matchTokens(tokens, name);
        const brandHit = matchTokens(tokens, brand);
        const score = (nameHit ? 2 : 0) + (brandHit ? 1 : 0);
        if (!score) return null;
        return { id: p.id, name: p.name || "", brand: p.brand || "", score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    return matches.slice(0, 5);
  }, [perfumes, q]);
  // По умолчанию — популярные ароматы
  const [sort, setSort] = useState("popular");

  const [filtersOpenMobile, setFiltersOpenMobile] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  // Пагинация (чтобы каталог не превращался в бесконечную колонну)
  const PAGE_SIZE = 6; // поменяй на 8/16/24 если нужно
  const [page, setPage] = useState(1);
  const [pageItems, setPageItems] = useState([]);
  const [pageTotal, setPageTotal] = useState(0);
  const [pageLoading, setPageLoading] = useState(false);
  const [pageError, setPageError] = useState(null);

  const autoHitIds = useMemo(() => {
    const withCounts = (perfumes || [])
      .map((p) => ({ id: p.id, count: Number(p.orderCount || 0), isHit: Boolean(p.isHit) }))
      .filter((p) => p.count > 0)
      .sort((a, b) => b.count - a.count);
    const top = withCounts.slice(0, 5).map((p) => p.id);
    const manual = (perfumes || []).filter((p) => p.isHit).map((p) => p.id);
    return new Set([...top, ...manual]);
  }, [perfumes]);

  // модалка подробностей (можешь заменить на navigate(`/perfumes/${id}`), если захочешь)
  const [activePerfume, setActivePerfume] = useState(null);
  const activeVolume = activePerfume ? getVolume(activePerfume.id) : 50;
  const activeMix = activePerfume ? getMix(activePerfume.id) : "60/40";

  // если поменяли фильтры/поиск/сортировку — возвращаемся на 1 страницу
  useEffect(() => {
    setPage(1);
  }, [q, sort, mustNotes, avoidNotes, seasons, dayNight, presetIds]);

  useEffect(() => {
    let alive = true;
    setPageLoading(true);
    setPageError(null);
    fetchPerfumesPage({
      mode: "retail",
      page,
      pageSize: PAGE_SIZE,
      q: deferredQ,
      mustNotes,
      avoidNotes,
      seasons,
      dayNight,
      sort,
      presetIds,
    })
      .then((data) => {
        if (!alive) return;
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setPageItems(items);
        setPageTotal(Number(data?.total || items.length || 0));
      })
      .catch((e) => {
        console.error(e);
        if (!alive) return;
        setPageItems([]);
        setPageTotal(0);
        setPageError(e);
      })
      .finally(() => {
        if (!alive) return;
        setPageLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [page, PAGE_SIZE, deferredQ, mustNotes, avoidNotes, seasons, dayNight, sort, presetIds]);

  const totalPages = Math.max(1, Math.ceil((pageTotal || 0) / PAGE_SIZE));

  // если текущая страница стала больше, чем доступно (например, результатов стало меньше)
  useEffect(() => {
    setPage((p) => clamp(p, 1, totalPages));
  }, [totalPages]);

  const pagedItems = pageItems;

  const [reviewSummaries, setReviewSummaries] = useState({});

  useEffect(() => {
    let alive = true;
    if (!pagedItems.length) {
      setReviewSummaries({});
      return () => {
        alive = false;
      };
    }

    (async () => {
      const entries = await Promise.all(
        pagedItems.map(async (perfume) => {
          const summary = await computeReviewSummary(perfume?.id);
          return [perfume?.id, summary];
        })
      );
      if (!alive) return;
      setReviewSummaries((prev) => {
        const next = { ...prev };
        for (const [id, summary] of entries) {
          next[id] = summary;
        }
        return next;
      });
    })();

    return () => {
      alive = false;
    };
  }, [pagedItems]);

  const clearAll = () => {
    setMustNotes([]);
    setAvoidNotes([]);
    setSeasons([]);
    setDayNight([]);
    setQ("");
    setSort("popular");
    setPresetIds([]);
    setActivePresetId("");
    setActiveGroupId("");
  };

  const toggleSeason = (s) => setSeasons((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const toggleDayNight = (d) => setDayNight((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const presets = useMemo(() => {
    return (presetsData || []).map((p) => ({
      id: p.id,
      title: p.title,
      subtitle: p.subtitle,
      notes: p.notes,
      groups: Array.isArray(p.groups)
        ? p.groups.map((g) => ({
            id: g.id,
            title: g.title,
            subtitle: g.subtitle,
            notes: g.notes,
            perfumeIds: Array.isArray(g.perfumeIds) ? g.perfumeIds : [],
          }))
        : [],
    }));
  }, [presetsData]);

  const onSelectPreset = (preset) => {
    setActivePresetId(preset?.id || "");
    setActiveGroupId("");
    setPresetIds([]);
    setQ("");
    setMustNotes([]);
    setAvoidNotes([]);
    setSeasons([]);
    setDayNight([]);
  };

  const onSelectGroup = (preset, group) => {
    const nextIds = Array.isArray(group?.perfumeIds) ? group.perfumeIds : [];
    setPresetIds(nextIds);
    setActivePresetId(preset?.id || "");
    setActiveGroupId(group?.id || group?.title || "");
    setQ("");
    setMustNotes([]);
    setAvoidNotes([]);
    setSeasons([]);
    setDayNight([]);
    setSort("preset");
  };

  const filtersNode = (
    <CatalogFilters
      presets={presets}
      activePresetId={activePresetId}
      activeGroupId={activeGroupId}
      onSelectPreset={onSelectPreset}
      onSelectGroup={onSelectGroup}
      seasons={seasons}
      toggleSeason={toggleSeason}
      dayNight={dayNight}
      toggleDayNight={toggleDayNight}
      mustNotes={mustNotes}
      setMustNotes={setMustNotes}
      avoidNotes={avoidNotes}
      setAvoidNotes={setAvoidNotes}
      allNotes={allNotes}
      onOpenHelp={() => setHelpOpen(true)}
    />
  );

  return (
    <div className="min-h-screen" style={{ background: THEME.bg, color: THEME.text }}>
      <CatalogHeader
        favoritesCount={favorites.length}
        cartCount={cartCount}
        onGoFavorites={() => navigate("/favorites")}
        onGoCart={() => navigate("/cart")}
        onOpenHelp={() => setHelpOpen(true)}
        onOpenFilters={() => setFiltersOpenMobile(true)}
        onOpenAuth={openAuthModal}
        authLabel={authLabel}
        q={q}
        onChangeQ={setQ}
        onClearQ={() => setQ("")}
        suggestions={searchSuggestions}
        onSelectSuggestion={(s) => setQ([s.name, s.brand].filter(Boolean).join(" "))}
        onGoWholesale={() => navigate("/wholesale")}
      />

      {/*
        ВАЖНО: десктопную версию НЕ трогаем.
        Этот проект подключает заранее собранный Tailwind (src/output.css),
        поэтому используем исходные breakpoint-классы (md/ lg),
        которые точно есть в output.css.
      */}
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:grid-cols-12">
        <aside className="hidden md:col-span-4 md:block">
          <div className="space-y-4">{filtersNode}</div>
          <button
            type="button"
            className="mt-4 w-full rounded-full border px-4 py-2.5 text-sm transition hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-[rgba(127,122,73,0.40)]"
            style={{ borderColor: THEME.border2, color: THEME.text }}
            onClick={clearAll}
          >
            Сбросить всё
          </button>
        </aside>

        <section className="md:col-span-8">
          <CatalogToolbar
            sort={sort}
            onChangeSort={setSort}
            onClearAll={clearAll}
            onOpenFilters={() => setFiltersOpenMobile(true)}
          onOpenAuth={openAuthModal}
          authLabel={authLabel}
          />

          {perfumesDiagnostics?.summary?.warnings ? (
            <div
              className="mt-4 rounded-2xl border px-4 py-3 text-sm"
              style={{ borderColor: "rgba(255,200,120,0.35)", background: "rgba(255,200,120,0.06)" }}
            >
              ⚠️ В данных есть предупреждения: {perfumesDiagnostics.summary.warnings}. Каталог не падает, но лучше поправить записи.
            </div>
          ) : null}

          

          {pageLoading ? (
  <div className="mt-5 text-sm opacity-70">Загрузка каталога...</div>
) : pageError || perfumesError ? (
  <div className="mt-5 text-sm opacity-70">
    Не получилось загрузить каталог. Проверь API и подключение.
  </div>
) : pageTotal === 0 ? (
  <EmptyResults
    onRelax={() => {
      setAvoidNotes([]);
      setSeasons([]);
      setDayNight([]);
    }}
    onClearAll={clearAll}
  />
) : (
  <>
    {/* {computed.total > PAGE_SIZE ? (
      <div className="mt-5">
        <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    ) : null} */}

    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <AnimatePresence mode="wait" initial={false}>
        {pagedItems.map((perfume) => (
          <PerfumeCard
            key={perfume.id}
            perfume={{ ...perfume, isHit: perfume.isHit || autoHitIds.has(perfume.id) }}
            liked={favorites.includes(perfume.id)}
            reviewSummary={reviewSummaries[perfume.id]}
            volume={getVolume(perfume.id)}
            onVolumeChange={(v) => setVolume(perfume.id, v)}
            mix={getMix(perfume.id)}
            onMixChange={(v) => setMix(perfume.id, v)}
            onLike={() => toggleFavorite(perfume.id)}
            onDetails={() => {
              logStatEvent({ perfumeId: perfume.id, type: "view" });
              setActivePerfume(perfume);
            }}
            onAddToCart={() => {
              logStatEvent({ perfumeId: perfume.id, type: "add_to_cart" });
              addToCart(perfume.id, getVolume(perfume.id), 1, getMix(perfume.id));
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  </>
)}

          {pageTotal > PAGE_SIZE ? (
            <div className="mt-5">
              <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          ) : null}


        </section>
      </main>

      <MobileFiltersSheet
        open={filtersOpenMobile}
        total={pageTotal}
        onClose={() => setFiltersOpenMobile(false)}
        onClear={clearAll}
      >
        {filtersNode}
      </MobileFiltersSheet>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      <PerfumeDetailsModal
        open={Boolean(activePerfume)}
        perfume={activePerfume}
        volume={activeVolume}
        mix={activeMix}
        liked={Boolean(activePerfume && favorites.includes(activePerfume.id))}
        onVolumeChange={(v) => activePerfume && setVolume(activePerfume.id, v)}
        onMixChange={(v) => activePerfume && setMix(activePerfume.id, v)}
        onClose={() => setActivePerfume(null)}
        onAddToCart={() => {
          if (!activePerfume) return;
          logStatEvent({ perfumeId: activePerfume.id, type: "add_to_cart" });
          addToCart(activePerfume.id, activeVolume, 1, activeMix);
          setActivePerfume(null);
        }}
        onToggleFavorite={() => {
          if (!activePerfume) return;
          toggleFavorite(activePerfume.id);
        }}
      />

      <CatalogFooter onOpenHelp={() => setHelpOpen(true)} />
    </div>
  );
}
