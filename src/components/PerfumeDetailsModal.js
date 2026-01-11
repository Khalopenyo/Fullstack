import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Heart, Star } from "lucide-react";

import { THEME } from "../data/theme";
import SafeImage from "./SafeImage";
import { VOLUME_OPTIONS } from "../data/perfumes";
import { priceForVolume } from "../lib/scoring";
import { useAuth } from "../state/auth";
import { isAdminUid } from "../services/adminRepo";
import { computeReviewSummary, deleteReview, listenReviews, upsertReview } from "../services/reviewsRepo";
import { db } from "../firebase/firebase";
import { doc, setDoc } from "firebase/firestore";

function Dots({ value }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const on = i + 1 <= value;
        return (
          <span
            key={i}
            className={"h-1.5 w-4 rounded-full " + (on ? "bg-white/85" : "bg-white/15")}
          />
        );
      })}
    </div>
  );
}

function VolumeSelect({ value, onChange, size }) {
  const isCompact = size === "compact";

  return (
    <div className={"flex items-center gap-2 " + (isCompact ? "" : "flex-wrap")}>
      <div className="text-xs" style={{ color: THEME.muted }}>
        Объём
      </div>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={
          "rounded-2xl border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[rgba(127,122,73,0.40)]"
        }
        style={{ borderColor: THEME.border2, color: THEME.text, background: "#0C0C10", colorScheme: "dark" }}
        aria-label="Выбор объёма"
      >
        {VOLUME_OPTIONS.map((v) => (
          <option key={v} value={v}>
            {v} мл
          </option>
        ))}
      </select>
    </div>
  );
}

function StarRating({ value, onChange, readOnly = false }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const on = i + 1 <= value;
        const El = readOnly ? "span" : "button";
        return (
          <El
            key={i}
            type={readOnly ? undefined : "button"}
            onClick={readOnly ? undefined : () => onChange(i + 1)}
            className={readOnly ? "" : "rounded-full p-1 hover:bg-white/10"}
            aria-label={readOnly ? undefined : `Оценка ${i + 1}`}
          >
            <Star
              className={"h-4 w-4 " + (on ? "fill-current" : "")}
              style={{ color: on ? THEME.accent : THEME.muted }}
            />
          </El>
        );
      })}
    </div>
  );
}

