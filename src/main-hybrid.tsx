import React, { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import "@/index.css";

// Providers
import AuthProvider from "@/providers/AuthProvider";

// Guards - Add these gradually
import RequireAuth from "@/guards/RequireAuth";

// Access hook
import useAccess from "@/hooks/useAccess";
import { useAuth } from "@/hooks/useAuth";

// Layout
import App from "@/App";

// Public pages
import IndexPublic from "@/pages/IndexPublic";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";

// Logged-in home (lazy loaded)
const Home = lazy(() => import("@/pages/Home"));

// Error boundary
import ErrorBoundary from "@/components/ErrorBoundary";

/** Inline admin guard that uses the unified access hook */
function RequireAdmin() {
  const { status, user } = useAuth();
  const { loading, isAdmin } = useAccess();
  const loc = useLocation();

  if (status === "loading" || loading) {
    return (
      <div className="min-h-[40vh] grid place-items-center p-6 text-sm text-muted-foreground">
        Kontrollin ligipääsu…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: loc }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/not-authorized" replace />;
  }

  return <Outlet />;
}

const container = document.getElementById("root");

if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
            <Routes>
              {/* ---------- PUBLIC ROUTES ---------- */}
              <Route element={<App />}>
                <Route path="/" element={<IndexPublic />} />
              </Route>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />

              {/* ---------- AUTH REQUIRED ---------- */}
              <Route element={<RequireAuth />}>
                <Route element={<App />}>
                  <Route path="/home" element={
                    <Suspense fallback={<div className="p-6">Laen…</div>}>
                      <Home />
                    </Suspense>
                  } />
                </Route>
              </Route>

              {/* ---------- OTHER ---------- */}
              <Route element={<App />}>
                <Route path="*" element={<IndexPublic />} />
              </Route>
            </Routes>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}
