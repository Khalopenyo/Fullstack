import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase/firebase";

const AuthContext = createContext(null);

function humanizeAuthError(e) {
  const code = e?.code || "";
  if (code.includes("auth/invalid-email")) return "Некорректный email.";
  if (code.includes("auth/user-not-found")) return "Пользователь не найден.";
  if (code.includes("auth/wrong-password")) return "Неверный пароль.";
  if (code.includes("auth/email-already-in-use")) return "Этот email уже используется.";
  if (code.includes("auth/weak-password")) return "Слишком слабый пароль (минимум 6 символов).";
  if (code.includes("auth/operation-not-allowed")) return "Проверь в Firebase Console: включён ли Email/Password Sign-in.";
  return e?.message || "Ошибка авторизации.";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorText, setErrorText] = useState("");

  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);
      setAuthReady(true);
      // Авто-гость, чтобы Firestore rules и чтение каталога работали предсказуемо
      if (!u) {
        try {
          await signInAnonymously(auth);
        } catch (e) {
          setErrorText(humanizeAuthError(e));
        }
      }
    });
    return () => unsub();
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
    // если уже гость или уже залогинен — просто закрываем
    closeAuthModal();
  };

  const signOutUser = async () => {
    setBusy(true);
    setErrorText("");
    try {
      await signOut(auth);
      // onAuthStateChanged сам поднимет нового гостя
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
      await signInWithEmailAndPassword(auth, email, password);
      closeAuthModal();
    } catch (e) {
      setErrorText(humanizeAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const signUpEmail = async (email, password) => {
    setBusy(true);
    setErrorText("");
    try {
      const current = auth.currentUser;
      if (current?.isAnonymous) {
        const cred = EmailAuthProvider.credential(email, password);
        await linkWithCredential(current, cred);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
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
