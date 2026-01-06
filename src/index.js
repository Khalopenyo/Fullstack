import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App";
import { AuthProvider } from "./state/auth";
import { ShopProvider } from "./state/shop";
import "./output.css";
import "./responsive.css";


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
