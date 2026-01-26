import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { THEME } from "../data/theme";
import { useAuth } from "../state/auth";

function isValidEmail(value) {
  const v = String(value || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isValidPassword(value) {
  return String(value || "").length >= 6;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { user, busy, errorText, signInEmail, signUpEmail, signOutUser } = useAuth();

  const [mode, setMode] = React.useState("signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");

  const isAuthed = !!user;
  const isAnon = !!user?.isAnonymous;

  const authLabel = !isAuthed ? "—" : isAnon ? "Гость" : user?.email || "Аккаунт";
  const emailOk = isValidEmail(email);
  const passwordOk = isValidPassword(password);
  const canSubmit = emailOk && passwordOk;

  return (
    <div className="min-h-screen p-6" style={{ background: THEME.bg, color: THEME.text }}>
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-sm underline" style={{ color: THEME.muted2 }}>
            ← В каталог
          </Link>
          <div className="text-xs" style={{ color: THEME.muted2 }}>
            Сессия: <span style={{ color: THEME.text }}>{authLabel}</span>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border p-5" style={{ borderColor: THEME.border2, background: THEME.bg2 }}>
          <div className="text-lg font-semibold">{mode === "signup" ? "Регистрация" : "Вход"}</div>

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
            {mode === "signup" ? (
              <label className="block">
                <div className="mb-1 text-xs" style={{ color: THEME.muted2 }}>
                  Имя
                </div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                  style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.03)", color: THEME.text }}
                  placeholder="Как к вам обращаться?"
                />
              </label>
            ) : null}
            <label className="block">
              <div className="mb-1 text-xs" style={{ color: THEME.muted2 }}>
                Email
              </div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.03)", color: THEME.text }}
                placeholder="you@example.com"
              />
            </label>

            <label className="block">
              <div className="mb-1 text-xs" style={{ color: THEME.muted2 }}>
                Пароль
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                style={{ borderColor: THEME.border2, background: "rgba(255,255,255,0.03)", color: THEME.text }}
                placeholder="••••••••"
              />
            </label>
          </div>

          {errorText ? (
            <div className="mt-3 rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: "rgba(255,120,120,0.35)" }}>
              {errorText}
            </div>
          ) : null}
          {!errorText && (email || password) && !canSubmit ? (
            <div className="mt-3 rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: "rgba(255,200,120,0.35)" }}>
              Укажи корректный email и пароль минимум 6 символов.
            </div>
          ) : null}

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
            className="w-full rounded-full px-5 py-3 text-sm font-semibold"
            style={{ background: THEME.accent, color: "#0B0B0F" }}
            disabled={busy || !canSubmit}
            onClick={async () => {
              const e = (email || "").trim();
              if (!emailOk || !passwordOk) return;
              if (mode === "signup") await signUpEmail(e, password, name.trim());
              else await signInEmail(e, password);
            }}
          >
              {mode === "signup" ? "Создать аккаунт" : "Войти"}
            </button>

            {isAuthed && !isAnon ? (
              <button
                type="button"
                className="w-full rounded-full border px-5 py-3 text-sm"
                style={{ borderColor: THEME.border2, color: THEME.text }}
                disabled={busy}
                onClick={signOutUser}
              >
                Выйти
              </button>
            ) : null}

            <button
              type="button"
              className="w-full rounded-full border px-5 py-3 text-sm"
              style={{ borderColor: THEME.border2, color: THEME.text }}
              onClick={() => navigate("/")}
              disabled={busy}
            >
              Продолжить без входа
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