export default function PerfumeDetailsModal({
  open,
  perfume,
  volume,
  liked,
  onVolumeChange,
  onClose,
  onAddToCart,
  onToggleFavorite,
}) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [reviews, setReviews] = React.useState([]);
  const [reviewsLoading, setReviewsLoading] = React.useState(false);
  const [rating, setRating] = React.useState(0);
  const [text, setText] = React.useState("");
  const [editingId, setEditingId] = React.useState(null);
  const [savingReview, setSavingReview] = React.useState(false);
  const [reviewSummary, setReviewSummary] = React.useState({ avg: 0, count: 0 });
  const [reviewFormOpen, setReviewFormOpen] = React.useState(false);

  const title = perfume ? `${perfume.brand} — ${perfume.name}` : "";
  const price = perfume ? priceForVolume(perfume.price, volume, perfume.baseVolume) : 0;

  React.useEffect(() => {
    let alive = true;
    if (!open || !user?.uid) {
      setIsAdmin(false);
      return;
    }
    isAdminUid(user.uid)
      .then((v) => {
        if (alive) setIsAdmin(Boolean(v));
      })
      .catch(() => {
        if (alive) setIsAdmin(false);
      });
    return () => {
      alive = false;
    };
  }, [open, user?.uid]);

  React.useEffect(() => {
    if (!open || !perfume?.id) return;
    setReviewsLoading(true);
    const unsub = listenReviews(
      perfume.id,
      (list) => {
        setReviews(list || []);
        setReviewsLoading(false);
      },
      () => {
        setReviews([]);
        setReviewsLoading(false);
      }
    );
    return () => unsub();
  }, [open, perfume?.id]);

  React.useEffect(() => {
    if (!open) return;
    setRating(0);
    setText("");
    setEditingId(null);
    setReviewFormOpen(false);
  }, [open, perfume?.id]);

  const userReview = user?.uid ? reviews.find((r) => r.uid === user.uid) : null;

  React.useEffect(() => {
    if (!perfume?.id) return;
    if (!reviews || reviews.length === 0) {
      setReviewSummary({ avg: 0, count: 0 });
      return;
    }
    let sum = 0;
    let count = 0;
    for (const r of reviews) {
      const v = Number(r?.rating || 0);
      if (v > 0) {
        sum += v;
        count += 1;
      }
    }
    const avg = count ? Math.round((sum / count) * 10) / 10 : 0;
    setReviewSummary({ avg, count });
  }, [perfume?.id, reviews]);

  const startEdit = (review) => {
    setEditingId(review.id);
    setRating(Number(review.rating || 0));
    setText(String(review.text || ""));
    setReviewFormOpen(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setRating(0);
    setText("");
    setReviewFormOpen(false);
  };

  const saveReview = async () => {
    if (!user?.uid || !perfume?.id) return;
    const cleanText = String(text || "").trim();
    if (!rating || rating < 1) return alert("Поставь оценку от 1 до 5.");
    if (!cleanText) return alert("Напиши отзыв.");

    const targetId = editingId || user.uid;
    const existing = reviews.find((r) => r.id === targetId);

    const authorLabel = user.isAnonymous ? "Гость" : user.email || "Пользователь";
    const payload = {
      uid: user.uid,
      authorLabel,
      rating: Number(rating),
      text: cleanText,
      isAnonymous: Boolean(user.isAnonymous),
    };

    if (existing?.createdAt) {
      payload.createdAt = existing.createdAt;
    }

    if (isAdmin && existing && existing.uid && existing.uid !== user.uid) {
      payload.uid = existing.uid;
      payload.authorLabel = existing.authorLabel || "Пользователь";
      payload.isAnonymous = Boolean(existing.isAnonymous);
    }

    setSavingReview(true);
    try {
      await upsertReview(perfume.id, targetId, payload);
      const summary = await computeReviewSummary(perfume.id);
      setReviewSummary(summary);
      try {
        await setDoc(
          doc(db, "perfumes", perfume.id),
          { reviewAvg: summary.avg, reviewCount: summary.count },
          { merge: true }
        );
      } catch {
        // ignore if rules don't allow updating perfume summaries
      }
      cancelEdit();
    } finally {
      setSavingReview(false);
    }
  };

  const removeReview = async (review) => {
    if (!perfume?.id || !review?.id) return;
    if (!window.confirm("Удалить отзыв?")) return;
    setSavingReview(true);
    try {
      await deleteReview(perfume.id, review.id);
      const summary = await computeReviewSummary(perfume.id);
      setReviewSummary(summary);
      try {
        await setDoc(
          doc(db, "perfumes", perfume.id),
          { reviewAvg: summary.avg, reviewCount: summary.count },
          { merge: true }
        );
      } catch {
        // ignore if rules don't allow updating perfume summaries
      }
      if (editingId === review.id) cancelEdit();
    } finally {
      setSavingReview(false);
    }
  };

  return (
    <AnimatePresence>
      {open && perfume ? (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
          >
            <div
              className="perfumeDetailsModal__panel w-full max-w-2xl rounded-3xl border shadow-2xl overflow-x-hidden"
              style={{
                background: THEME.surface,
                borderColor: THEME.border,
                maxWidth: 880,
                maxHeight: "90vh",
                display: "flex",
                flexDirection: "column",
              }}
              role="dialog"
              aria-modal="true"
              aria-label={title}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between border-b p-4"
                style={{ borderColor: THEME.border2 }}
              >
                <div>
                  <div className="text-base font-semibold" style={{ color: THEME.text }}>
                    {title}
                  </div>
                  <div className="text-xs" style={{ color: THEME.muted }}>
                    Подробности аромата
                  </div>
                </div>

                <button
                  type="button"
                  className="rounded-full p-2 hover:bg-white/10"
                  onClick={onClose}
                  aria-label="Закрыть"
                >
                  <X className="h-5 w-5" style={{ color: THEME.muted }} />
                </button>
              </div>

              {/* Body */}
              <div className="perfumeDetailsModal__body space-y-4 p-4" style={{ color: THEME.text, overflowY: "auto", flex: 1 }}>
                <div
                  className="rounded-3xl border p-4"
                  style={{ borderColor: THEME.border2, background: THEME.surface2 }}
                >
                  <div className="perfumeDetailsModal__summary flex items-start justify-between gap-3">
                    <div className="flex items-start gap-4">
                      <div
                        className="shrink-0 overflow-hidden rounded-3xl border"
                        style={{
                          borderColor: THEME.border2,
                          background: "rgba(255,255,255,0.02)",
                          width: 128,
                          height: 128,
                          flexShrink: 0,
                        }}
                      >
                        <SafeImage
                          src={perfume.image}
                          alt={perfume.brand + " " + perfume.name}
                          loading="lazy"
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                      </div>

                      <div>
                        <div className="text-sm" style={{ color: THEME.muted }}>
                          {perfume.family}
                        </div>
                        <div className="mt-1 text-2xl font-semibold" style={{ color: THEME.text }}>
                          {perfume.name}
                        </div>
                        <div className="mt-2 text-sm" style={{ color: THEME.muted }}>
                          {perfume.description}
                        </div>

                        <div className="mt-4">
                          <VolumeSelect value={volume} onChange={onVolumeChange} size="regular" />
                        </div>
                      </div>
                    </div>

                    <div className="perfumeDetailsModal__price text-right">
                      <div className="text-xs" style={{ color: THEME.muted }}>
                        Цена
                      </div>
                      <div className="perfumeDetailsModal__priceValue mt-1 text-2xl font-semibold" style={{ color: THEME.text }}>
                        {price} {perfume.currency}
                      </div>
                      <div className="mt-1 text-xs" style={{ color: THEME.muted2 }}>
                        за {volume} мл
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {perfume.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border px-3 py-1 text-xs"
                        style={{
                          borderColor: THEME.border2,
                          color: THEME.text,
                          background: "rgba(255,255,255,0.02)",
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div
                      className="rounded-2xl border px-3 py-2"
                      style={{
                        borderColor: THEME.border2,
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      <div className="text-xs" style={{ color: THEME.muted }}>
                        Сезоны
                      </div>
                      <div className="mt-1 text-sm" style={{ color: THEME.text }}>
                        {perfume.seasons.join(", ")}
                      </div>
                    </div>

                    <div
                      className="rounded-2xl border px-3 py-2"
                      style={{
                        borderColor: THEME.border2,
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      <div className="text-xs" style={{ color: THEME.muted }}>
                        Подходит
                      </div>
                      <div className="mt-1 text-sm" style={{ color: THEME.text }}>
                        {perfume.dayNight.join(", ")}
                      </div>
                    </div>

                    <div
                      className="rounded-2xl border px-3 py-2"
                      style={{
                        borderColor: THEME.border2,
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      <div className="text-xs" style={{ color: THEME.muted }}>
                        Профиль
                      </div>

                      <div className="mt-1 flex items-center justify-between gap-3">
                        <span className="text-sm" style={{ color: THEME.text }}>
                          Стойкость
                        </span>
                        <Dots value={perfume.longevity} />
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-sm" style={{ color: THEME.text }}>
                          Шлейф
                        </span>
                        <Dots value={perfume.sillage} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div
                    className="rounded-3xl border p-4"
                    style={{ borderColor: THEME.border2, background: THEME.surface2 }}
                  >
                    <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: THEME.muted2 }}>
                      Верх
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {perfume.notes.top.map((n) => (
                        <span
                          key={n}
                          className="rounded-full border px-3 py-1 text-xs"
                          style={{ borderColor: THEME.border2, color: THEME.text, background: "#0C0C10", colorScheme: "dark" }}
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div
                    className="rounded-3xl border p-4"
                    style={{ borderColor: THEME.border2, background: THEME.surface2 }}
                  >
                    <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: THEME.muted2 }}>
                      Сердце
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {perfume.notes.heart.map((n) => (
                        <span
                          key={n}
                          className="rounded-full border px-3 py-1 text-xs"
                          style={{ borderColor: THEME.border2, color: THEME.text, background: "#0C0C10", colorScheme: "dark" }}
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div
                    className="rounded-3xl border p-4"
                    style={{ borderColor: THEME.border2, background: THEME.surface2 }}
                  >
                    <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: THEME.muted2 }}>
                      База
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {perfume.notes.base.map((n) => (
                        <span
                          key={n}
                          className="rounded-full border px-3 py-1 text-xs"
                          style={{ borderColor: THEME.border2, color: THEME.text, background: "#0C0C10", colorScheme: "dark" }}
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border p-4" style={{ borderColor: THEME.border2, background: THEME.surface2 }}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-semibold">Отзывы</div>
                    {reviewSummary.count ? (
                      <div className="text-xs" style={{ color: THEME.muted }}>
                        Средняя: <span style={{ color: THEME.text }}>{reviewSummary.avg.toFixed(1)}</span>{" "}
                        · {reviewSummary.count}
                      </div>
                    ) : null}
                    {reviewsLoading ? <div className="text-xs" style={{ color: THEME.muted }}>Загрузка...</div> : null}
                  </div>

                  <div className="mt-3 space-y-3">
                    {reviews.length === 0 && !reviewsLoading ? (
                      <div className="text-xs" style={{ color: THEME.muted }}>Пока нет отзывов.</div>
                    ) : null}

                    {reviews.map((r) => {
                      const canEdit = isAdmin || (user?.uid && r.uid === user.uid);
                      return (
                        <div
                          key={r.id}
                          className="rounded-2xl border px-3 py-2"
                          style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.02)" }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="text-xs" style={{ color: THEME.muted }}>
                              {r.authorLabel || "Пользователь"}
                            </div>
                            <StarRating value={Number(r.rating || 0)} readOnly />
                          </div>
                          <div className="mt-2 text-sm" style={{ color: THEME.text }}>
                            {r.text}
                          </div>
                          {canEdit ? (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                className="rounded-full border px-3 py-1 text-[11px] hover:bg-white/[0.06]"
                                style={{ borderColor: THEME.border2, color: THEME.text }}
                                onClick={() => startEdit(r)}
                              >
                                Редактировать
                              </button>
                              <button
                                type="button"
                                className="rounded-full border px-3 py-1 text-[11px] hover:bg-white/[0.06]"
                                style={{ borderColor: "rgba(255,120,120,0.45)", color: THEME.text }}
                                onClick={() => removeReview(r)}
                              >
                                Удалить
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 border-t pt-4" style={{ borderColor: THEME.border2 }}>
                    {!editingId ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="rounded-full border px-4 py-2 text-sm hover:bg-white/[0.06]"
                          style={{ borderColor: THEME.border2, color: THEME.text }}
                          onClick={() => setReviewFormOpen((v) => !v)}
                        >
                          {reviewFormOpen ? "Скрыть форму" : "Оставить отзыв"}
                        </button>
                        {userReview ? (
                          <button
                            type="button"
                            className="rounded-full border px-4 py-2 text-sm hover:bg-white/[0.06]"
                            style={{ borderColor: THEME.border2, color: THEME.text }}
                            onClick={() => startEdit(userReview)}
                            disabled={savingReview}
                          >
                            Редактировать мой отзыв
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <div className="text-xs" style={{ color: THEME.muted }}>
                        Редактирование отзыва
                      </div>
                    )}

                    {reviewFormOpen || editingId ? (
                      <>
                        <div className="mt-2">
                          <StarRating value={rating} onChange={setRating} />
                        </div>
                        <textarea
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          placeholder="Поделитесь впечатлением..."
                          className="mt-3 w-full rounded-2xl border px-4 py-3 text-sm outline-none min-h-[90px]"
                          style={{
                            borderColor: THEME.border2,
                            background: "rgba(255,255,255,0.03)",
                            color: THEME.text,
                          }}
                        />
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="rounded-full px-4 py-2 text-sm font-semibold"
                            style={{ background: THEME.accent, color: "#0B0B0F" }}
                            onClick={saveReview}
                            disabled={savingReview}
                          >
                            {savingReview ? "Сохранение..." : "Сохранить отзыв"}
                          </button>
                          {editingId ? (
                            <button
                              type="button"
                              className="rounded-full border px-4 py-2 text-sm hover:bg-white/[0.06]"
                              style={{ borderColor: THEME.border2, color: THEME.text }}
                              onClick={cancelEdit}
                              disabled={savingReview}
                            >
                              Отмена
                            </button>
                          ) : null}
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    className="flex-1 rounded-full px-5 py-3 text-sm font-semibold"
                    style={{ background: THEME.accent, color: "#0B0B0F" }}
                    onClick={onAddToCart}
                  >
                    Добавить в корзину ({volume} мл)
                  </button>

                  <button
                    type="button"
                    className="flex-1 rounded-full border px-5 py-3 text-sm transition hover:bg-white/[0.06]"
                    style={{
                      borderColor: THEME.border2,
                      color: THEME.text,
                      background: liked ? "rgba(127,122,73,0.14)" : "transparent",
                    }}
                    onClick={onToggleFavorite}
                  >
                    <Heart className="mr-2 inline-block h-4 w-4" style={{ color: liked ? THEME.accent : THEME.muted }} />
                    {liked ? "В избранном" : "В избранное"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
