import React, { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";

import { THEME } from "../data/theme";
import { plural } from "../lib/utils";
import { SEASONS, ALL_NOTES_GROUPS } from "../data/perfumes";

function SoftButton({ children, onClick, active, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-[rgba(127,122,73,0.40)] focus:ring-offset-0 " +
        (active
          ? "border-[rgba(247,242,232,0.20)] bg-white/[0.06] text-white"
          : "border-white/10 bg-white/[0.02] text-white/80 hover:bg-white/[0.05]")
      }
    >
      {children}
    </button>
  );
}

function Chip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-sm text-white">
      <span className="text-white/90">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white"
        aria-label={"Удалить " + label}
      >
        <X className="h-4 w-4" />
      </button>
    </span>
  );
}

function Chevron({ open }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 160ms ease",
      }}
      // className=""
    >
      <polygon points="12,19 7,9 17,9" fill="white" />
    </svg>
  );
}

function SectionCard({ title, subtitle, children, defaultOpen = true, right }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="rounded-3xl border bg-white/[0.02] p-4"
      style={{ borderColor: THEME.border2 }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <div className="w-full">
          <div
            className="text-sm w-full font-semibold"
            style={{ color: THEME.text }}
          >
            {title}
          </div>
          {subtitle ? (
            <div className="mt-0.5 text-xs" style={{ color: THEME.muted }}>
              {subtitle}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <span
            className="rounded-full p-1 hover:bg-white/10"
            aria-hidden="true"
          >
            <Chevron open={open} />
          </span>
        </div>
      </button>
      {open ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

function NotePicker({ title, value, onChange, placeholder, tone, allNotes }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = allNotes.filter((n) => !value.includes(n));
    if (!q) return base.slice(0, 14);
    return base.filter((n) => n.toLowerCase().includes(q)).slice(0, 14);
  }, [query, allNotes, value]);

  const badgeStyle =
    tone === "include"
      ? {
          borderColor: "rgba(247,242,232,0.18)",
          background: "rgba(127,122,73,0.14)",
        }
      : {
          borderColor: "rgba(247,242,232,0.18)",
          background: "rgba(247,242,232,0.06)",
        };

  return (
    <SectionCard
      title={title}
      subtitle={
        tone === "include"
          ? "Выберите ноты, которые хотите слышать"
          : "Отметьте ноты, которые точно не подходят"
      }
      defaultOpen={false}
      // right={
      // }
    >
      <div className="flex flex-wrap gap-2">
        {value.length === 0 ? (
          <div className="text-sm flex justify-between w-full" style={{ color: THEME.muted }}>
            Выберите
            <div
              className="rounded-full border px-3 py-1 text-xs"
              style={{ ...badgeStyle, color: THEME.text }}
            >
              {value.length} {plural(value.length, "нота", "ноты", "нот")}
            </div>
          </div>
        ) : (
          value.map((n) => (
            <Chip
              key={n}
              label={n}
              onRemove={() => onChange(value.filter((x) => x !== n))}
            />
          ))
        )}
      </div>

      <div className="mt-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: THEME.muted2 }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-2xl border bg-transparent px-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[rgba(127,122,73,0.40)]"
            style={{ borderColor: THEME.border2, color: THEME.text }}
            placeholder={placeholder}
          />
          {query ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 hover:bg-white/10"
              onClick={() => setQuery("")}
              aria-label="Очистить"
            >
              <X className="h-4 w-4" style={{ color: THEME.muted }} />
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {filtered.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                onChange([...value, n]);
                setQuery("");
              }}
              className="rounded-full border px-3 py-1.5 text-sm transition hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-[rgba(127,122,73,0.40)]"
              style={{ borderColor: THEME.border2, color: THEME.text }}
            >
              <span
                className="mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle"
                style={{
                  background:
                    tone === "include"
                      ? THEME.accent
                      : "rgba(247,242,232,0.60)",
                }}
              />
              {n}
            </button>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

export default function CatalogFilters({
  presets,
  seasons,
  toggleSeason,
  dayNight,
  toggleDayNight,
  mustNotes,
  setMustNotes,
  avoidNotes,
  setAvoidNotes,
  allNotes,
}) {
  return (
    <div className="space-y-4">
      <SectionCard
        title="Быстрый старт"
        subtitle="Пресеты — самый быстрый путь к подходящим ароматам."
        defaultOpen={true}
      >
        <div className="mt-1 text-xs" style={{ color: THEME.muted }}></div>
        <div className="mt-3 flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.title}
              type="button"
              className="rounded-full border px-3 py-1.5 text-sm transition hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-[rgba(127,122,73,0.40)]"
              style={{ borderColor: THEME.border2, color: THEME.text }}
              onClick={p.apply}
            >
              {p.title}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Сезон"
        subtitle="Можно выбрать несколько"
        defaultOpen={false}
      >
        <div className="flex flex-wrap gap-2">
          {SEASONS.map((s) => (
            <SoftButton
              key={s.key}
              active={seasons.includes(s.key)}
              onClick={() => toggleSeason(s.key)}
              title={s.hint}
            >
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{
                  background: seasons.includes(s.key)
                    ? THEME.accent
                    : "rgba(247,242,232,0.35)",
                }}
              />
              {s.key}
            </SoftButton>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Время" subtitle="Уточняет подбор" defaultOpen={false}>
        <div className="flex flex-wrap gap-2">
          <SoftButton
            active={dayNight.includes("День")}
            onClick={() => toggleDayNight("День")}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{
                background: dayNight.includes("День")
                  ? THEME.accent
                  : "rgba(247,242,232,0.35)",
              }}
            />
            День
          </SoftButton>
          <SoftButton
            active={dayNight.includes("Ночь")}
            onClick={() => toggleDayNight("Ночь")}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{
                background: dayNight.includes("Ночь")
                  ? THEME.accent
                  : "rgba(247,242,232,0.35)",
              }}
            />
            Ночь
          </SoftButton>
        </div>
      </SectionCard>

      <NotePicker
        title="Хочу слышать"
        value={mustNotes}
        onChange={setMustNotes}
        placeholder="Например: ваниль, ирис, бергамот..."
        tone="include"
        allNotes={allNotes}
      />

      <NotePicker
        title="Не подходит"
        value={avoidNotes}
        onChange={setAvoidNotes}
        placeholder="Например: уд, табак, кожа..."
        tone="exclude"
        allNotes={allNotes}
      />

      <SectionCard
        title="Популярные ноты"
        subtitle="Нажмите, чтобы добавить в 'Хочу слышать'"
        defaultOpen={false}
      >
        <div className="space-y-3">
          {ALL_NOTES_GROUPS.map((g) => (
            <div key={g.label}>
              <div
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: THEME.muted2 }}
              >
                {g.label}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {g.notes.map((n) => {
                  const active = mustNotes.includes(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        if (active)
                          setMustNotes(mustNotes.filter((x) => x !== n));
                        else setMustNotes([...mustNotes, n]);
                      }}
                      className="rounded-full border px-3 py-1.5 text-sm transition hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-[rgba(127,122,73,0.40)]"
                      style={{
                        borderColor: active
                          ? "rgba(247,242,232,0.20)"
                          : THEME.border2,
                        color: THEME.text,
                        background: active
                          ? "rgba(127,122,73,0.14)"
                          : "transparent",
                      }}
                    >
                      {active ? (
                        <span className="mr-1 inline-flex align-middle">
                          <Check
                            className="h-4 w-4"
                            style={{ color: THEME.accent }}
                          />
                        </span>
                      ) : null}
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
