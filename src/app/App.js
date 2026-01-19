import React from "react";
import { Routes, Route } from "react-router-dom";
import AdminPage from "../pages/AdminPage";

import CatalogPage from "../pages/CatalogPage";
import PerfumePage from "../pages/PerfumePage";
import CartPage from "../pages/CartPage";
import FavoritesPage from "../pages/FavoritesPage";
import AuthPage from "../pages/AuthPage";
import WholesalePage from "../pages/WholesalePage";
import DeliveryPage from "../pages/DeliveryPage";
import PaymentPage from "../pages/PaymentPage";
import AboutPage from "../pages/AboutPage";
import ContactsPage from "../pages/ContactsPage";

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
        <Route path="/wholesale" element={<WholesalePage />} />
        <Route path="/delivery" element={<DeliveryPage />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contacts" element={<ContactsPage />} />

      </Routes>

      <AuthModal />
    </>
  );
}
