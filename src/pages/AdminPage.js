// src/pages/AdminPage.js
import React from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { THEME } from "../data/theme";
import { useAuth } from "../state/auth";
import { fetchCatalogWithDiagnostics, upsertPerfume, deletePerfume } from "../services/perfumesRepo";
import { uploadPerfumeImage } from "../services/storageRepo";
import { listOrders, updateOrder, deleteOrder, listUsers } from "../services/adminApi";

const SEASONS = ["Зима", "Весна", "Лето", "Осень"];
const DAYNIGHT = ["Утро", "День", "Вечер", "Ночь"];

function splitList(s) {
  return String(s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}
function joinList(arr) {
  return Array.isArray(arr) ? arr.join(", ") : "";
}
function toggleInArray(arr, v) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}
function clampInt(v, min, max, fallback) {
  const n = Number(v);
  const x = Number.isFinite(n) ? Math.round(n) : fallback;
  return Math.max(min, Math.min(max, x));
}
function nextId(perfumes, prefix = "p") {
  let max = 0;
  for (const p of perfumes || []) {
    const re = new RegExp(`^${prefix}-(\\d{1,4})$`, "i");
    const m = String(p.id || "").match(re);
    if (m) max = Math.max(max, Number(m[1]));
  }
  const n = max + 1;
  const pad = n < 10 ? `0${n}` : String(n);
  return `${prefix}-${pad}`;
}

function Input({ ...props }) {
  return (
    <input
      {...props}
      className={
        "w-full rounded-2xl border px-4 py-3 text-sm outline-none " +
        (props.className || "")
      }
      style={{
        borderColor: THEME.border2,
        background: "rgba(255,255,255,0.03)",
        color: THEME.text,
        ...(props.style || {}),
      }}
    />
  );
}

