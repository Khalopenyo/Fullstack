import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App";
import { AuthProvider } from "./state/auth";
import { ShopProvider } from "./state/shop";
import "./output.css";
import "./responsive.css";

// Work around ResizeObserver loop warnings from 3rd‑party components.
if (typeof window !== "undefined" && "ResizeObserver" in window) {
  const NativeResizeObserver = window.ResizeObserver;
  window.ResizeObserver = class extends NativeResizeObserver {
    constructor(callback) {
      super((entries, observer) => {
        window.requestAnimationFrame(() => callback(entries, observer));
      });
    }
  };
}

// Suppress noisy ResizeObserver loop warnings in dev.
const _consoleError = console.error;
const _consoleWarn = console.warn;
const isResizeObserverWarning = (msg) =>
  msg && String(msg).includes("ResizeObserver loop completed with undelivered notifications");
console.error = (...args) => {
  if (isResizeObserverWarning(args[0])) return;
  _consoleError(...args);
};
console.warn = (...args) => {
  if (isResizeObserverWarning(args[0])) return;
  _consoleWarn(...args);
};
const suppressResizeObserver = (e) => {
  if (isResizeObserverWarning(e?.message)) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }
};
window.addEventListener("error", suppressResizeObserver, true);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <AuthProvider>
      <ShopProvider>
        <App />
      </ShopProvider>
    </AuthProvider>
  </BrowserRouter>
);
