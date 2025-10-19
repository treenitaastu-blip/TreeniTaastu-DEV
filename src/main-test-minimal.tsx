import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "@/index.css";

const container = document.getElementById("root");

if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<div>Test App</div>} />
          <Route path="*" element={<div>Test App</div>} />
        </Routes>
      </BrowserRouter>
    </React.StrictMode>
  );
}
