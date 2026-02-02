import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { fetchPerfumesWithDiagnostics } from "../services/perfumesRepo";
import { isPrerender } from "../lib/prerender";
import { loadCart, saveCart } from "../services/cartRepo";
import { addFavorite, loadFavorites, removeFavorite } from "../services/favoritesRepo";
import { useAuth } from "./auth";

const ShopContext = createContext(null);

function readLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function migrateGuestKey(legacyKey, guestKey) {
  try {
    const guestRaw = localStorage.getItem(guestKey);
    if (guestRaw != null) return;
    const legacyRaw = localStorage.getItem(legacyKey);
    if (legacyRaw == null) return;
    localStorage.setItem(guestKey, legacyRaw);
  } catch {
    // ignore storage errors
  }
}

function userCartKey(uid) {
  return uid ? `cart:user:${uid}` : "cart:user";
}

function userFavoritesKey(uid) {
  return uid ? `favorites:user:${uid}` : "favorites:user";
}

export function ShopProvider({ children }) {
  const { authReady, user } = useAuth();

  const guestCartKey = "cart:guest";
  const guestFavoritesKey = "favorites:guest";

  const [cart, setCart] = useState(() => readLS(guestCartKey, [])); // [{id, volume, mix, qty}]
  const [favorites, setFavorites] = useState(() => readLS(guestFavoritesKey, [])); // [id]

  const [perfumes, setPerfumes] = useState([]);
  const [loadingPerfumes, setLoadingPerfumes] = useState(true);
  const [perfumesError, setPerfumesError] = useState(null);
  const [perfumesDiagnostics, setPerfumesDiagnostics] = useState(null);
  const [guestHydrated, setGuestHydrated] = useState(false);
  const prerenderSignaled = useRef(false);

  const isRealUser = Boolean(user && !user.isAnonymous);

  useEffect(() => {
    if (!authReady) return;
    if (isRealUser) return;
    if (!guestHydrated) return;
    localStorage.setItem(guestCartKey, JSON.stringify(cart));
  }, [authReady, isRealUser, guestHydrated, cart]);

  useEffect(() => {
    if (!authReady) return;
    if (isRealUser) return;
    if (!guestHydrated) return;
    localStorage.setItem(guestFavoritesKey, JSON.stringify(favorites));
  }, [authReady, isRealUser, guestHydrated, favorites]);

  useEffect(() => {
    if (!authReady) return;
    if (!isRealUser) {
      migrateGuestKey("cart", guestCartKey);
      migrateGuestKey("favorites", guestFavoritesKey);
      setGuestHydrated(false);
      setCart(readLS(guestCartKey, []));
      setFavorites(readLS(guestFavoritesKey, []));
      setGuestHydrated(true);
      return;
    }
    const localCart = readLS(userCartKey(user?.uid), []);
    const localFavorites = readLS(userFavoritesKey(user?.uid), []);
    if (localCart.length) setCart(localCart);
    if (localFavorites.length) setFavorites(localFavorites);
    setGuestHydrated(false);
    let alive = true;
    loadCart(user.uid)
      .then((data) => {
        if (!alive) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        if (items.length) {
          setCart(items);
        } else if (localCart.length) {
          setCart(localCart);
          saveCart(user.uid, localCart).catch((e) => console.error(e));
        } else {
          setCart([]);
        }
      })
      .catch((e) => console.error(e));
    loadFavorites(user.uid)
      .then((ids) => {
        if (!alive) return;
        const list = Array.isArray(ids) ? ids : [];
        if (list.length) {
          setFavorites(list);
        } else if (localFavorites.length) {
          setFavorites(localFavorites);
          Promise.all(
            localFavorites.map((id) => addFavorite(user.uid, id).catch((e) => console.error(e)))
          ).catch(() => {});
        } else {
          setFavorites([]);
        }
      })
      .catch((e) => console.error(e));
    return () => {
      alive = false;
    };
  }, [authReady, isRealUser, user?.uid]);

  useEffect(() => {
    if (!authReady || !isRealUser || !user?.uid) return;
    saveCart(user.uid, cart).catch((e) => console.error(e));
  }, [authReady, isRealUser, user?.uid, cart]);

  useEffect(() => {
    if (!authReady || !isRealUser || !user?.uid) return;
    localStorage.setItem(userCartKey(user.uid), JSON.stringify(cart));
  }, [authReady, isRealUser, user?.uid, cart]);

  useEffect(() => {
    if (!authReady || !isRealUser || !user?.uid) return;
    localStorage.setItem(userFavoritesKey(user.uid), JSON.stringify(favorites));
  }, [authReady, isRealUser, user?.uid, favorites]);

  useEffect(() => {
    if (!authReady) return;
    if (isPrerender()) return;
    let alive = true;

    setLoadingPerfumes(true);
    setPerfumesError(null);

    fetchPerfumesWithDiagnostics()
      .then(({ perfumes: data, issues, summary }) => {
        if (!alive) return;
        setPerfumes(Array.isArray(data) ? data : []);
        setPerfumesDiagnostics({ issues: issues || [], summary: summary || null });
      })
      .catch((e) => {
        console.error(e);
        if (!alive) return;
        setPerfumesError(e);
        setPerfumes([]);
        setPerfumesDiagnostics(null);
      })
      .finally(() => {
        if (!alive) return;
        setLoadingPerfumes(false);
      });

    return () => {
      alive = false;
    };
  }, [authReady]);

  useEffect(() => {
    if (prerenderSignaled.current) return;
    if (!authReady) return;
    if (typeof document === "undefined") return;
    const injected = window.__PRERENDER_INJECTED && window.__PRERENDER_INJECTED.prerender;
    const isHeadless = String(navigator?.userAgent || "").includes("HeadlessChrome");
    if (!injected && !isHeadless) return;
    if (!loadingPerfumes) {
      prerenderSignaled.current = true;
      document.dispatchEvent(new Event("prerender-ready"));
      return;
    }
    const timer = setTimeout(() => {
      if (prerenderSignaled.current) return;
      prerenderSignaled.current = true;
      document.dispatchEvent(new Event("prerender-ready"));
    }, 6000);
    return () => clearTimeout(timer);
  }, [authReady, loadingPerfumes]);

  const perfumesById = useMemo(() => {
    const m = {};
    for (const p of perfumes) m[p.id] = p;
    return m;
  }, [perfumes]);

  const api = useMemo(() => {
    const addToCart = (id, volume, qty = 1, mix = "60/40") => {
      setCart((prev) => {
        const targetMix = mix || "60/40";
        const idx = prev.findIndex(
          (x) => x.id === id && x.volume === volume && (x.mix || "60/40") === targetMix
        );
        if (idx !== -1) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], qty: copy[idx].qty + qty };
          return copy;
        }
        return [...prev, { id, volume, mix: targetMix, qty }];
      });
    };

    const removeFromCart = (id, volume, mix = "60/40") => {
      const targetMix = mix || "60/40";
      setCart((prev) =>
        prev.filter((x) => !(x.id === id && x.volume === volume && (x.mix || "60/40") === targetMix))
      );
    };

    const setQty = (id, volume, qty, mix = "60/40") => {
      const q = Math.max(1, Number(qty) || 1);
      const targetMix = mix || "60/40";
      setCart((prev) =>
        prev.map((x) =>
          x.id === id && x.volume === volume && (x.mix || "60/40") === targetMix ? { ...x, qty: q } : x
        )
      );
    };

    const toggleFavorite = (id) => {
      if (isRealUser && user?.uid) {
        setFavorites((prev) => {
          const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
          if (prev.includes(id)) {
            removeFavorite(user.uid, id).catch((e) => console.error(e));
          } else {
            addFavorite(user.uid, id).catch((e) => console.error(e));
          }
          return next;
        });
        return;
      }
      setFavorites((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    return {
      cart,
      favorites,
      perfumes,
      perfumesById,
      loadingPerfumes,
      perfumesError,
      perfumesDiagnostics,
      addToCart,
      removeFromCart,
      setQty,
      toggleFavorite,
    };
  }, [cart, favorites, perfumes, perfumesById, loadingPerfumes, perfumesError, perfumesDiagnostics, isRealUser, user?.uid]);

  return <ShopContext.Provider value={api}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used within ShopProvider");
  return ctx;
}
