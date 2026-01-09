import React from "react";
import { Routes, Route } from "react-router-dom";
import AdminPage from "../pages/AdminPage";

import CatalogPage from "../pages/CatalogPage";
import PerfumePage from "../pages/PerfumePage";
import CartPage from "../pages/CartPage";
import FavoritesPage from "../pages/FavoritesPage";
import AuthPage from "../pages/AuthPage";

import AuthModal from "../components/AuthModal";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/perfumes/:id" element={<PerfumePage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/admin" element={<AdminPage />} />

      </Routes>

      <AuthModal />
    </>
  );
}
