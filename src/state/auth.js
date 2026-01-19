import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { guest, login, me, register, signOut } from "../services/authRepo";
import { getToken } from "../services/api";

const AuthContext = createContext(null);

function normalizeUser(raw) {
  if (!raw) return null;
  return {
    ...raw,
    uid: raw.uid || raw.id,
    isAnonymous: Boolean(raw.isAnonymous),
    isAdmin: Boolean(raw.isAdmin),
  };
}

function humanizeAuthError(e) {
  const msg = String(e?.message || "");
  if (msg.includes("invalid credentials")) return "Неверный email или пароль.";
  if (msg.includes("email already exists")) return "Этот email уже используется.";
  if (msg.includes("password too short")) return "Слишком слабый пароль (минимум 6 символов).";
  if (msg.includes("invalid email")) return "Некорректный email.";
  return msg || "Ошибка авторизации.";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    let alive = true;

    const init = async () => {
      setAuthReady(false);
      try {
        const token = getToken();
        if (token) {
          const current = await me();
          if (alive) setUser(normalizeUser(current));
        } else {
          const guestUser = await guest();
          if (alive) setUser(normalizeUser(guestUser));
        }
      } catch (e) {
        signOut();
        try {
          const guestUser = await guest();
          if (alive) setUser(normalizeUser(guestUser));
        } catch (guestErr) {
          if (alive) setErrorText(humanizeAuthError(guestErr));
        }
      } finally {
        if (alive) setAuthReady(true);
      }
    };

    init();

    return () => {
      alive = false;
    };
  }, []);

  const openAuthModal = () => {
    setErrorText("");
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setErrorText("");
    setAuthModalOpen(false);
  };

  const continueAsGuest = () => {
    closeAuthModal();
  };

  const signOutUser = async () => {
    setBusy(true);
    setErrorText("");
    try {
      signOut();
      const guestUser = await guest();
      setUser(normalizeUser(guestUser));
    } catch (e) {
      setErrorText(humanizeAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const signInEmail = async (email, password) => {
    setBusy(true);
    setErrorText("");
    try {
      const logged = await login(email, password);
      setUser(normalizeUser(logged));
      closeAuthModal();
    } catch (e) {
      setErrorText(humanizeAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const signUpEmail = async (email, password, displayName) => {
    setBusy(true);
    setErrorText("");
    try {
      const created = await register(email, password, displayName);
      setUser(normalizeUser(created));
      closeAuthModal();
    } catch (e) {
      setErrorText(humanizeAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const value = useMemo(
    () => ({
      user,
      authReady,
      busy,
      errorText,
      authModalOpen,
      openAuthModal,
      closeAuthModal,
      continueAsGuest,
      signInEmail,
      signUpEmail,
      signOutUser,
    }),
    [user, authReady, busy, errorText, authModalOpen]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