function TextArea({ ...props }) {
  return (
    <textarea
      {...props}
      className={
        "w-full rounded-2xl border px-4 py-3 text-sm outline-none min-h-[100px] " +
        (props.className || "")
      }
      style={{
        borderColor: THEME.border2,
        background: "rgba(255,255,255,0.03)",
        color: THEME.text,
        ...(props.style || {}),
      }}
    />
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border px-3 py-1.5 text-[12px] hover:bg-white/[0.06]"
      style={{
        borderColor: THEME.border2,
        background: active ? "rgba(255,255,255,0.06)" : "transparent",
        color: THEME.text,
      }}
    >
      {children}
    </button>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs" style={{ color: THEME.muted }}>
        {label}
        {hint ? <span className="ml-2 opacity-70">· {hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

function EditorModal({ open, title, onClose, children, footer }) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/70" onClick={onClose} />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                className="w-full max-w-5xl rounded-3xl border overflow-hidden"
                style={{
                  borderColor: THEME.border2,
                  background: THEME.surface,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="px-5 py-4 border-b flex items-start justify-between gap-3"
                  style={{
                    borderColor: THEME.border2,
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{title}</div>
                    <div className="mt-1 text-xs" style={{ color: THEME.muted }}>
                      Добавление/редактирование открывается в модалке — как ты и хотел.
                    </div>
                  </div>

                  <button
                    type="button"
                    className="rounded-full border p-2 hover:bg-white/[0.06]"
                    style={{ borderColor: THEME.border2, color: THEME.text }}
                    onClick={onClose}
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="px-5 py-4" style={{ maxHeight: "72vh", overflow: "auto" }}>
                  {children}
                </div>

                <div
                  className="px-5 py-4 border-t"
                  style={{
                    borderColor: THEME.border2,
                    background:
                      "linear-gradient(to top, rgba(12,12,16,0.98), rgba(12,12,16,0.78))",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  {footer}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

export default function AdminPage() {
  const nav = useNavigate();
  const { user, authReady, openAuthModal } = useAuth();

  const uid = user?.uid || "";
  const sessionLabel = !user ? "—" : user.isAnonymous ? "Гость" : user.email || "Аккаунт";

  const checkingAdmin = !authReady;
  const isAdmin = Boolean(user?.isAdmin);

  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState([]);
  const [diag, setDiag] = React.useState(null);
  const [q, setQ] = React.useState("");
  const [visibleCount, setVisibleCount] = React.useState(10);
  const [catalogMode, setCatalogMode] = React.useState("retail");
  const [adminTab, setAdminTab] = React.useState("catalog");
  const [orders, setOrders] = React.useState([]);
  const [ordersLoading, setOrdersLoading] = React.useState(false);
  const [ordersChannel, setOrdersChannel] = React.useState("all");
  const [users, setUsers] = React.useState([]);
  const [usersLoading, setUsersLoading] = React.useState(false);

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const [draft, setDraft] = React.useState(() => ({
    id: "",
    brand: "",
    name: "",
    searchNameRu: "",
    description: "",
    inStock: true,
    isHit: false,
    basePrice: 0,
    baseVolume: 50,
    seasons: [],
    dayNight: [],
    tagsText: "",
    notesTopText: "",
    notesHeartText: "",
    notesBaseText: "",
    sillage: 3,
    longevity: 3,
    image: "",
    currency: "₽",
  }));

  const filtered = React.useMemo(() => {
    const query = (q || "").trim().toLowerCase();
    if (!query) return items;
    return items.filter((p) => {
      const hay = [
        p.id,
        p.brand,
        p.name,
        p.description,
        ...(p.tags || []),
        ...(p.notes?.top || []),
        ...(p.notes?.heart || []),
        ...(p.notes?.base || []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [items, q]);

  const catalogLabel = catalogMode === "wholesale" ? "Оптовый каталог" : "Каталог";
  const collectionName = catalogMode === "wholesale" ? "wholesale_perfumes" : "perfumes";
  const idPrefix = catalogMode === "wholesale" ? "w" : "p";

  React.useEffect(() => {
    setVisibleCount(10);
  }, [q, items]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { perfumes, issues, summary } = await fetchCatalogWithDiagnostics(collectionName);
      setItems(perfumes || []);
      setDiag({ issues: issues || [], summary: summary || null });
    } catch (e) {
      console.error(e);
      setItems([]);
      setDiag(null);
    } finally {
      setLoading(false);
    }
  }, [collectionName]);

  React.useEffect(() => {
    if (!authReady) return;
  }, [authReady]);

  React.useEffect(() => {
    if (!authReady) return;
    load();
  }, [authReady, load, catalogMode]);

  const loadOrders = React.useCallback(async () => {
    setOrdersLoading(true);
    try {
      const list = await listOrders();
      setOrders(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const setOrderFulfilled = React.useCallback(async (orderId, fulfilled) => {
    if (!orderId) return;
    try {
      await updateOrder(orderId, fulfilled);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, fulfilled: Boolean(fulfilled) } : o)));
    } catch (e) {
      console.error(e);
      alert("Не удалось обновить статус заказа.");
    }
  }, []);

  const removeOrder = React.useCallback(async (orderId) => {
    if (!orderId) return;
    if (!window.confirm("Удалить заказ?")) return;
    try {
      await deleteOrder(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (e) {
      console.error(e);
      alert("Не удалось удалить заказ.");
    }
  }, []);

  React.useEffect(() => {
    if (!authReady) return;
    if (!isAdmin) return;
    if (adminTab !== "orders") return;
    loadOrders();
  }, [authReady, isAdmin, adminTab, loadOrders]);

  const loadUsers = React.useCallback(async () => {
    setUsersLoading(true);
    try {
      const list = await listUsers();
      setUsers(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error(e);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!authReady) return;
    if (!isAdmin) return;
    if (adminTab !== "users") return;
    loadUsers();
  }, [authReady, isAdmin, adminTab, loadUsers]);

  const filteredOrders = React.useMemo(() => {
    if (ordersChannel === "all") return orders;
    return orders.filter((o) => String(o.channel || "").toLowerCase() === ordersChannel);
  }, [orders, ordersChannel]);

  const filteredUsers = React.useMemo(() => {
    const queryText = (q || "").trim().toLowerCase();
    if (!queryText) return users;
    return users.filter((u) => {
      const hay = [u.id, u.email, u.displayName].join(" ").toLowerCase();
      return hay.includes(queryText);
    });
  }, [users, q]);

  function openNew() {
    const id = nextId(items, idPrefix);
    setDraft({
      id,
      brand: "",
      name: "",
      searchNameRu: "",
      description: "",
      inStock: true,
      isHit: false,
      basePrice: 0,
      baseVolume: 50,
      seasons: [],
      dayNight: [],
      tagsText: "",
      notesTopText: "",
      notesHeartText: "",
      notesBaseText: "",
      sillage: 3,
      longevity: 3,
      image: "",
      currency: "₽",
    });
    setEditorOpen(true);
  }

  function openEdit(p) {
    setDraft({
      id: p.id || "",
      brand: p.brand || "",
      name: p.name || "",
      searchNameRu: p.searchNameRu || "",
      description: p.description || "",
      inStock: typeof p.inStock === "boolean" ? p.inStock : true,
      isHit: typeof p.isHit === "boolean" ? p.isHit : false,
      basePrice: Number(p.basePrice ?? p.price ?? 0),
      baseVolume: Number(p.baseVolume ?? p.volume ?? 50),
      seasons: Array.isArray(p.seasons) ? p.seasons : [],
      dayNight: Array.isArray(p.dayNight) ? p.dayNight : [],
      tagsText: joinList(p.tags),
      notesTopText: joinList(p.notes?.top),
      notesHeartText: joinList(p.notes?.heart),
      notesBaseText: joinList(p.notes?.base),
      sillage: Number(p.sillage || 3),
      longevity: Number(p.longevity || 3),
      image: p.image || "",
      currency: p.currency || "₽",
    });
    setEditorOpen(true);
  }

  async function save() {
    const id = String(draft.id || "").trim();
    if (!id) return alert("Укажи ID (например p-01).");
    if (!draft.brand.trim()) return alert("Заполни бренд.");
    if (!draft.name.trim()) return alert("Заполни название.");

    const payload = {
      brand: draft.brand.trim(),
      name: draft.name.trim(),
      searchNameRu: String(draft.searchNameRu || "").trim(),
      description: String(draft.description || "").trim(),
      inStock: Boolean(draft.inStock),
      isHit: Boolean(draft.isHit),

      basePrice: Number(draft.basePrice || 0),
      baseVolume: clampInt(draft.baseVolume, 10, 200, 50),

      seasons: (draft.seasons || []).filter((x) => SEASONS.includes(x)),
      dayNight: (draft.dayNight || []).filter((x) => DAYNIGHT.includes(x)),

      tags: splitList(draft.tagsText).slice(0, 40),

      notes: {
        top: splitList(draft.notesTopText).slice(0, 60),
        heart: splitList(draft.notesHeartText).slice(0, 60),
        base: splitList(draft.notesBaseText).slice(0, 60),
      },

      sillage: clampInt(draft.sillage, 1, 5, 3),
      longevity: clampInt(draft.longevity, 1, 5, 3),

      image: String(draft.image || "").trim(),
      currency: String(draft.currency || "₽").trim() || "₽",

    };

    setSaving(true);
    try {
      await upsertPerfume(id, payload, catalogMode === "wholesale" ? "wholesale" : "retail");
      await load();
      setEditorOpen(false);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Не получилось сохранить.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const id = String(draft.id || "").trim();
    if (!id) return;
    if (!window.confirm(`Удалить товар ${id}?`)) return;

    setSaving(true);
    try {
      await deletePerfume(id);
      await load();
      setEditorOpen(false);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Не получилось удалить.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(file) {
    const id = String(draft.id || "").trim();
    if (!id) return alert("Сначала укажи ID товара (например p-01).");
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadPerfumeImage(id, file);
      if (result?.url) setDraft((p) => ({ ...p, image: result.url }));
    } catch (e) {
      console.error(e);
      alert(
        "Не удалось загрузить изображение.\n\n" +
          (e?.message || "")
      );
    } finally {
      setUploading(false);
    }
  }

  function copyUid() {
    if (!uid) return;
    navigator.clipboard?.writeText(uid).then(
      () => alert("UID скопирован"),
      () => alert("Не удалось скопировать UID")
    );
  }

  if (!authReady) {
    return (
      <div className="min-h-screen p-6" style={{ background: THEME.bg, color: THEME.text }}>
        Загрузка...
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: THEME.bg, color: THEME.text }}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 border-b"
        style={{
          borderColor: THEME.border2,
          background: "rgba(12,12,16,0.78)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">Админка товаров · {catalogLabel}</div>
            {/* <div className="text-xs mt-0.5" style={{ color: THEME.muted }}>
              Сессия: <span style={{ color: THEME.text }}>{sessionLabel}</span>
              {uid ? (
                <>
                  {" "}· UID: <span className="select-all" style={{ color: THEME.text }}>{uid}</span>
                  <button
                    className="ml-2 rounded-full border px-3 py-1 text-[11px] hover:bg-white/[0.06]"
                    style={{ borderColor: THEME.border2, color: THEME.text }}
                    onClick={copyUid}
                    type="button"
                  >
                    Копировать UID
                  </button>
                </>
              ) : null}
            </div> */}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              className="rounded-full border px-4 py-2 text-sm hover:bg-white/[0.06]"
              style={{ borderColor: THEME.border2, color: THEME.text }}
              onClick={() => nav("/")}
            >
              В каталог
            </button>
            <button
              type="button"
              className="rounded-full border px-4 py-2 text-sm hover:bg-white/[0.06]"
              style={{ borderColor: THEME.border2, color: THEME.text }}
              onClick={openAuthModal}
            >
              Аккаунт
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-5">
        {checkingAdmin ? (
          <div
            className="rounded-3xl border p-4"
            style={{
              borderColor: THEME.border2,
              background: "rgba(255,255,255,0.02)",
            }}
          >
            Проверяем доступ...
          </div>
        ) : !isAdmin ? (
          <div
            className="rounded-3xl border p-5"
            style={{
              borderColor: "rgba(255,120,120,0.35)",
              background: "rgba(255,120,120,0.06)",
            }}
          >
            <div className="text-sm font-semibold">Нет доступа</div>
            <div className="mt-2 text-sm" style={{ color: THEME.muted }}>
              1) нажми «Аккаунт» и зайди (не гость),
              <br />
              2) запомни email,
              <br />
              3) в базе выставь <b>users.is_admin=true</b> для этого email.
            </div>
          </div>
        ) : (
          <>
            {/* toolbar */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mt-5">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-full border px-4 py-2 text-sm hover:bg-white/[0.06]"
                    style={{
                      borderColor: THEME.border2,
                      color: THEME.text,
                      background: adminTab === "catalog" && catalogMode === "retail" ? "rgba(255,255,255,0.06)" : "transparent",
                    }}
                    onClick={() => {
                      setAdminTab("catalog");
                      setCatalogMode("retail");
                    }}
                  >
                    Розница
                  </button>
                  <button
                    type="button"
                    className="rounded-full border px-4 py-2 text-sm hover:bg-white/[0.06]"
                    style={{
                      borderColor: THEME.border2,
                      color: THEME.text,
                      background: adminTab === "catalog" && catalogMode === "wholesale" ? "rgba(255,255,255,0.06)" : "transparent",
                    }}
                    onClick={() => {
                      setAdminTab("catalog");
                      setCatalogMode("wholesale");
                    }}
                  >
                    Опт
                  </button>
                  <button
                    type="button"
                    className="rounded-full border px-4 py-2 text-sm hover:bg-white/[0.06]"
                    style={{
                      borderColor: THEME.border2,
                      color: THEME.text,
                      background: adminTab === "orders" ? "rgba(255,255,255,0.06)" : "transparent",
                    }}
                    onClick={() => setAdminTab("orders")}
                  >
                    Заказы
                  </button>
                  <button
                    type="button"
                    className="rounded-full border px-4 py-2 text-sm hover:bg-white/[0.06]"
                    style={{
                      borderColor: THEME.border2,
                      color: THEME.text,
                      background: adminTab === "users" ? "rgba(255,255,255,0.06)" : "transparent",
                    }}
                    onClick={() => setAdminTab("users")}
                  >
                    Пользователи
                  </button>
                </div>
                <input
                  disabled={adminTab === "orders"}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={adminTab === "users" ? "Поиск по имени / email / UID..." : "Поиск по названию / нотам / тегам..."}
                  className="w-full lg:w-[420px] rounded-full border px-4 py-2 text-sm outline-none"
                  style={{
                    borderColor: THEME.border2,
                    background: "rgba(255,255,255,0.03)",
                    color: THEME.text,
                  }}
                />
                <button
                  type="button"
                  className="rounded-full border px-4 py-2 text-sm hover:bg-white/[0.06]"
                  style={{ borderColor: THEME.border2, color: THEME.text }}
                  onClick={adminTab === "orders" ? loadOrders : adminTab === "users" ? loadUsers : load}
                  disabled={adminTab === "orders" ? ordersLoading : adminTab === "users" ? usersLoading : loading}
                >
                  {adminTab === "orders"
                    ? (ordersLoading ? "..." : "Обновить")
                    : adminTab === "users"
                    ? (usersLoading ? "..." : "Обновить")
                    : loading
                    ? "..."
                    : "Обновить"}
                </button>
                {adminTab === "orders" ? (
                  <select
                    value={ordersChannel}
                    onChange={(e) => setOrdersChannel(e.target.value)}
                    className="rounded-full border px-4 py-2 text-sm outline-none"
                    style={{
                      borderColor: THEME.border2,
                      background: "rgba(255,255,255,0.03)",
                      color: THEME.text,
                    }}
                  >
                    <option value="all">Все каналы</option>
                    <option value="wa">WhatsApp</option>
                    <option value="tg">Telegram</option>
                    <option value="ig">Instagram</option>
                  </select>
                ) : null}

                {diag?.summary?.warnings ? (
                  <span
                    className="hidden lg:inline-flex rounded-full border px-3 py-1 text-[12px]"
                    style={{
                      borderColor: "rgba(255,200,120,0.35)",
                      background: "rgba(255,200,120,0.06)",
                      color: THEME.text,
                    }}
                    title="В данных есть предупреждения"
                  >
                    ⚠️ warnings: {diag.summary.warnings}
                  </span>
                ) : null}
              </div>

              {adminTab === "catalog" ? (
                <button
                  type="button"
                  className="rounded-full px-5 py-3 text-sm font-semibold"
                  style={{ background: THEME.accent, color: "#0B0B0F" }}
                  onClick={openNew}
                >
                  + Новый товар
                </button>
              ) : null}
            </div>

            {/* list */}
            <div className="mt-4">
              {adminTab === "orders" ? (
                ordersLoading ? (
                  <div className="text-sm opacity-70">Загрузка...</div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-sm opacity-70">Нет заказов</div>
                ) : (
                  <div className="grid gap-3">
                    {filteredOrders.map((o) => (
                      <div
                        key={o.id}
                        className="rounded-3xl border p-4"
                        style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.02)" }}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm font-semibold">
                            Заказ {o.id}
                          </div>
                          <div className="text-xs" style={{ color: THEME.muted }}>
                            {o.channel ? `Канал: ${o.channel}` : "Канал: —"}
                          </div>
                        </div>
                        <div className="mt-1 text-xs" style={{ color: THEME.muted }}>
                          {o.displayName || "Без имени"}
                          {o.email ? ` · ${o.email}` : ""}
                          {o.isAnonymous ? " · гость" : ""}
                        </div>
                        <div className="mt-3 text-sm">
                          {(o.items || []).map((it, idx) => (
                            <div key={idx} className="flex flex-wrap gap-2">
                              <span>
                                {it.id} · {it.volume} мл · {it.mix || "60/40"} ×{it.qty}
                              </span>
                              <span style={{ color: THEME.muted }}>
                                — {it.price}{o.currency || "₽"}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 text-sm font-semibold">
                          Итого: {o.total}{o.currency || "₽"}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <label className="inline-flex items-center gap-2 text-xs" style={{ color: THEME.muted }}>
                            <input
                              type="checkbox"
                              checked={Boolean(o.fulfilled)}
                              onChange={(e) => setOrderFulfilled(o.id, e.target.checked)}
                            />
                            Выкуплен
                          </label>
                          <button
                            type="button"
                            className="rounded-full border px-3 py-1.5 text-xs hover:bg-white/[0.06]"
                            style={{ borderColor: "rgba(255,120,120,0.45)", color: THEME.text }}
                            onClick={() => removeOrder(o.id)}
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : adminTab === "users" ? (
                usersLoading ? (
                  <div className="text-sm opacity-70">Загрузка...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-sm opacity-70">Нет пользователей</div>
                ) : (
                  <div className="grid gap-3">
                    {filteredUsers.map((u) => (
                      <div
                        key={u.id}
                        className="rounded-3xl border p-4"
                        style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.02)" }}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm font-semibold">
                            {u.displayName || "Без имени"}
                          </div>
                          <div className="text-xs" style={{ color: THEME.muted }}>
                            {u.email || "—"}
                          </div>
                        </div>
                        <div className="mt-2 text-xs" style={{ color: THEME.muted }}>
                          UID: <span style={{ color: THEME.text }}>{u.id}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : loading ? (
                <div className="text-sm opacity-70">Загрузка...</div>
              ) : filtered.length === 0 ? (
                <div className="text-sm opacity-70">Нет товаров</div>
              ) : (
                <>
                  {/* ✅ МОБИЛЬНЫЕ КАРТОЧКИ (не влияют на sm+) */}
                  <div className="adminListMobile grid gap-3">
                    {filtered.slice(0, visibleCount).map((p) => (
                      <div
                        key={p.id}
                        className="rounded-2xl border p-5 w-full max-w-full overflow-hidden"
                        style={{
                          borderColor: THEME.border2,
                          background: "rgba(255,255,255,0.02)",
                        }}
                      >
                        {/* верх: картинка + инфо */}
                        <div className="flex gap-3">
                          <div
                            className="rounded-xl border overflow-hidden flex-shrink-0"
                            style={{
                              borderColor: THEME.border2,
                              background: "rgba(255,255,255,0.04)",
                              width: 88,
                              height: 88,
                            }}
                          >
                            {p.image ? (
                              <img
                                src={p.image}
                                alt=""
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  display: "block",
                                }}
                              />
                            ) : (
                              <div
                                className="h-full w-full flex items-center justify-center text-xs"
                                style={{ color: THEME.muted }}
                              >
                                No image
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold truncate">
                              {p.brand} — {p.name}
                            </div>

                            <div className="mt-1 text-xs leading-snug" style={{ color: THEME.muted }}>
                              <span className="flex flex-col ">
                                <span className="truncate">
                                  ID: <span style={{ color: THEME.text }}>{p.id}</span>
                                </span>
                                <span>
                                  Цена:{" "}
                                  <span style={{ color: THEME.text }}>
                                    {p.price ?? p.basePrice ?? 0}
                                    {p.currency || "₽"}
                                  </span>
                                </span>
                                <span>
                                  Объём: <span style={{ color: THEME.text }}>{p.volume ?? p.baseVolume ?? 0}</span>
                                  ml
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* описание */}
                        {p.description ? (
                          <div
                            className="mt-3 text-xs leading-relaxed"
                            style={{
                              color: THEME.muted,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {p.description}
                          </div>
                        ) : null}

                        {/* кнопка */}
                        <button
                          type="button"
                          className="mt-3 w-full rounded-full border px-4 py-2 text-xs font-medium hover:bg-white/[0.06] transition-colors"
                          style={{
                            borderColor: THEME.border2,
                            color: THEME.text,
                            background: "rgba(255,255,255,0.03)",
                          }}
                          onClick={() => openEdit(p)}
                        >
                          Редактировать
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* ✅ ТВОЯ ТЕКУЩАЯ СЕТКА ДЛЯ sm+ (вообще не меняем дизайн) */}
                  <div className="adminListDesktop grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
                    {filtered.slice(0, visibleCount).map((p) => (
                      <div
                        key={p.id}
                        className="rounded-2xl border p-4"
                        style={{
                          borderColor: THEME.border2,
                          background: "rgba(255,255,255,0.02)",
                        }}
                      >
                        {/* Основной контент карточки */}
                        <div className="flex flex-col gap-3">
                          {/* Первая строка: Изображение + Основная информация + Кнопка */}
                          <div className="flex flex-col sm:flex-row gap-3">
                            {/* Изображение - FIXED SIZE */}
                            <div
                              className="rounded-xl border overflow-hidden flex-shrink-0"
                              style={{
                                borderColor: THEME.border2,
                                background: "rgba(255,255,255,0.04)",
                                width: "80px",
                                height: "80px",
                              }}
                            >
                              {p.image ? (
                                <img
                                  src={p.image}
                                  alt=""
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block",
                                  }}
                                />
                              ) : (
                                <div
                                  className="h-full w-full flex items-center justify-center text-xs"
                                  style={{ color: THEME.muted }}
                                >
                                  No image
                                </div>
                              )}
                            </div>

                            {/* Основной контент и кнопка */}
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-semibold truncate">
                                    {p.brand} — {p.name}
                                  </div>
                                  <div className="mt-1 text-xs" style={{ color: THEME.muted }}>
                                    ID: <span style={{ color: THEME.text }}>{p.id}</span> ·{" "}
                                    <span style={{ color: THEME.text }}>
                                      {p.price ?? p.basePrice ?? 0}
                                      {p.currency || "₽"}
                                    </span>{" "}
                                    · {p.volume ?? p.baseVolume ?? 0}ml
                                  </div>
                                </div>

                                {/* Кнопка редактировать - всегда в приоритетном месте */}
                                <button
                                  type="button"
                                  className="flex-shrink-0 rounded-full border px-4 py-2 text-xs font-medium hover:bg-white/[0.06] transition-colors"
                                  style={{
                                    borderColor: THEME.border2,
                                    color: THEME.text,
                                    background: "rgba(255,255,255,0.03)",
                                  }}
                                  onClick={() => openEdit(p)}
                                >
                                  Редактировать
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Описание - под всем остальным контентом */}
                          {p.description && (
                            <div
                              className="text-xs leading-relaxed"
                              style={{
                                color: THEME.muted,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                            >
                              {p.description}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {adminTab === "catalog" && filtered.length > visibleCount ? (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  className="rounded-full border px-5 py-2.5 text-sm hover:bg-white/[0.06]"
                  style={{ borderColor: THEME.border2, color: THEME.text }}
                  onClick={() => setVisibleCount((v) => v + 10)}
                >
                  Показать ещё
                </button>
              </div>
            ) : null}

            {/* modal editor */}
            <EditorModal
              open={editorOpen}
              title={draft?.id ? `${catalogLabel}: ${draft.id}` : `Новый товар · ${catalogLabel}`}
              onClose={() => setEditorOpen(false)}
              footer={
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs" style={{ color: THEME.muted }}>
                    {saving ? "Сохранение..." : ""}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-full border px-4 py-2 text-sm hover:bg-white/[0.06]"
                      style={{ borderColor: THEME.border2, color: THEME.text }}
                      onClick={() => setEditorOpen(false)}
                      disabled={saving || uploading}
                    >
                      Отмена
                    </button>

                    <button
                      type="button"
                      className="rounded-full border px-4 py-2 text-sm"
                      style={{
                        borderColor: "rgba(255,120,120,0.45)",
                        color: THEME.text,
                      }}
                      onClick={remove}
                      disabled={saving || uploading || !String(draft.id || "").trim()}
                      title="Удаляет документ"
                    >
                      Удалить
                    </button>

                    <button
                      type="button"
                      className="rounded-full px-5 py-2.5 text-sm font-semibold"
                      style={{ background: THEME.accent, color: "#0B0B0F" }}
                      onClick={save}
                      disabled={saving || uploading}
                    >
                      Сохранить
                    </button>
                  </div>
                </div>
              }
            >
              <div className="grid gap-4 lg:grid-cols-3">
                {/* left preview */}
                <div className="lg:col-span-1">
                  <div
                    className="rounded-3xl border p-3"
                    style={{
                      borderColor: THEME.border2,
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <div className="text-xs font-semibold">Превью</div>
                    <div
                      className="mt-3 rounded-2xl border overflow-hidden"
                      style={{
                        borderColor: THEME.border2,
                        background: "rgba(255,255,255,0.04)",
                        width: "100%",
                        aspectRatio: "1 / 1",
                      }}
                    >
                      {draft.image ? (
                        <img
                          src={draft.image}
                          alt=""
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div
                          className="h-full w-full flex items-center justify-center text-xs"
                          style={{ color: THEME.muted }}
                        >
                          Нет картинки
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploading || saving}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadImage(f);
                          e.target.value = "";
                        }}
                      />
                    </div>

                    <div className="mt-2 text-xs break-all" style={{ color: THEME.muted }}>
                      {uploading ? "Загрузка..." : draft.image || "URL появится после загрузки или вставь вручную"}
                    </div>
                  </div>
                </div>

                {/* right form */}
                <div className="lg:col-span-2">
                  <div className="grid gap-3 lg:grid-cols-2">
                    <Field label="ID" hint="например p-01 (лучше так)">
                      <Input
                        value={draft.id}
                        onChange={(e) => setDraft((p) => ({ ...p, id: e.target.value }))}
                      />
                    </Field>

                    <Field label="Валюта" hint="по умолчанию ₽">
                      <Input
                        value={draft.currency}
                        onChange={(e) => setDraft((p) => ({ ...p, currency: e.target.value }))}
                      />
                    </Field>

                    <Field label="Бренд">
                      <Input
                        value={draft.brand}
                        onChange={(e) => setDraft((p) => ({ ...p, brand: e.target.value }))}
                      />
                    </Field>

                    <Field label="Название">
                      <Input
                        value={draft.name}
                        onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                      />
                    </Field>

                    <Field label="Название (RU, для поиска)">
                      <Input
                        value={draft.searchNameRu}
                        onChange={(e) => setDraft((p) => ({ ...p, searchNameRu: e.target.value }))}
                        placeholder="русское название аромата"
                      />
                    </Field>

                    <Field label="В наличии">
                      <select
                        value={draft.inStock ? "yes" : "no"}
                        onChange={(e) => setDraft((p) => ({ ...p, inStock: e.target.value === "yes" }))}
                        className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                        style={{
                          borderColor: THEME.border2,
                          background: "rgba(255,255,255,0.03)",
                          color: THEME.text,
                        }}
                      >
                        <option value="yes">Есть в наличии</option>
                        <option value="no">Нет в наличии</option>
                      </select>
                    </Field>

                    <Field label="Хит продаж">
                      <select
                        value={draft.isHit ? "yes" : "no"}
                        onChange={(e) => setDraft((p) => ({ ...p, isHit: e.target.value === "yes" }))}
                        className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                        style={{
                          borderColor: THEME.border2,
                          background: "rgba(255,255,255,0.03)",
                          color: THEME.text,
                        }}
                      >
                        <option value="no">Нет</option>
                        <option value="yes">Да</option>
                      </select>
                    </Field>

                    <div className="lg:col-span-2">
                      <Field label="Описание">
                        <TextArea
                          value={draft.description}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              description: e.target.value,
                            }))
                          }
                        />
                      </Field>
                    </div>

                    <Field label="Цена (basePrice)">
                      <Input
                        type="number"
                        value={draft.basePrice}
                        onChange={(e) => setDraft((p) => ({ ...p, basePrice: e.target.value }))}
                      />
                    </Field>

                    <Field label="Объём (baseVolume, ml)">
                      <Input
                        type="number"
                        value={draft.baseVolume}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            baseVolume: e.target.value,
                          }))
                        }
                      />
                    </Field>

                    <div className="lg:col-span-2">
                      <div className="mb-2 text-xs" style={{ color: THEME.muted }}>
                        Сезоны
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {SEASONS.map((s) => (
                          <Chip
                            key={s}
                            active={draft.seasons.includes(s)}
                            onClick={() =>
                              setDraft((p) => ({
                                ...p,
                                seasons: toggleInArray(p.seasons, s),
                              }))
                            }
                          >
                            {s}
                          </Chip>
                        ))}
                      </div>
                    </div>

                    <div className="lg:col-span-2">
                      <div className="mb-2 text-xs" style={{ color: THEME.muted }}>
                        Время дня
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {DAYNIGHT.map((d) => (
                          <Chip
                            key={d}
                            active={draft.dayNight.includes(d)}
                            onClick={() =>
                              setDraft((p) => ({
                                ...p,
                                dayNight: toggleInArray(p.dayNight, d),
                              }))
                            }
                          >
                            {d}
                          </Chip>
                        ))}
                      </div>
                    </div>

                    <div className="lg:col-span-2">
                      <Field label="Теги (через запятую)">
                        <Input
                          value={draft.tagsText}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              tagsText: e.target.value,
                            }))
                          }
                          placeholder="свежий, цитрус, унисекс"
                        />
                      </Field>
                    </div>

                    <Field label="Ноты TOP (через запятую)">
                      <Input
                        value={draft.notesTopText}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            notesTopText: e.target.value,
                          }))
                        }
                      />
                    </Field>

                    <Field label="Ноты HEART (через запятую)">
                      <Input
                        value={draft.notesHeartText}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            notesHeartText: e.target.value,
                          }))
                        }
                      />
                    </Field>

                    <div className="lg:col-span-2">
                      <Field label="Ноты BASE (через запятую)">
                        <Input
                          value={draft.notesBaseText}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              notesBaseText: e.target.value,
                            }))
                          }
                        />
                      </Field>
                    </div>

                    <Field label="Шлейф (1–5)">
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        value={draft.sillage}
                        onChange={(e) => setDraft((p) => ({ ...p, sillage: e.target.value }))}
                      />
                    </Field>

                    <Field label="Стойкость (1–5)">
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        value={draft.longevity}
                        onChange={(e) => setDraft((p) => ({ ...p, longevity: e.target.value }))}
                      />
                    </Field>

                    <div className="lg:col-span-2">
                      <Field label="Картинка (URL)" hint="если не используешь Storage — вставь ссылку">
                        <Input
                          value={draft.image}
                          onChange={(e) => setDraft((p) => ({ ...p, image: e.target.value }))}
                          placeholder="https://..."
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              </div>
            </EditorModal>
          </>
        )}
      </main>
    </div>
  );
}
