import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import { useShop } from "../state/shop";
import { useAuth } from "../state/auth";
import { clamp } from "../lib/utils";
import { THEME } from "../data/theme";
import { ALL_NOTES_GROUPS} from "../data/perfumes";
import { CATALOG_PRESETS } from "../data/catalogPresets";

import { buildAllNotes, buildDefaultVolumeById } from "../lib/catalog";
import { computeCatalog } from "../lib/catalogCompute";

import { logStatEvent } from "../services/statsRepo";


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
  const { cart, favorites, toggleFavorite, addToCart, perfumes, loadingPerfumes, perfumesError, perfumesDiagnostics } = useShop();
  const cartCount = cart.reduce((sum, x) => sum + (Number(x.qty) || 0), 0);

  const allNotes = useMemo(() => buildAllNotes(perfumes, ALL_NOTES_GROUPS), [perfumes]);

const [volumeById, setVolumeById] = useState({});

useEffect(() => {
  setVolumeById(buildDefaultVolumeById(perfumes));
}, [perfumes]);


  const getVolume = (id) => (volumeById[id] != null ? volumeById[id] : 50);
  const setVolume = (id, v) => {
    const safe = clamp(Number(v) || 50, 10, 100);
    setVolumeById((prev) => ({ ...prev, [id]: safe }));
  };

  const [mustNotes, setMustNotes] = useState([]);
  const [avoidNotes, setAvoidNotes] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [dayNight, setDayNight] = useState([]);
  const [q, setQ] = useState("");
  // По умолчанию — популярные ароматы
  const [sort, setSort] = useState("popular");

  const [filtersOpenMobile, setFiltersOpenMobile] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  // Пагинация (чтобы каталог не превращался в бесконечную колонну)
  const PAGE_SIZE = 6; // поменяй на 8/16/24 если нужно
  const [page, setPage] = useState(1);

  // модалка подробностей (можешь заменить на navigate(`/perfumes/${id}`), если захочешь)
  const [activePerfume, setActivePerfume] = useState(null);
  const activeVolume = activePerfume ? getVolume(activePerfume.id) : 50;

  const computed = useMemo(
    () =>
      computeCatalog({
        perfumes,
        q,
        mustNotes,
        avoidNotes,
        seasons,
        dayNight,
        sort,
      }),
    [perfumes, q, mustNotes, avoidNotes, seasons, dayNight, sort]
  );

  // если поменяли фильтры/поиск/сортировку — возвращаемся на 1 страницу
  useEffect(() => {
    setPage(1);
  }, [q, sort, mustNotes, avoidNotes, seasons, dayNight]);

  const totalPages = Math.max(1, Math.ceil((computed.total || 0) / PAGE_SIZE));

  // если текущая страница стала больше, чем доступно (например, результатов стало меньше)
  useEffect(() => {
    setPage((p) => clamp(p, 1, totalPages));
  }, [totalPages]);

  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return computed.items.slice(start, start + PAGE_SIZE);
  }, [computed.items, page]);

  const clearAll = () => {
    setMustNotes([]);
    setAvoidNotes([]);
    setSeasons([]);
    setDayNight([]);
    setQ("");
    setSort("popular");
  };

  const toggleSeason = (s) => setSeasons((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const toggleDayNight = (d) => setDayNight((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const presets = useMemo(() => {
    return CATALOG_PRESETS.map((p) => ({
      title: p.title,
      apply: () => {
        setSeasons(p.seasons);
        setDayNight(p.dayNight);
        setMustNotes(p.mustNotes);
        setAvoidNotes(p.avoidNotes);
        setSort(p.sort);
      },
    }));
  }, []);

  const filtersNode = (
    <CatalogFilters
      presets={presets}
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
            q={q}
            onChangeQ={setQ}
            onClearQ={() => setQ("")}
            sort={sort}
            onChangeSort={setSort}
            total={computed.total}
            favoritesCount={favorites.length}
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
              ⚠️ В Firestore есть предупреждения по данным: {perfumesDiagnostics.summary.warnings}. Каталог не падает, но лучше поправить документы.
            </div>
          ) : null}

          {loadingPerfumes ? (
  <div className="mt-5 text-sm opacity-70">Загрузка каталога...</div>
) : perfumesError ? (
  <div className="mt-5 text-sm opacity-70">
    Не получилось загрузить каталог из Firestore. Проверь Firestore Rules / интернет.
  </div>
) : computed.total === 0 ? (
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
      <AnimatePresence>
        {pagedItems.map(({ perfume, score }) => (
          <PerfumeCard
            key={perfume.id}
            perfume={perfume}
            score={score}
            liked={favorites.includes(perfume.id)}
            volume={getVolume(perfume.id)}
            onVolumeChange={(v) => setVolume(perfume.id, v)}
            onLike={() => toggleFavorite(perfume.id)}
            onDetails={() => {
              logStatEvent({ perfumeId: perfume.id, type: "view" });
              setActivePerfume(perfume);
            }}
            onAddToCart={() => {
              logStatEvent({ perfumeId: perfume.id, type: "add_to_cart" });
              addToCart(perfume.id, getVolume(perfume.id), 1);
              navigate("/cart");
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  </>
)}

          {computed.total > PAGE_SIZE ? (
            <div className="mt-5">
              <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          ) : null}


        </section>
      </main>

      <MobileFiltersSheet
        open={filtersOpenMobile}
        total={computed.total}
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
        liked={Boolean(activePerfume && favorites.includes(activePerfume.id))}
        onVolumeChange={(v) => activePerfume && setVolume(activePerfume.id, v)}
        onClose={() => setActivePerfume(null)}
        onAddToCart={() => {
          if (!activePerfume) return;
          logStatEvent({ perfumeId: activePerfume.id, type: "add_to_cart" });
          addToCart(activePerfume.id, activeVolume, 1);
          setActivePerfume(null);
          navigate("/cart");
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