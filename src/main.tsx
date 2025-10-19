// src/main.tsx
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
// Force CSS rebuild

// Providers
import AuthProvider from "@/providers/AuthProvider";

// Guards
import RequireAuth from "@/guards/RequireAuth";
import OptimizedProtectedRoute from "@/guards/OptimizedProtectedRoute";
import RequireStatic from "@/guards/RequireStatic";
import RequireStaticOrShowInfo from "@/guards/RequireStaticOrShowInfo";
import RequirePT from "@/guards/RequirePT";
import RequirePTOrTrial from "@/guards/RequirePTOrTrial";
import RequirePTOrShowPurchasePrompt from "@/guards/RequirePTOrShowPurchasePrompt";

// Debug page
const PTDebug = lazy(() => import("@/pages/PTDebug"));

// Access hook
import useAccess from "@/hooks/useAccess";
import { useAuth } from "@/hooks/useAuth";

// Layout
import App from "@/App";

// Public pages
import IndexPublic from "@/pages/IndexPublic";
import { AdminAccessHelper } from "@/components/AdminAccessHelper";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import Join from "@/pages/Join";
import PaymentSuccess from "@/pages/PaymentSuccess";
import Pricing from "@/pages/Pricing";
import TrialExpired from "@/pages/TrialExpired";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ChangePasswordPage from "@/pages/ChangePasswordPage";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import NotAuthorized from "@/pages/NotAuthorized";

// Auth-only public-ish
// Pricing functionality moved to PersonalTrainingPage

