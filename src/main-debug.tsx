import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "@/index.css";

// Test with minimal imports first
import AuthProvider from "@/providers/AuthProvider";
import App from "@/App";
import IndexPublic from "@/pages/IndexPublic";
import LoginPage from "@/pages/LoginPage";

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
            <Route path="*" element={<IndexPublic />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}
