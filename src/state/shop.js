import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchPerfumesWithDiagnostics } from "../services/perfumesRepo";
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

export function ShopProvider({ children }) {
  const { authReady } = useAuth();

  const [cart, setCart] = useState(() => readLS("cart", [])); // [{id, volume, qty}]
  const [favorites, setFavorites] = useState(() => readLS("favorites", [])); // [id]

  const [perfumes, setPerfumes] = useState([]);
  const [loadingPerfumes, setLoadingPerfumes] = useState(true);
  const [perfumesError, setPerfumesError] = useState(null);
  const [perfumesDiagnostics, setPerfumesDiagnostics] = useState(null);

  useEffect(() => localStorage.setItem("cart", JSON.stringify(cart)), [cart]);
  useEffect(() => localStorage.setItem("favorites", JSON.stringify(favorites)), [favorites]);

  useEffect(() => {
    if (!authReady) return;
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

  const perfumesById = useMemo(() => {
    const m = {};
    for (const p of perfumes) m[p.id] = p;
    return m;
  }, [perfumes]);

  const api = useMemo(() => {
    const addToCart = (id, volume, qty = 1) => {
      setCart((prev) => {
        const idx = prev.findIndex((x) => x.id === id && x.volume === volume);
        if (idx !== -1) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], qty: copy[idx].qty + qty };
          return copy;
        }
        return [...prev, { id, volume, qty }];
      });
    };

    const removeFromCart = (id, volume) => {
      setCart((prev) => prev.filter((x) => !(x.id === id && x.volume === volume)));
    };

    const setQty = (id, volume, qty) => {
      const q = Math.max(1, Number(qty) || 1);
      setCart((prev) =>
        prev.map((x) => (x.id === id && x.volume === volume ? { ...x, qty: q } : x))
      );
    };

    const toggleFavorite = (id) => {
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
  }, [cart, favorites, perfumes, perfumesById, loadingPerfumes, perfumesError, perfumesDiagnostics]);

  return <ShopContext.Provider value={api}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used within ShopProvider");
  return ctx;
}
