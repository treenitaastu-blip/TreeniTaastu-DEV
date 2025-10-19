import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "@/index.css";

// Providers
import AuthProvider from "@/providers/AuthProvider";

// Simple App component
import App from "@/App";

// Basic routes
import IndexPublic from "@/pages/IndexPublic";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import Home from "@/pages/Home";

const container = document.getElementById("root");

if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<IndexPublic />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/home" element={<Home />} />
            <Route path="*" element={<IndexPublic />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}
