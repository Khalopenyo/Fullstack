// src/pages/AdminPage.js
import React from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { THEME } from "../data/theme";
import { useAuth } from "../state/auth";
import { fetchCatalogWithDiagnostics, upsertPerfume, deletePerfume } from "../services/perfumesRepo";
import { uploadPerfumeImage } from "../services/storageRepo";
import { listOrders, updateOrder, deleteOrder, listUsers, setUserAdmin, deleteUser, listPresets, savePreset, deletePreset, listStock, updateStock } from "../services/adminApi";
import PaginationBar from "../components/PaginationBar";
import { setRobots } from "../lib/seo";

const SEASONS = ["Зима", "Весна", "Лето", "Осень"];
const DAYNIGHT = ["Утро", "День", "Вечер", "Ночь"];
const PRESET_TEMPLATES = [
  {
    title: "Лето",
    groups: [
      { title: "Свежий цитрус", subtitle: "", notes: "", perfumeIds: [] },
      { title: "Морская свежесть", subtitle: "", notes: "", perfumeIds: [] },
      { title: "Фруктовый лёд", subtitle: "", notes: "", perfumeIds: [] },
    ],
  },
  {
    title: "Осень",
    groups: [
      { title: "Древесность", subtitle: "", notes: "", perfumeIds: [] },
      { title: "Тёплая амбра", subtitle: "", notes: "", perfumeIds: [] },
      { title: "Пряный чай", subtitle: "", notes: "", perfumeIds: [] },
    ],
  },
  {
    title: "Зима",
    groups: [
      { title: "Пряный вечер", subtitle: "", notes: "", perfumeIds: [] },
      { title: "Смолы и ваниль", subtitle: "", notes: "", perfumeIds: [] },
      { title: "Гурманика", subtitle: "", notes: "", perfumeIds: [] },
    ],
  },
  {
    title: "Весна",
    groups: [
      { title: "Цветочная нежность", subtitle: "", notes: "", perfumeIds: [] },
      { title: "Зелёная свежесть", subtitle: "", notes: "", perfumeIds: [] },
      { title: "Пудровый мускус", subtitle: "", notes: "", perfumeIds: [] },
    ],
  },
];

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

  React.useEffect(() => {
    setRobots("noindex,follow");
  }, []);

  const ADMIN_TAB_KEY = "admin:tab";
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
  const [adminTab, setAdminTab] = React.useState(() => {
    try {
      const saved = localStorage.getItem(ADMIN_TAB_KEY);
      if (saved === "catalog" || saved === "orders" || saved === "users" || saved === "presets" || saved === "stock") return saved;
    } catch {
      // ignore storage failures
    }
    return "catalog";
  });
  const [orders, setOrders] = React.useState([]);
  const [ordersLoading, setOrdersLoading] = React.useState(false);
  const [ordersChannel, setOrdersChannel] = React.useState("all");
  const [ordersPage, setOrdersPage] = React.useState(1);
  const [ordersTotal, setOrdersTotal] = React.useState(0);
  const ORDERS_PAGE_SIZE = 20;
  const [users, setUsers] = React.useState([]);
  const [usersLoading, setUsersLoading] = React.useState(false);
  const [userBusy, setUserBusy] = React.useState({});
  const [usersPage, setUsersPage] = React.useState(1);
  const [usersTotal, setUsersTotal] = React.useState(0);
  const USERS_PAGE_SIZE = 20;
  const [stock, setStock] = React.useState([]);
  const [stockLoading, setStockLoading] = React.useState(false);
  const [stockQuery, setStockQuery] = React.useState("");
  const [stockIncludeUnlimited, setStockIncludeUnlimited] = React.useState(true);
  const [stockLow, setStockLow] = React.useState(5);
  const [stockSummary, setStockSummary] = React.useState({ total: 0, low: 0, zero: 0, unlimited: 0 });
  const [stockEdits, setStockEdits] = React.useState({});
  const [stockBusy, setStockBusy] = React.useState({});
  const [stockPage, setStockPage] = React.useState(1);
  const [stockTotal, setStockTotal] = React.useState(0);
  const STOCK_PAGE_SIZE = 20;
  const [presets, setPresets] = React.useState([]);
  const [presetsLoading, setPresetsLoading] = React.useState(false);
  const [presetDraft, setPresetDraft] = React.useState({
    title: "",
    subtitle: "",
    notes: "",
    groups: [{ title: "", subtitle: "", notes: "", perfumeIds: [] }],
  });
  const [presetEdits, setPresetEdits] = React.useState({});
  const [presetSearch, setPresetSearch] = React.useState({});
  const [presetPickerOpen, setPresetPickerOpen] = React.useState({});
  const [presetsListOpen, setPresetsListOpen] = React.useState(false);
  const usersCount = usersTotal;

  const applyPresetTemplate = React.useCallback((tpl) => {
    if (!tpl) return;
    setPresetDraft({
      title: tpl.title || "",
      subtitle: "",
      notes: "",
      groups: Array.isArray(tpl.groups) && tpl.groups.length
        ? tpl.groups.map((g) => ({ ...g, perfumeIds: [] }))
        : [{ title: "", subtitle: "", notes: "", perfumeIds: [] }],
    });
  }, []);

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
    stockQty: "",
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

  const normalizeSearch = React.useCallback((value) => {
    return String(value || "")
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/[^a-z0-9а-я\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }, []);

  const pickPerfumesForGroup = React.useCallback(
    (presetTitle, groupTitle, limit = 12) => {
      const seed = normalizeSearch(`${presetTitle || ""} ${groupTitle || ""}`);
      const tokens = seed.split(" ").filter((t) => t.length >= 3);
      if (!tokens.length) return [];

      const scored = (items || [])
        .map((p) => {
          const hay = normalizeSearch(
            [
              p.brand,
              p.name,
              p.family,
              ...(p.tags || []),
              ...(p.notes?.top || []),
              ...(p.notes?.heart || []),
              ...(p.notes?.base || []),
              ...(p.seasons || []),
              ...(p.dayNight || []),
            ].join(" ")
          );
          if (!hay) return null;
          let score = 0;
          tokens.forEach((t) => {
            if (hay.includes(t)) score += 2;
          });
          const seasonToken = ["лето", "осень", "зима", "весна"].find((s) => seed.includes(s));
          if (seasonToken && hay.includes(seasonToken)) score += 2;
          return score > 0 ? { id: p.id, score, name: p.name || "" } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

      return scored.slice(0, limit).map((x) => x.id);
    },
    [items, normalizeSearch]
  );

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

  const perfumeIndex = React.useMemo(() => {
    const map = new Map();
    (items || []).forEach((p) => {
      map.set(p.id, p);
    });
    return map;
  }, [items]);

  const catalogLabel = catalogMode === "wholesale" ? "Оптовый каталог" : "Каталог";
  const collectionName = catalogMode === "wholesale" ? "wholesale_perfumes" : "perfumes";
  const idPrefix = catalogMode === "wholesale" ? "w" : "p";

  React.useEffect(() => {
    setVisibleCount(10);
  }, [q, items]);

  React.useEffect(() => {
    setOrdersPage(1);
  }, [ordersChannel]);

  React.useEffect(() => {
    setUsersPage(1);
  }, [q]);

  React.useEffect(() => {
    setStockPage(1);
  }, [stockQuery, stockIncludeUnlimited, stockLow]);

  React.useEffect(() => {
    if (adminTab !== "stock") return;
    setStockLoading(true);
    listStock({ q: stockQuery, includeUnlimited: stockIncludeUnlimited, low: stockLow, page: stockPage, pageSize: STOCK_PAGE_SIZE })
      .then((data) => {
        const items = Array.isArray(data?.items) ? data.items : [];
        setStock(items);
        const edits = {};
        items.forEach((p) => {
          edits[p.id] = p.stockQty == null ? "" : String(p.stockQty);
        });
        setStockEdits(edits);
        setStockSummary(data?.summary || { total: items.length, low: 0, zero: 0, unlimited: 0 });
        setStockTotal(Number(data?.total || items.length || 0));
      })
      .catch((e) => {
        console.error(e);
        setStock([]);
        setStockEdits({});
        setStockSummary({ total: 0, low: 0, zero: 0, unlimited: 0 });
        setStockTotal(0);
      })
      .finally(() => setStockLoading(false));
  }, [adminTab, stockQuery, stockIncludeUnlimited, stockLow, stockPage]);

  React.useEffect(() => {
    try {
      localStorage.setItem(ADMIN_TAB_KEY, adminTab);
    } catch {
      // ignore storage failures
    }
  }, [adminTab]);

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
      const data = await listOrders({ page: ordersPage, pageSize: ORDERS_PAGE_SIZE, channel: ordersChannel });
      const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setOrders(list);
      setOrdersTotal(Number(data?.total || list.length || 0));
    } catch (e) {
      console.error(e);
      setOrders([]);
      setOrdersTotal(0);
    } finally {
      setOrdersLoading(false);
    }
  }, [ordersPage, ordersChannel]);

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
      const data = await listUsers({ page: usersPage, pageSize: USERS_PAGE_SIZE, q });
      const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setUsers(list);
      setUsersTotal(Number(data?.total || list.length || 0));
    } catch (e) {
      console.error(e);
      setUsers([]);
      setUsersTotal(0);
    } finally {
      setUsersLoading(false);
    }
  }, [usersPage, q]);

  const loadPresets = React.useCallback(async () => {
    setPresetsLoading(true);
    try {
      const list = await listPresets();
      const safe = Array.isArray(list) ? list : [];
      setPresets(safe);
      const edits = {};
      safe.forEach((p) => {
        edits[p.id] = {
          title: p.title || "",
          subtitle: p.subtitle || "",
          notes: p.notes || "",
          groups: Array.isArray(p.groups)
            ? p.groups.map((g) => ({
                title: g.title || "",
                subtitle: g.subtitle || "",
                notes: g.notes || "",
                perfumeIds: Array.isArray(g.perfumeIds) ? g.perfumeIds : [],
              }))
            : [],
        };
      });
      setPresetEdits(edits);
    } catch (e) {
      console.error(e);
      setPresets([]);
      setPresetEdits({});
    } finally {
      setPresetsLoading(false);
    }
  }, []);

  const updateUserAdmin = React.useCallback(
    async (target, nextValue) => {
      if (!target?.id) return;
      if (target.id === uid && !nextValue) {
        const ok = window.confirm("Снять у себя админ-доступ?");
        if (!ok) return;
      }
      setUserBusy((prev) => ({ ...prev, [target.id]: true }));
      try {
        await setUserAdmin(target.id, nextValue);
        setUsers((prev) =>
          prev.map((u) => (u.id === target.id ? { ...u, isAdmin: Boolean(nextValue) } : u))
        );
      } catch (e) {
        console.error(e);
      } finally {
        setUserBusy((prev) => {
          const copy = { ...prev };
          delete copy[target.id];
          return copy;
        });
      }
    },
    [uid]
  );

  const removeUser = React.useCallback(async (target) => {
    if (!target?.id) return;
    const label = target.email || target.displayName || target.id;
    if (!window.confirm(`Удалить пользователя ${label}? Будут удалены заказы, корзина и избранное.`)) return;
    setUserBusy((prev) => ({ ...prev, [target.id]: true }));
    try {
      await deleteUser(target.id);
      setUsers((prev) => prev.filter((u) => u.id !== target.id));
    } catch (e) {
      console.error(e);
    } finally {
      setUserBusy((prev) => {
        const copy = { ...prev };
        delete copy[target.id];
        return copy;
      });
    }
  }, []);

  const buildGroupsPayload = React.useCallback((groups) => {
    return (Array.isArray(groups) ? groups : [])
      .map((g) => {
        const perfumeIds = Array.isArray(g.perfumeIds)
          ? Array.from(new Set(g.perfumeIds.filter(Boolean)))
          : [];
        return {
          title: (g.title || "").trim(),
          subtitle: (g.subtitle || "").trim(),
          notes: (g.notes || "").trim(),
          perfumeIds,
        };
      })
      .filter((g) => g.title || g.subtitle || g.notes || g.perfumeIds.length > 0);
  }, []);

  const addGroupToDraft = React.useCallback(() => {
    setPresetDraft((prev) => ({
      ...prev,
      groups: [...(prev.groups || []), { title: "", subtitle: "", notes: "", perfumeIds: [] }],
    }));
  }, []);

  const removeGroupFromDraft = React.useCallback((idx) => {
    setPresetDraft((prev) => ({
      ...prev,
      groups: (prev.groups || []).filter((_, i) => i !== idx),
    }));
  }, []);

  const updateDraftGroupField = React.useCallback((idx, field, value) => {
    setPresetDraft((prev) => ({
      ...prev,
      groups: (prev.groups || []).map((g, i) => (i === idx ? { ...g, [field]: value } : g)),
    }));
  }, []);

  const addGroupToPreset = React.useCallback((id) => {
    setPresetEdits((prev) => {
      const draft = prev[id];
      if (!draft) return prev;
      return {
        ...prev,
        [id]: {
          ...draft,
          groups: [...(draft.groups || []), { title: "", subtitle: "", notes: "", perfumeIds: [] }],
        },
      };
    });
  }, []);

  const removeGroupFromPreset = React.useCallback((id, idx) => {
    setPresetEdits((prev) => {
      const draft = prev[id];
      if (!draft) return prev;
      return {
        ...prev,
        [id]: { ...draft, groups: (draft.groups || []).filter((_, i) => i !== idx) },
      };
    });
  }, []);

  const updatePresetGroupField = React.useCallback((id, idx, field, value) => {
    setPresetEdits((prev) => {
      const draft = prev[id];
      if (!draft) return prev;
      return {
        ...prev,
        [id]: {
          ...draft,
          groups: (draft.groups || []).map((g, i) => (i === idx ? { ...g, [field]: value } : g)),
        },
      };
    });
  }, []);

  const addPerfumeToDraftGroup = React.useCallback((idx, perfumeId) => {
    if (!perfumeId) return;
    setPresetDraft((prev) => ({
      ...prev,
      groups: (prev.groups || []).map((g, i) => {
        if (i !== idx) return g;
        const next = Array.from(new Set([...(g.perfumeIds || []), perfumeId]));
        return { ...g, perfumeIds: next };
      }),
    }));
  }, []);

  const autoFillDraftGroup = React.useCallback(
    (idx) => {
      setPresetDraft((prev) => {
        const presetTitle = prev.title;
        const nextGroups = (prev.groups || []).map((g, i) => {
          if (i !== idx) return g;
          const picked = pickPerfumesForGroup(presetTitle, g.title);
          const merged = Array.from(new Set([...(g.perfumeIds || []), ...picked])).slice(0, 12);
          return { ...g, perfumeIds: merged };
        });
        return { ...prev, groups: nextGroups };
      });
    },
    [pickPerfumesForGroup]
  );

  const removePerfumeFromDraftGroup = React.useCallback((idx, perfumeId) => {
    setPresetDraft((prev) => ({
      ...prev,
      groups: (prev.groups || []).map((g, i) => {
        if (i !== idx) return g;
        return { ...g, perfumeIds: (g.perfumeIds || []).filter((id) => id !== perfumeId) };
      }),
    }));
  }, []);

  const addPerfumeToPresetGroup = React.useCallback((id, idx, perfumeId) => {
    if (!perfumeId) return;
    setPresetEdits((prev) => {
      const draft = prev[id];
      if (!draft) return prev;
      const nextGroups = (draft.groups || []).map((g, i) => {
        if (i !== idx) return g;
        const next = Array.from(new Set([...(g.perfumeIds || []), perfumeId]));
        return { ...g, perfumeIds: next };
      });
      return { ...prev, [id]: { ...draft, groups: nextGroups } };
    });
  }, []);

  const autoFillPresetGroup = React.useCallback(
    (id, idx) => {
      setPresetEdits((prev) => {
        const draft = prev[id];
        if (!draft) return prev;
        const presetTitle = draft.title;
        const nextGroups = (draft.groups || []).map((g, i) => {
          if (i !== idx) return g;
          const picked = pickPerfumesForGroup(presetTitle, g.title);
          const merged = Array.from(new Set([...(g.perfumeIds || []), ...picked])).slice(0, 12);
          return { ...g, perfumeIds: merged };
        });
        return { ...prev, [id]: { ...draft, groups: nextGroups } };
      });
    },
    [pickPerfumesForGroup]
  );

  const removePerfumeFromPresetGroup = React.useCallback((id, idx, perfumeId) => {
    setPresetEdits((prev) => {
      const draft = prev[id];
      if (!draft) return prev;
      const nextGroups = (draft.groups || []).map((g, i) => {
        if (i !== idx) return g;
        return { ...g, perfumeIds: (g.perfumeIds || []).filter((pid) => pid !== perfumeId) };
      });
      return { ...prev, [id]: { ...draft, groups: nextGroups } };
    });
  }, []);

  const setGroupSearchValue = React.useCallback((key, value) => {
    setPresetSearch((prev) => ({ ...prev, [key]: value }));
  }, []);

  const togglePicker = React.useCallback((key) => {
    setPresetPickerOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const saveNewPreset = React.useCallback(async () => {
    if (!presetDraft.title.trim()) return;
    const groups = buildGroupsPayload(presetDraft.groups);
    if (groups.length === 0) return;
    try {
      await savePreset({
        title: presetDraft.title.trim(),
        subtitle: presetDraft.subtitle.trim(),
        notes: presetDraft.notes.trim(),
        groups,
      });
      setPresetDraft({ title: "", subtitle: "", notes: "", groups: [{ title: "", subtitle: "", notes: "", perfumeIds: [] }] });
      await loadPresets();
    } catch (e) {
      console.error(e);
    }
  }, [presetDraft, buildGroupsPayload, loadPresets]);

  const saveExistingPreset = React.useCallback(
    async (id) => {
      const draft = presetEdits[id];
      if (!draft || !draft.title.trim()) return;
      const groups = buildGroupsPayload(draft.groups);
      if (groups.length === 0) return;
      try {
        await savePreset({
          id,
          title: draft.title.trim(),
          subtitle: draft.subtitle.trim(),
          notes: draft.notes.trim(),
          groups,
        });
        await loadPresets();
      } catch (e) {
        console.error(e);
      }
    },
    [presetEdits, buildGroupsPayload, loadPresets]
  );

  const removePreset = React.useCallback(
    async (id) => {
      if (!window.confirm("Удалить пресет?")) return;
      try {
        await deletePreset(id);
        await loadPresets();
      } catch (e) {
        console.error(e);
      }
    },
    [loadPresets]
  );

  React.useEffect(() => {
    if (!authReady) return;
    if (!isAdmin) return;
    if (adminTab !== "users") return;
    loadUsers();
  }, [authReady, isAdmin, adminTab, loadUsers]);

  React.useEffect(() => {
    if (!authReady) return;
    if (!isAdmin) return;
    if (adminTab !== "presets") return;
    loadPresets();
  }, [authReady, isAdmin, adminTab, loadPresets]);

  const filteredOrders = orders;
  const filteredUsers = users;

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
      stockQty: "",
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
      stockQty: p.stockQty ?? "",
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
      stockQty: draft.stockQty === "" || draft.stockQty == null ? null : Math.max(0, Math.round(Number(draft.stockQty) || 0)),

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
              
            </div>
          </div>
        ) : (
          <>
            {/* toolbar */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mt-5">
              <div className="adminToolbar__row flex items-center gap-2">
                <div className="adminTabs flex items-center gap-2">
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
                  <button
                    type="button"
                    className="rounded-full border px-4 py-2 text-sm hover:bg-white/[0.06]"
                    style={{
                      borderColor: THEME.border2,
                      color: THEME.text,
                      background: adminTab === "stock" ? "rgba(255,255,255,0.06)" : "transparent",
                    }}
                    onClick={() => setAdminTab("stock")}
                  >
                    Склад
                  </button>
                  <button
                    type="button"
                    className="rounded-full border px-4 py-2 text-sm hover:bg-white/[0.06]"
                    style={{
                      borderColor: THEME.border2,
                      color: THEME.text,
                      background: adminTab === "presets" ? "rgba(255,255,255,0.06)" : "transparent",
                    }}
                    onClick={() => setAdminTab("presets")}
                  >
                    Пресеты
                  </button>
                </div>
                <div className="adminToolbar__controls flex items-center gap-2">
                  <input
                    disabled={adminTab === "orders" || adminTab === "presets" || adminTab === "stock"}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={
                      adminTab === "users"
                        ? "Поиск по имени / email / UID..."
                        : adminTab === "presets"
                        ? "Поиск по пресетам отключён"
                        : adminTab === "stock"
                        ? ""
                        : "Поиск по названию / нотам / тегам..."
                    }
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
                    onClick={
                      adminTab === "orders"
                        ? loadOrders
                        : adminTab === "users"
                        ? loadUsers
                        : adminTab === "stock"
                        ? () => {
                            setStockLoading(true);
                            listStock({ q: stockQuery, includeUnlimited: stockIncludeUnlimited, low: stockLow })
                              .then((data) => {
                                const items = Array.isArray(data?.items) ? data.items : [];
                                setStock(items);
                                setStockSummary(data?.summary || { total: items.length, low: 0, zero: 0, unlimited: 0 });
                              })
                              .catch((e) => {
                                console.error(e);
                                setStock([]);
                                setStockSummary({ total: 0, low: 0, zero: 0, unlimited: 0 });
                              })
                              .finally(() => setStockLoading(false));
                          }
                        : adminTab === "presets"
                        ? loadPresets
                        : load
                    }
                    disabled={
                      adminTab === "orders"
                        ? ordersLoading
                        : adminTab === "users"
                        ? usersLoading
                        : adminTab === "stock"
                        ? stockLoading
                        : adminTab === "presets"
                        ? presetsLoading
                        : loading
                    }
                  >
                    {adminTab === "orders"
                      ? ordersLoading
                        ? "..."
                        : "Обновить"
                      : adminTab === "users"
                      ? usersLoading
                        ? "..."
                        : "Обновить"
                      : adminTab === "stock"
                      ? stockLoading
                        ? "..."
                        : "Обновить"
                      : adminTab === "presets"
                      ? presetsLoading
                        ? "..."
                        : "Обновить"
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
                  ) : adminTab === "stock" ? (
                    <>
                      <input
                        value={stockQuery}
                        onChange={(e) => setStockQuery(e.target.value)}
                        placeholder="Поиск по складу"
                        className="rounded-full border px-4 py-2 text-sm outline-none"
                        style={{
                          borderColor: THEME.border2,
                          background: "rgba(255,255,255,0.03)",
                          color: THEME.text,
                        }}
                      />
                      <label className="inline-flex items-center gap-2 text-xs" style={{ color: THEME.muted }}>
                        <input
                          type="checkbox"
                          checked={stockIncludeUnlimited}
                          onChange={(e) => setStockIncludeUnlimited(e.target.checked)}
                        />
                        Показывать без лимита
                      </label>
                      <input
                        type="number"
                        value={stockLow}
                        onChange={(e) => setStockLow(Math.max(1, Number(e.target.value) || 1))}
                        className="w-24 rounded-full border px-3 py-2 text-sm outline-none"
                        style={{
                          borderColor: THEME.border2,
                          background: "rgba(255,255,255,0.03)",
                          color: THEME.text,
                        }}
                        title="Порог низкого остатка"
                      />
                    </>
                  ) : null}
                </div>

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
                     {diag.summary.warnings}
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
              ) : adminTab === "stock" ? (
                <button
                  type="button"
                  className="rounded-full px-5 py-3 text-sm font-semibold"
                  style={{ background: THEME.accent, color: "#0B0B0F" }}
                  onClick={openNew}
                >
                  + Добавить товар
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
                  <>
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
                            {o.phone ? ` · ${o.phone}` : ""}
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
                    {ordersTotal > ORDERS_PAGE_SIZE ? (
                      <div className="mt-5">
                        <PaginationBar
                          page={ordersPage}
                          totalPages={Math.max(1, Math.ceil(ordersTotal / ORDERS_PAGE_SIZE))}
                          onPageChange={setOrdersPage}
                        />
                      </div>
                    ) : null}
                  </>
                )
              ) : adminTab === "stock" ? (
                stockLoading ? (
                  <div className="text-sm opacity-70">Загрузка...</div>
                ) : stock.length === 0 ? (
                  <div className="text-sm opacity-70">Нет товаров</div>
                ) : (
                  <>
                    <div className="mb-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border px-3 py-1" style={{ borderColor: THEME.border2, color: THEME.text }}>
                        Всего: {stockSummary.total}
                      </span>
                      <span className="rounded-full border px-3 py-1" style={{ borderColor: "rgba(255,200,120,0.45)", color: THEME.text }}>
                        Низкий остаток: {stockSummary.low}
                      </span>
                      <span className="rounded-full border px-3 py-1" style={{ borderColor: "rgba(255,120,120,0.45)", color: THEME.text }}>
                        Нет на складе: {stockSummary.zero}
                      </span>
                      <span className="rounded-full border px-3 py-1" style={{ borderColor: THEME.border2, color: THEME.text }}>
                        Без лимита: {stockSummary.unlimited}
                      </span>
                    </div>
                    <div className="grid gap-2">
                      {stock.map((p) => {
                        const qty = p.stockQty == null ? "—" : p.stockQty;
                        const isLow = p.stockQty != null && p.stockQty > 0 && p.stockQty <= stockLow;
                        const isZero = p.stockQty === 0;
                        return (
                          <div
                            key={p.id}
                            className="flex flex-wrap items-center gap-3 rounded-2xl border px-3 py-2"
                            style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.02)" }}
                          >
                            <div
                              className="h-12 w-12 overflow-hidden rounded-xl border"
                              style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.04)" }}
                            >
                              {p.image ? (
                                <img src={p.image} alt="" className="h-full w-full object-cover" />
                              ) : null}
                            </div>
                            <div className="min-w-[180px] flex-1 text-sm">
                              <div className="font-semibold">{p.brand || "—"} · {p.name || p.id}</div>
                              <div className="text-xs" style={{ color: THEME.muted }}>ID: {p.id}</div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              {isZero ? (
                                <span
                                  className="rounded-full border px-2 py-0.5"
                                  style={{ borderColor: "rgba(255,120,120,0.45)", color: THEME.text }}
                                >
                                  Нет на складе
                                </span>
                              ) : isLow ? (
                                <span
                                  className="rounded-full border px-2 py-0.5"
                                  style={{ borderColor: "rgba(255,200,120,0.45)", color: THEME.text }}
                                >
                                  Низкий остаток
                                </span>
                              ) : null}
                              <span
                                className="rounded-full border px-2 py-0.5"
                                style={{
                                  borderColor: isZero
                                    ? "rgba(255,120,120,0.45)"
                                    : isLow
                                    ? "rgba(255,200,120,0.45)"
                                    : THEME.border2,
                                  color: THEME.text,
                                }}
                              >
                                Остаток: {qty}
                              </span>
                              <span
                                className="rounded-full border px-2 py-0.5"
                                style={{ borderColor: THEME.border2, color: THEME.text }}
                              >
                                {p.inStock ? "В наличии" : "Нет в наличии"}
                              </span>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={stockEdits[p.id] ?? ""}
                                  onChange={(e) =>
                                    setStockEdits((prev) => ({ ...prev, [p.id]: e.target.value }))
                                  }
                                  className="w-24 rounded-full border px-3 py-1 text-xs outline-none"
                                  style={{
                                    borderColor: THEME.border2,
                                    background: "rgba(255,255,255,0.03)",
                                    color: THEME.text,
                                  }}
                                  placeholder="—"
                                />
                                <button
                                  type="button"
                                  className="rounded-full border px-3 py-1 text-xs hover:bg-white/[0.06]"
                                  style={{ borderColor: THEME.border2, color: THEME.text }}
                                  disabled={Boolean(stockBusy[p.id])}
                                  onClick={async () => {
                                    const raw = stockEdits[p.id];
                                    const next = raw === "" ? null : Math.max(0, Math.round(Number(raw) || 0));
                                    setStockBusy((prev) => ({ ...prev, [p.id]: true }));
                                    try {
                                      await updateStock(p.id, next);
                                      await listStock({ q: stockQuery, includeUnlimited: stockIncludeUnlimited, low: stockLow, page: stockPage, pageSize: STOCK_PAGE_SIZE })
                                        .then((data) => {
                                          const items = Array.isArray(data?.items) ? data.items : [];
                                          setStock(items);
                                          const edits = {};
                                          items.forEach((item) => {
                                            edits[item.id] = item.stockQty == null ? "" : String(item.stockQty);
                                          });
                                          setStockEdits(edits);
                                          setStockSummary(data?.summary || { total: items.length, low: 0, zero: 0, unlimited: 0 });
                                          setStockTotal(Number(data?.total || items.length || 0));
                                        });
                                    } catch (e) {
                                      console.error(e);
                                    } finally {
                                      setStockBusy((prev) => {
                                        const copy = { ...prev };
                                        delete copy[p.id];
                                        return copy;
                                      });
                                    }
                                  }}
                                >
                                  {stockBusy[p.id] ? "..." : "Сохранить"}
                                </button>
                                <button
                                  type="button"
                                  className="rounded-full border px-3 py-1 text-xs hover:bg-white/[0.06]"
                                  style={{ borderColor: "rgba(255,120,120,0.45)", color: THEME.text }}
                                  onClick={async () => {
                                    if (!window.confirm("Удалить товар?")) return;
                                    try {
                                      await deletePerfume(p.id);
                                      await listStock({ q: stockQuery, includeUnlimited: stockIncludeUnlimited, low: stockLow, page: stockPage, pageSize: STOCK_PAGE_SIZE })
                                        .then((data) => {
                                          const items = Array.isArray(data?.items) ? data.items : [];
                                          setStock(items);
                                          const edits = {};
                                          items.forEach((item) => {
                                            edits[item.id] = item.stockQty == null ? "" : String(item.stockQty);
                                          });
                                          setStockEdits(edits);
                                          setStockSummary(data?.summary || { total: items.length, low: 0, zero: 0, unlimited: 0 });
                                          setStockTotal(Number(data?.total || items.length || 0));
                                        });
                                    } catch (e) {
                                      console.error(e);
                                    }
                                  }}
                                >
                                  Удалить
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {stockTotal > STOCK_PAGE_SIZE ? (
                      <div className="mt-5">
                        <PaginationBar
                          page={stockPage}
                          totalPages={Math.max(1, Math.ceil(stockTotal / STOCK_PAGE_SIZE))}
                          onPageChange={setStockPage}
                        />
                      </div>
                    ) : null}
                  </>
                )
              ) : adminTab === "presets" ? (
                presetsLoading ? (
                  <div className="text-sm opacity-70">Загрузка...</div>
                ) : (
                  <div className="grid gap-4">
                    <div
                      className="rounded-3xl border p-4"
                      style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.02)" }}
                    >
                      <div className="text-sm font-semibold">Новый пресет</div>
                      <div className="mt-1 text-xs" style={{ color: THEME.muted }}>
                        Минимум действий: название пресета → название варианта → добавить ароматы.
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {PRESET_TEMPLATES.map((tpl) => (
                          <button
                            key={tpl.title}
                            type="button"
                            className="rounded-full border px-3 py-1.5 text-xs hover:bg-white/[0.06]"
                            style={{ borderColor: THEME.border2, color: THEME.text }}
                            onClick={() => applyPresetTemplate(tpl)}
                          >
                            Заполнить «{tpl.title}»
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 grid gap-3">
                        <label className="text-xs" style={{ color: THEME.muted }}>
                          Заголовок
                          <input
                            value={presetDraft.title}
                            onChange={(e) => setPresetDraft((p) => ({ ...p, title: e.target.value }))}
                            className="mt-2 w-full rounded-2xl border bg-transparent px-3 py-2 text-sm outline-none"
                            style={{ borderColor: THEME.border2, color: THEME.text }}
                            placeholder="Лето"
                          />
                        </label>
                      </div>

                      <div className="mt-4 grid gap-4">
                        {(presetDraft.groups || []).map((g, idx) => {
                          const searchKey = `new:${idx}`;
                          const searchValue = presetSearch[searchKey] || "";
                          const normalized = normalizeSearch(searchValue);
                          const exclude = new Set(g.perfumeIds || []);
                          const results =
                            normalized.length < 2
                              ? []
                              : (items || [])
                                  .filter((p) => {
                                    if (!p?.id || exclude.has(p.id)) return false;
                                    const hay = normalizeSearch(`${p.brand || ""} ${p.name || ""}`);
                                    return hay.includes(normalized);
                                  })
                                  .slice(0, 6);
                          return (
                            <div
                              key={`new-group-${idx}`}
                              className="rounded-2xl border p-3"
                              style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.02)" }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-xs font-semibold" style={{ color: THEME.text }}>
                                  Вариант {idx + 1}
                                </div>
                                {(presetDraft.groups || []).length > 1 ? (
                                  <button
                                    type="button"
                                    className="rounded-full border px-3 py-1 text-[11px] hover:bg-white/[0.06]"
                                    style={{ borderColor: "rgba(255,120,120,0.45)", color: THEME.text }}
                                    onClick={() => removeGroupFromDraft(idx)}
                                  >
                                    Удалить вариант
                                  </button>
                                ) : null}
                              </div>
                              <div className="mt-3 grid gap-3">
                                <label className="text-xs" style={{ color: THEME.muted }}>
                                  Название варианта
                                  <input
                                    value={g.title}
                                    onChange={(e) => updateDraftGroupField(idx, "title", e.target.value)}
                                    className="mt-2 w-full rounded-2xl border bg-transparent px-3 py-2 text-sm outline-none"
                                    style={{ borderColor: THEME.border2, color: THEME.text }}
                                    placeholder="Свежий цитрус"
                                  />
                                </label>
                              </div>

                              <div className="mt-3">
                                <div className="text-xs font-semibold" style={{ color: THEME.muted }}>
                                  Ароматы в варианте
                                </div>
                                {Array.isArray(g.perfumeIds) && g.perfumeIds.length ? (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {g.perfumeIds.map((pid) => {
                                      const perfume = perfumeIndex.get(pid);
                                      const label = perfume
                                        ? `${perfume.brand || "Без бренда"} — ${perfume.name || pid}`
                                        : pid;
                                      return (
                                        <span
                                          key={pid}
                                          className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[11px]"
                                          style={{ borderColor: THEME.border2, color: THEME.text }}
                                        >
                                          {label}
                                          <button
                                            type="button"
                                            className="text-[11px] opacity-70 hover:opacity-100"
                                            onClick={() => removePerfumeFromDraftGroup(idx, pid)}
                                          >
                                            ✕
                                          </button>
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="mt-2 text-xs opacity-70">Пока ничего не добавлено</div>
                                )}
                              </div>

                              <div className="mt-3">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    className="rounded-full border px-3 py-1.5 text-xs hover:bg-white/[0.06]"
                                    style={{ borderColor: THEME.border2, color: THEME.text }}
                                    onClick={() => togglePicker(searchKey)}
                                  >
                                    Добавить аромат
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-full border px-3 py-1.5 text-xs hover:bg-white/[0.06]"
                                    style={{ borderColor: THEME.border2, color: THEME.text }}
                                    onClick={() => autoFillDraftGroup(idx)}
                                  >
                                    Автоподбор
                                  </button>
                                </div>
                                {presetPickerOpen[searchKey] ? (
                                  <div
                                    className="mt-2 rounded-2xl border p-3"
                                    style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.02)" }}
                                  >
                                    <label className="text-xs" style={{ color: THEME.muted }}>
                                      Поиск по каталогу
                                      <input
                                        value={searchValue}
                                        onChange={(e) => setGroupSearchValue(searchKey, e.target.value)}
                                        className="mt-2 w-full rounded-2xl border bg-transparent px-3 py-2 text-sm outline-none"
                                        style={{ borderColor: THEME.border2, color: THEME.text }}
                                        placeholder="Начни вводить название или бренд"
                                      />
                                    </label>
                                    {normalized.length >= 2 ? (
                                      results.length ? (
                                        <div className="mt-2 grid gap-2">
                                          {results.map((p) => (
                                            <button
                                              key={p.id}
                                              type="button"
                                              className="rounded-2xl border px-3 py-2 text-left text-xs hover:bg-white/[0.06]"
                                              style={{ borderColor: THEME.border2, color: THEME.text }}
                                              onClick={() => addPerfumeToDraftGroup(idx, p.id)}
                                            >
                                              {p.brand || "Без бренда"} — {p.name || p.id}
                                            </button>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="mt-2 text-xs opacity-70">Ничего не найдено</div>
                                      )
                                    ) : (
                                      <div className="mt-2 text-xs opacity-70">Введите хотя бы 2 символа</div>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-full border px-4 py-2 text-sm hover:bg-white/[0.06]"
                          style={{ borderColor: THEME.border2, color: THEME.text }}
                          onClick={addGroupToDraft}
                        >
                          Добавить вариант
                        </button>
                        <button
                          type="button"
                          className="rounded-full border px-4 py-2 text-sm hover:bg-white/[0.06]"
                          style={{ borderColor: THEME.border2, color: THEME.text }}
                          onClick={saveNewPreset}
                        >
                          Сохранить пресет
                        </button>
                      </div>
                    </div>

                    <div className="rounded-3xl border p-4" style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.02)" }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold">Готовые пресеты</div>
                        <button
                          type="button"
                          className="rounded-full border px-3 py-1.5 text-xs hover:bg-white/[0.06]"
                          style={{ borderColor: THEME.border2, color: THEME.text }}
                          onClick={() => setPresetsListOpen((v) => !v)}
                        >
                          {presetsListOpen ? "Скрыть" : "Показать"}
                        </button>
                      </div>
                      {presetsListOpen ? (
                        <div className="mt-3 grid gap-3">
                          {presets.length === 0 ? (
                            <div className="text-sm opacity-70">Пресетов пока нет</div>
                          ) : (
                            presets.map((p) => {
                              const draft = presetEdits[p.id] || {
                                title: p.title || "",
                                subtitle: p.subtitle || "",
                                notes: p.notes || "",
                                groups: Array.isArray(p.groups) ? p.groups : [],
                              };
                              return (
                                <div
                                  key={p.id}
                                  className="rounded-3xl border p-4"
                                  style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.02)" }}
                                >
                                  <div className="text-xs" style={{ color: THEME.muted }}>
                                    ID: <span style={{ color: THEME.text }}>{p.id}</span>
                                  </div>
                                  <div className="mt-3 grid gap-3">
                                    <label className="text-xs" style={{ color: THEME.muted }}>
                                      Заголовок
                                      <input
                                        value={draft.title}
                                        onChange={(e) =>
                                          setPresetEdits((prev) => ({
                                            ...prev,
                                            [p.id]: { ...draft, title: e.target.value },
                                          }))
                                        }
                                        className="mt-2 w-full rounded-2xl border bg-transparent px-3 py-2 text-sm outline-none"
                                        style={{ borderColor: THEME.border2, color: THEME.text }}
                                      />
                                    </label>
                                  </div>

                                  <div className="mt-4 grid gap-4">
                                    {(draft.groups || []).map((g, idx) => {
                                      const searchKey = `${p.id}:${idx}`;
                                      const searchValue = presetSearch[searchKey] || "";
                                      const normalized = normalizeSearch(searchValue);
                                      const exclude = new Set(g.perfumeIds || []);
                                      const results =
                                        normalized.length < 2
                                          ? []
                                          : (items || [])
                                              .filter((perf) => {
                                                if (!perf?.id || exclude.has(perf.id)) return false;
                                                const hay = normalizeSearch(`${perf.brand || ""} ${perf.name || ""}`);
                                                return hay.includes(normalized);
                                              })
                                              .slice(0, 6);
                                      return (
                                        <div
                                          key={`${p.id}-group-${idx}`}
                                          className="rounded-2xl border p-3"
                                          style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.02)" }}
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <div className="text-xs font-semibold" style={{ color: THEME.text }}>
                                              Вариант {idx + 1}
                                            </div>
                                            {(draft.groups || []).length > 1 ? (
                                              <button
                                                type="button"
                                                className="rounded-full border px-3 py-1 text-[11px] hover:bg-white/[0.06]"
                                                style={{ borderColor: "rgba(255,120,120,0.45)", color: THEME.text }}
                                                onClick={() => removeGroupFromPreset(p.id, idx)}
                                              >
                                                Удалить вариант
                                              </button>
                                            ) : null}
                                          </div>
                                          <div className="mt-3 grid gap-3">
                                            <label className="text-xs" style={{ color: THEME.muted }}>
                                              Название варианта
                                              <input
                                                value={g.title}
                                                onChange={(e) => updatePresetGroupField(p.id, idx, "title", e.target.value)}
                                                className="mt-2 w-full rounded-2xl border bg-transparent px-3 py-2 text-sm outline-none"
                                                style={{ borderColor: THEME.border2, color: THEME.text }}
                                                placeholder="Свежий цитрус"
                                              />
                                            </label>
                                          </div>

                                          <div className="mt-3">
                                            <div className="text-xs font-semibold" style={{ color: THEME.muted }}>
                                              Ароматы в варианте
                                            </div>
                                            {Array.isArray(g.perfumeIds) && g.perfumeIds.length ? (
                                              <div className="mt-2 flex flex-wrap gap-2">
                                                {g.perfumeIds.map((pid) => {
                                                  const perfume = perfumeIndex.get(pid);
                                                  const label = perfume
                                                    ? `${perfume.brand || "Без бренда"} — ${perfume.name || pid}`
                                                    : pid;
                                                  return (
                                                    <span
                                                      key={pid}
                                                      className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[11px]"
                                                      style={{ borderColor: THEME.border2, color: THEME.text }}
                                                    >
                                                      {label}
                                                      <button
                                                        type="button"
                                                        className="text-[11px] opacity-70 hover:opacity-100"
                                                        onClick={() => removePerfumeFromPresetGroup(p.id, idx, pid)}
                                                      >
                                                        ✕
                                                      </button>
                                                    </span>
                                                  );
                                                })}
                                              </div>
                                            ) : (
                                              <div className="mt-2 text-xs opacity-70">Пока ничего не добавлено</div>
                                            )}
                                          </div>

                                          <div className="mt-3">
                                            <div className="flex flex-wrap gap-2">
                                              <button
                                                type="button"
                                                className="rounded-full border px-3 py-1.5 text-xs hover:bg-white/[0.06]"
                                                style={{ borderColor: THEME.border2, color: THEME.text }}
                                                onClick={() => togglePicker(searchKey)}
                                              >
                                                Добавить аромат
                                              </button>
                                              <button
                                                type="button"
                                                className="rounded-full border px-3 py-1.5 text-xs hover:bg-white/[0.06]"
                                                style={{ borderColor: THEME.border2, color: THEME.text }}
                                                onClick={() => autoFillPresetGroup(p.id, idx)}
                                              >
                                                Автоподбор
                                              </button>
                                            </div>
                                            {presetPickerOpen[searchKey] ? (
                                              <div
                                                className="mt-2 rounded-2xl border p-3"
                                                style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.02)" }}
                                              >
                                                <label className="text-xs" style={{ color: THEME.muted }}>
                                                  Поиск по каталогу
                                                  <input
                                                    value={searchValue}
                                                    onChange={(e) => setGroupSearchValue(searchKey, e.target.value)}
                                                    className="mt-2 w-full rounded-2xl border bg-transparent px-3 py-2 text-sm outline-none"
                                                    style={{ borderColor: THEME.border2, color: THEME.text }}
                                                    placeholder="Начни вводить название или бренд"
                                                  />
                                                </label>
                                                {normalized.length >= 2 ? (
                                                  results.length ? (
                                                    <div className="mt-2 grid gap-2">
                                                      {results.map((perf) => (
                                                        <button
                                                          key={perf.id}
                                                          type="button"
                                                          className="rounded-2xl border px-3 py-2 text-left text-xs hover:bg-white/[0.06]"
                                                          style={{ borderColor: THEME.border2, color: THEME.text }}
                                                          onClick={() => addPerfumeToPresetGroup(p.id, idx, perf.id)}
                                                        >
                                                          {perf.brand || "Без бренда"} — {perf.name || perf.id}
                                                        </button>
                                                      ))}
                                                    </div>
                                                  ) : (
                                                    <div className="mt-2 text-xs opacity-70">Ничего не найдено</div>
                                                  )
                                                ) : (
                                                  <div className="mt-2 text-xs opacity-70">Введите хотя бы 2 символа</div>
                                                )}
                                              </div>
                                            ) : null}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      className="rounded-full border px-4 py-2 text-sm hover:bg-white/[0.06]"
                                      style={{ borderColor: THEME.border2, color: THEME.text }}
                                      onClick={() => addGroupToPreset(p.id)}
                                    >
                                      Добавить вариант
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded-full border px-4 py-2 text-sm hover:bg-white/[0.06]"
                                      style={{ borderColor: THEME.border2, color: THEME.text }}
                                      onClick={() => saveExistingPreset(p.id)}
                                    >
                                      Сохранить
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded-full border px-4 py-2 text-sm hover:bg-white/[0.06]"
                                      style={{ borderColor: "rgba(255,120,120,0.45)", color: THEME.text }}
                                      onClick={() => removePreset(p.id)}
                                    >
                                      Удалить
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      ) : (
                        <div className="mt-3 text-xs" style={{ color: THEME.muted }}>
                          Список скрыт. Нажми «Показать», чтобы отредактировать готовые пресеты.
                        </div>
                      )}
                    </div>
                  </div>
                )
              ) : adminTab === "users" ? (
                <>
                  <div
                    className="mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
                    style={{ borderColor: THEME.border2, color: THEME.text }}
                  >
                    Всего пользователей: <span>{usersLoading ? "…" : usersCount}</span>
                  </div>
                  {usersLoading ? (
                    <div className="text-sm opacity-70">Загрузка...</div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-sm opacity-70">Нет пользователей</div>
                  ) : (
                    <>
                      <div className="grid gap-3">
                        {filteredUsers.map((u) => (
                          <div
                            key={u.id}
                            className="rounded-3xl border p-4"
                            style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.02)" }}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-sm font-semibold">{u.displayName || "Без имени"}</div>
                              <div className="flex flex-wrap items-center gap-2">
                                {u.isAdmin ? (
                                  <span
                                    className="rounded-full border px-2 py-0.5 text-[11px]"
                                    style={{ borderColor: "rgba(120,200,120,0.45)", color: THEME.text }}
                                  >
                                    Админ
                                  </span>
                                ) : null}
                                <button
                                  type="button"
                                  className="rounded-full border px-3 py-1 text-[11px] hover:bg-white/[0.06]"
                                  style={{ borderColor: THEME.border2, color: THEME.text }}
                                  onClick={() => updateUserAdmin(u, !u.isAdmin)}
                                  disabled={Boolean(userBusy[u.id])}
                                >
                                  {userBusy[u.id] ? "..." : u.isAdmin ? "Снять админа" : "Сделать админом"}
                                </button>
                                <button
                                  type="button"
                                  className="rounded-full border px-3 py-1 text-[11px] hover:bg-white/[0.06]"
                                  style={{ borderColor: "rgba(255,120,120,0.45)", color: THEME.text }}
                                  onClick={() => removeUser(u)}
                                  disabled={Boolean(userBusy[u.id]) || u.id === uid}
                                >
                                  {userBusy[u.id] ? "..." : u.id === uid ? "Нельзя удалить себя" : "Удалить"}
                                </button>
                              </div>
                            </div>
                            <div className="mt-1 text-xs" style={{ color: THEME.muted }}>
                              {u.email || "—"}
                            </div>
                            <div className="mt-2 text-xs" style={{ color: THEME.muted }}>
                              UID: <span style={{ color: THEME.text }}>{u.id}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {usersTotal > USERS_PAGE_SIZE ? (
                        <div className="mt-5">
                          <PaginationBar
                            page={usersPage}
                            totalPages={Math.max(1, Math.ceil(usersTotal / USERS_PAGE_SIZE))}
                            onPageChange={setUsersPage}
                          />
                        </div>
                      ) : null}
                    </>
                  )}
                </>
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

                    <Field label="Остаток (stockQty)">
                      <Input
                        type="number"
                        value={draft.stockQty}
                        onChange={(e) => setDraft((p) => ({ ...p, stockQty: e.target.value }))}
                        placeholder="если пусто — без лимита"
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