// Content pages (lazy loaded to reduce initial bundle)
const Programm = lazy(() => import("@/pages/Programm"));
const Harjutused = lazy(() => import("@/pages/Harjutused"));
const Kogukond = lazy(() => import("@/pages/Kogukond"));
const Konto = lazy(() => import("@/pages/Konto"));
const ReadsList = lazy(() => import("@/pages/reads/ReadsList"));
const ReadDetail = lazy(() => import("@/pages/reads/ReadDetail"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// Dynamic programs (lazy loaded)
const ProgramsList = lazy(() => import("@/pages/ProgramsList"));
const ProgramDetail = lazy(() => import("@/pages/ProgramDetail"));
const ModernWorkoutSession = lazy(() => import("@/pages/ModernWorkoutSession"));
const PersonalTrainingPage = lazy(() => import("@/pages/personal-training/PersonalTrainingPage"));
const PersonalTrainingStats = lazy(() => import("@/pages/PersonalTrainingStats"));

// Calculator and mindfulness pages (lazy loaded)
const CalculatorsPage = lazy(() => import("@/pages/calculators/CalculatorsPage"));
const BMICalculator = lazy(() => import("@/pages/calculators/BMICalculator"));
const OneRepMaxCalculator = lazy(() => import("@/pages/calculators/OneRepMaxCalculator"));
const EERCalculator = lazy(() => import("@/pages/calculators/EERCalculator"));
const MindfulnessPage = lazy(() => import("@/pages/MindfulnessPage"));
const ProgramInfoPage = lazy(() => import("@/pages/ProgramInfoPage"));

// Logged-in home (lazy loaded)
const Home = lazy(() => import("@/pages/Home"));

// Admin pages (lazy)
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const Analytics = lazy(() => import("@/pages/admin/Analytics"));
const PersonalTraining = lazy(() => import("@/pages/admin/PersonalTraining"));
const AdminProgram = lazy(() => import("@/pages/admin/AdminProgram"));
const ProgramEdit = lazy(() => import("@/pages/admin/ProgramEdit"));
const ProgramAnalytics = lazy(() => import("@/pages/admin/ProgramAnalytics"));
const ClientAnalytics = lazy(() => import("@/pages/admin/ClientAnalytics"));
const ClientSpecificAnalytics = lazy(() => import("@/pages/admin/ClientSpecificAnalytics"));
const TemplateDetail = lazy(() => import("@/pages/admin/TemplateDetail"));
const AdminArticles = lazy(() => import("@/pages/admin/ArticlesList"));
const AdminArticleForm = lazy(() => import("@/pages/admin/ArticleForm"));
const UserManagement = lazy(() => import("@/pages/admin/UserManagement"));
const ExerciseArchive = lazy(() => import("@/pages/admin/ExerciseArchive"));

// Training Journal
import TrainingJournal from "@/pages/TrainingJournal";

// Error boundary
import ErrorBoundary from "@/components/ErrorBoundary";

/** Inline admin guard that uses the unified access hook */
function RequireAdmin() {
  const { status, user } = useAuth();
  const { loading, isAdmin } = useAccess();
  const loc = useLocation();

  // Check admin access

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
                <Route path="/liitu-programmiga" element={<Join />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/trial-expired" element={<TrialExpired />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
              </Route>
              
              {/* ---------- AUTH SETUP ---------- */}
              <Route path="/admin-setup" element={<AdminAccessHelper />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* ---------- AUTH REQUIRED ROUTES ---------- */}
              <Route element={<RequireAuth />}>
                {/* ---------- ADMIN ROUTES ---------- */}
                <Route element={<App />}>
                  <Route element={<RequireAdmin />}>
                    <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
                    <Route path="/admin/analytics" element={
                      <Suspense fallback={<div className="p-6">Laen…</div>}>
                        <Analytics />
                      </Suspense>
                    } />
                    <Route path="/admin/support" element={
                      <Suspense fallback={<div className="p-6">Laen…</div>}>
                        <AdminDashboard />
                      </Suspense>
                    } />
                    <Route path="/admin/programs" element={
                      <Suspense fallback={<div className="p-6">Laen…</div>}>
                        <PersonalTraining />
                      </Suspense>
                    } />
                    <Route path="/admin/users" element={
                      <Suspense fallback={<div className="p-6">Laen…</div>}>
                        <UserManagement />
                      </Suspense>
                    } />
                    <Route path="/admin/articles" element={
                      <Suspense fallback={<div className="p-6">Laen…</div>}>
                        <AdminArticles />
                      </Suspense>
                    } />
                    <Route path="/admin/articles/new" element={
                      <Suspense fallback={<div className="p-6">Laen…</div>}>
                        <AdminArticleForm />
                      </Suspense>
                    } />
                    <Route path="/admin/articles/:id/edit" element={
                      <Suspense fallback={<div className="p-6">Laen…</div>}>
                        <AdminArticleForm />
                      </Suspense>
                    } />
                    <Route path="/admin/exercises" element={
                      <Suspense fallback={<div className="p-6">Laen…</div>}>
                        <ExerciseArchive />
                      </Suspense>
                    } />
                    <Route path="/admin/programs/:id" element={
                      <Suspense fallback={<div className="p-6">Laen…</div>}>
                        <AdminProgram />
                      </Suspense>
                    } />
                    <Route path="/admin/programs/:id/edit" element={
                      <Suspense fallback={<div className="p-6">Laen…</div>}>
                        <ProgramEdit />
                      </Suspense>
                    } />
                    <Route path="/admin/programs/:programId/analytics" element={
                      <Suspense fallback={<div className="p-6">Laen…</div>}>
                        <ProgramAnalytics />
                      </Suspense>
                    } />
                    <Route path="/admin/client-analytics" element={
                      <Suspense fallback={<div className="p-6">Laen…</div>}>
                        <ClientSpecificAnalytics />
                      </Suspense>
                    } />
                    <Route path="/admin/client-analytics/:userId" element={
                      <Suspense fallback={<div className="p-6">Laen…</div>}>
                        <ClientAnalytics />
                      </Suspense>
                    } />
                    <Route path="/admin/templates/:id" element={
                      <Suspense fallback={<div className="p-6">Laen…</div>}>
                        <TemplateDetail />
                      </Suspense>
                    } />
                  </Route>
                </Route>

                {/* ---------- LOGGED-IN HOME ---------- */}
                <Route element={<App />}>
                  <Route path="/home" element={
                    <Suspense fallback={<div className="p-6">Laen…</div>}>
                      <Home />
                    </Suspense>
                  } />
                </Route>

                {/* ---------- STATIC SUBSCRIPTION ROUTES ---------- */}
                <Route element={<RequireStatic />}>
                  <Route element={<App />}>
                    <Route path="/programm" element={
                      <Suspense fallback={<div className="p-6">Laen…</div>}>
                        <Programm />
                      </Suspense>
                    } />
                    <Route path="/harjutused" element={
                      <Suspense fallback={<div className="p-6">Laen…</div>}>
                        <Harjutused />
                      </Suspense>
                    } />
                    <Route path="/kogukond" element={
                      <Suspense fallback={<div className="p-6">Laen…</div>}>
                        <Kogukond />
                      </Suspense>
                    } />
                    <Route path="/konto" element={
                      <Suspense fallback={<div className="p-6">Laen…</div>}>
                        <Konto />
                      </Suspense>
                    } />
                    <Route path="/settings" element={<Navigate to="/konto" replace />} />
                    <Route path="/change-password" element={<ChangePasswordPage />} />
                    <Route path="/mindfulness" element={
                      <Suspense fallback={<div className="p-6">Laen…</div>}>
                        <MindfulnessPage />
                      </Suspense>
                    } />
                    <Route path="/kalkulaatorid" element={
                      <Suspense fallback={<div className="p-6">Laen…</div>}>
                        <CalculatorsPage />
                      </Suspense>
                    } />
                    <Route path="/kalkulaatorid/kmi" element={
                      <Suspense fallback={<div className="p-6">Laen…</div>}>
                        <BMICalculator />
                      </Suspense>
                    } />
                    <Route path="/kalkulaatorid/1km" element={
                      <Suspense fallback={<div className="p-6">Laen…</div>}>
                        <OneRepMaxCalculator />
                      </Suspense>
                    } />
                    <Route path="/kalkulaatorid/eer" element={
                      <Suspense fallback={<div className="p-6">Laen…</div>}>
                        <EERCalculator />
                      </Suspense>
                    } />
                  </Route>
                </Route>

                {/* ---------- PT SUBSCRIPTION ROUTES ---------- */}
                <Route element={<RequirePTOrTrial />}>
                  <Route element={<App />}>
                    <Route path="/personaaltreening" element={
                      <Suspense fallback={<div className="p-6">Laen…</div>}>
                        <PersonalTrainingPage />
                      </Suspense>
                    } />
                    <Route path="/teenused" element={
                      <Suspense fallback={<div className="p-6">Laen…</div>}>
                        <PersonalTrainingPage />
                      </Suspense>
                    } />
                    <Route element={<RequirePTOrShowPurchasePrompt />}>
                      <Route path="/programs" element={
                        <Suspense fallback={<div className="p-6">Laen…</div>}>
                          <ProgramsList />
                        </Suspense>
                      } />
                      <Route path="/programs/:programId" element={
                        <Suspense fallback={<div className="p-6">Laen…</div>}>
                          <ProgramDetail />
                        </Suspense>
                      } />
                      <Route path="/programs/stats" element={
                        <Suspense fallback={<div className="p-6">Laen…</div>}>
                          <PersonalTrainingStats />
                        </Suspense>
                      } />
                      <Route path="/programs/journal" element={<TrainingJournal />} />
                      <Route path="/workout/:programId/:dayId" element={
                        <Suspense fallback={<div className="p-6">Laen…</div>}>
                          <ModernWorkoutSession />
                        </Suspense>
                      } />
                      <Route path="/pt-debug" element={
                        <Suspense fallback={<div className="p-6">Loading debug...</div>}>
                          <PTDebug />
                        </Suspense>
                      } />
                    </Route>
                  </Route>
                </Route>

                {/* ---------- PUBLIC CONTENT (ARTICLES) ---------- */}
                <Route element={<App />}>
                  <Route path="/tervisetood" element={
                    <ErrorBoundary fallback={<div className="p-6 text-center"><h2 className="text-xl font-bold mb-2">Viga lehel</h2><p>Artiklite laadimise viga. Palun laadige leht uuesti.</p></div>}>
                      <Suspense fallback={<div className="p-6">Laen…</div>}>
                        <ReadsList />
                      </Suspense>
                    </ErrorBoundary>
                  } />
                  <Route path="/tervisetood/:slug" element={
                    <ErrorBoundary fallback={<div className="p-6 text-center"><h2 className="text-xl font-bold mb-2">Viga lehel</h2><p>Artikli laadimise viga. Palun laadige leht uuesti.</p></div>}>
                      <Suspense fallback={<div className="p-6">Laen…</div>}>
                        <ReadDetail />
                      </Suspense>
                    </ErrorBoundary>
                  } />
                  <Route path="/reads" element={<Navigate to="/tervisetood" replace />} />
                  <Route path="/reads/:slug" element={<Navigate to="/tervisetood" replace />} />
                  <Route path="/luhitekstid" element={<Navigate to="/tervisetood" replace />} />
                  <Route path="/lyhitekstid" element={<Navigate to="/tervisetood" replace />} />
                  <Route path="/lühitekstid" element={<Navigate to="/tervisetood" replace />} />
                </Route>

                {/* ---------- PROGRAM INFO (TRIAL USERS) ---------- */}
                <Route element={<App />}>
                  <Route path="/programm-info" element={
                    <Suspense fallback={<div className="p-6">Laen…</div>}>
                      <ProgramInfoPage />
                    </Suspense>
                  } />
                </Route>
              </Route>

              {/* ---------- ERROR ROUTES ---------- */}
              <Route element={<App />}>
                <Route path="/not-authorized" element={
                  <Suspense fallback={<div className="p-6">Laen…</div>}>
                    <NotAuthorized />
                  </Suspense>
                } />
                <Route path="*" element={
                  <Suspense fallback={<div className="p-6">Laen…</div>}>
                    <NotFound />
                  </Suspense>
                } />
              </Route>
            </Routes>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}
