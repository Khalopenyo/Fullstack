import React, { useMemo } from "react";

import { THEME } from "../data/theme";
import { clamp } from "../lib/utils";

function buildPages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set([1, total, current]);
  pages.add(clamp(current - 1, 1, total));
  pages.add(clamp(current + 1, 1, total));

  // добавим ещё по одной возле краёв, чтобы навигация была удобнее
  pages.add(2);
  pages.add(total - 1);

  return Array.from(pages)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
}

export default function PaginationBar({ page, totalPages, onPageChange, makeHref }) {
  const safePage = clamp(page || 1, 1, totalPages || 1);
  const pages = useMemo(() => buildPages(safePage, totalPages), [safePage, totalPages]);

  const go = (p) => onPageChange(clamp(p, 1, totalPages));
  const hrefFor = (p) => (makeHref ? makeHref(p) : `/?page=${p}`);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        className="rounded-full border px-3 py-2 text-sm transition hover:bg-white/[0.06] disabled:opacity-40"
        style={{ borderColor: THEME.border2, color: THEME.text }}
        href={hrefFor(Math.max(1, safePage - 1))}
        onClick={(e) => {
          if (safePage <= 1) {
            e.preventDefault();
            return;
          }
          go(safePage - 1);
        }}
        aria-disabled={safePage <= 1}
      >
        <span className="sm:hidden">←</span>
        <span className="hidden sm:inline-flex">← Назад</span>
      </a>

      <div className="flex flex-wrap items-center gap-2">
        {pages.map((p, idx) => {
          const prev = pages[idx - 1];
          const needDots = prev && p - prev > 1;
          return (
            <React.Fragment key={p}>
              {needDots ? <span className="px-1 opacity-60">…</span> : null}
              <a
                className="rounded-full border px-3 py-2 text-sm transition hover:bg-white/[0.06]"
                style={
                  p === safePage
                    ? { borderColor: THEME.accentRing, background: THEME.accentSoft, color: THEME.text }
                    : { borderColor: THEME.border2, color: THEME.text }
                }
                href={hrefFor(p)}
                onClick={(e) => {
                  e.preventDefault();
                  go(p);
                }}
                aria-current={p === safePage ? "page" : undefined}
              >
                {p}
              </a>
            </React.Fragment>
          );
        })}
      </div>

      <a
        className="rounded-full border px-3 py-2 text-sm transition hover:bg-white/[0.06] disabled:opacity-40"
        style={{ borderColor: THEME.border2, color: THEME.text }}
        href={hrefFor(Math.min(totalPages, safePage + 1))}
        onClick={(e) => {
          if (safePage >= totalPages) {
            e.preventDefault();
            return;
          }
          go(safePage + 1);
        }}
        aria-disabled={safePage >= totalPages}
      >
        <span className="sm:hidden">→</span>
        <span className="hidden sm:inline-flex">Вперёд →</span>
      </a>

      <span className="ml-1 hidden text-sm opacity-70 sm:inline-flex">Страница {safePage} из {totalPages}</span>
    </div>
  );
}
