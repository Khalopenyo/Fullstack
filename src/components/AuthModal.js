import React from "react";
import { X, User, LogOut } from "lucide-react";
import { THEME } from "../data/theme";
import { useAuth } from "../state/auth";

function Field({ label, type = "text", value, onChange, placeholder }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs" style={{ color: THEME.muted2 }}>
        {label}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
        style={{
          borderColor: THEME.border2,
          background: "rgba(255,255,255,0.03)",
          color: THEME.text,
        }}
      />
    </label>
  );
}

export default function AuthModal() {
  const {
    user,
    busy,
    errorText,
    authModalOpen,
    closeAuthModal,
    continueAsGuest,
    signInEmail,
    signUpEmail,
    signOutUser,
  } = useAuth();

  const [mode, setMode] = React.useState("signin"); // signin | signup
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  React.useEffect(() => {
    if (authModalOpen) {
      setMode("signin");
      setEmail("");
      setPassword("");
    }
  }, [authModalOpen]);

  if (!authModalOpen) return null;

  const isAuthed = !!user;
  const isAnon = !!user?.isAnonymous;
  const title = mode === "signup" ? "Регистрация" : "Вход";

  const authLabel = !isAuthed ? "—" : isAnon ? "Гость" : user?.email || "Аккаунт";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.65)" }}
        onClick={closeAuthModal}
      />
      <div
        className="relative w-full max-w-md rounded-3xl border p-5 shadow-2xl"
        style={{ borderColor: "#333", background: "rgba(12,12,16,0.82)", color: "#e1e1e1ff" }}

      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User size={18} />
            <div className="text-base font-semibold">{title}</div>
          </div>
          <button
            type="button"
            className="rounded-full border p-2"
            style={{ borderColor: THEME.border2 }}
            onClick={closeAuthModal}
            aria-label="Закрыть"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-2 text-xs" style={{ color: THEME.muted2 }}>
          Текущая сессия: <span style={{ color: THEME.text }}>{authLabel}</span>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className={"flex-1 rounded-full border px-4 py-2 text-sm " + (mode === "signin" ? "bg-white/[0.06]" : "")}
            style={{ borderColor: THEME.border2, color: THEME.text }}
            onClick={() => setMode("signin")}
            disabled={busy}
          >
            Вход
          </button>
          <button
            type="button"
            className={"flex-1 rounded-full border px-4 py-2 text-sm " + (mode === "signup" ? "bg-white/[0.06]" : "")}
            style={{ borderColor: THEME.border2, color: THEME.text }}
            onClick={() => setMode("signup")}
            disabled={busy}
          >
            Регистрация
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" />
          <Field label="Пароль" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
        </div>

        {errorText ? (
          <div className="mt-3 rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: "rgba(255,120,120,0.35)" }}>
            {errorText}
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            className="w-full rounded-full px-5 py-3 text-sm font-semibold"
            style={{ background: THEME.accent, color: "#0B0B0F" }}
            disabled={busy}
            onClick={() => {
              const e = (email || "").trim();
              if (!e || password.length < 6) return;
              if (mode === "signup") signUpEmail(e, password);
              else signInEmail(e, password);
            }}
          >
            {mode === "signup" ? "Создать аккаунт" : "Войти"}
          </button>

          <button
            type="button"
            className="w-full rounded-full border px-5 py-3 text-sm"
            style={{ borderColor: THEME.border2, color: THEME.text }}
            disabled={busy}
            onClick={continueAsGuest}
          >
            Продолжить как гость
          </button>

          {isAuthed && !isAnon ? (
            <button
              type="button"
              className="w-full rounded-full border px-5 py-3 text-sm inline-flex items-center justify-center gap-2"
              style={{ borderColor: THEME.border2, color: THEME.text }}
              disabled={busy}
              onClick={signOutUser}
            >
              <LogOut size={16} /> Выйти
            </button>
          ) : null}
        </div>

        <div className="mt-4 text-xs" style={{ color: THEME.muted2 }}>
          Если вход/регистрация не работают: проверь в Firebase Console, что включён способ авторизации Email/Password.
        </div>
      </div>
    </div>
  );
}
