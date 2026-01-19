import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App";
import { AuthProvider } from "./state/auth";
import { ShopProvider } from "./state/shop";
import "./output.css";
import "./responsive.css";

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
window.addEventListener("error", (e) => {
  if (isResizeObserverWarning(e?.message)) {
    e.preventDefault();
  }
});

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
