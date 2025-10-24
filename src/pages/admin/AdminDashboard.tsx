// src/pages/admin/AdminDashboard.tsx
import { lazy, Suspense, useMemo } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { BarChart3, ListChecks, Users, MessageCircle, TrendingUp } from "lucide-react";
import { SupportChatDashboard } from "@/components/admin/SupportChatDashboard";
import { SmartProgressDashboard } from "@/components/smart-progression/SmartProgressDashboard";

// Lazy-load heavy analytics chunk
const Analytics = lazy(() => import("./Analytics"));

/**
 * AdminDashboard
 * Tabbed hub for admin tools. Analytics renders here on /admin.
 * Other tabs link to their existing routes so the hub feels cohesive.
 */
export default function AdminDashboard() {
  const location = useLocation();

  const tabs = useMemo(
    () => [
      {
        key: "analytics" as const,
        label: "Analytics",
        icon: BarChart3,
        path: "/admin", // default landing
        isActive: (pathname: string) =>
          pathname === "/admin" || pathname.startsWith("/admin/analytics"),
        renderHere: true, // only this tab renders inside the dashboard shell
      },
      {
        key: "support" as const,
        label: "Kliendiabi",
        icon: MessageCircle,
        path: "/admin/support",
        isActive: (pathname: string) => pathname.startsWith("/admin/support"),
        renderHere: true,
      },
      {
        key: "smart-progression" as const,
        label: "Smart Progress",
        icon: TrendingUp,
        path: "/admin/smart-progression",
        isActive: (pathname: string) => pathname.startsWith("/admin/smart-progression"),
        renderHere: true,
      },
      {
        key: "users" as const,
        label: "Kasutajad",
        icon: Users,
        path: "/admin/users",
        isActive: (pathname: string) => pathname.startsWith("/admin/users"),
        renderHere: false,
      },
      {
        key: "programs" as const,
        label: "Personaaltreening",
        icon: ListChecks,
        path: "/admin/programs",
        isActive: (pathname: string) => pathname.startsWith("/admin/programs"),
        renderHere: false,
      },
      {
        key: "admin-setup" as const,
        label: "Admin Setup",
        icon: Users,
        path: "/admin-setup",
        isActive: (pathname: string) => pathname.startsWith("/admin-setup"),
        renderHere: false,
      },
    ],
    []
  );

  const active =
    tabs.find((t) => t.isActive(location.pathname)) ?? tabs[0];
  const ActiveIcon = active.icon;

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
      {/* Header + tab strip */}
      <header className="mb-4 sm:mb-6">
        <div className="flex items-center gap-3 mb-3 sm:mb-4">
          <ActiveIcon className="h-5 w-5 text-primary" aria-hidden="true" />
          <h1 className="text-lg sm:text-xl font-semibold">
            Admin – {active.label}
          </h1>
        </div>

        <nav
          className="-mx-1 sm:-mx-2 overflow-x-auto pb-2"
          aria-label="Admin sektsioonid"
        >
          <div className="flex min-w-max items-center gap-1 sm:gap-2 px-1 sm:px-2">
            {tabs.map(({ key, label, icon: Icon, path }) => (
              <NavLink
                key={key}
                to={path}
                end={path === "/admin"}
                className={({ isActive }) =>
                  [
                    "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs sm:text-sm whitespace-nowrap transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground",
                  ].join(" ")
                }
                aria-current={
                  (path === "/admin" && location.pathname === "/admin") ||
                  location.pathname.startsWith(path)
                    ? "page"
                    : undefined
                }
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="hidden xs:inline sm:inline">{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      {/* Content: render Analytics locally; other tabs navigate away */}
      <section className="rounded-2xl border bg-card p-3 sm:p-4 shadow-sm">
        {active.renderHere ? (
          <Suspense
            fallback={
              <div className="h-32 animate-pulse rounded-md bg-muted" />
            }
          >
            {active.key === "analytics" && <Analytics />}
            {active.key === "support" && <SupportChatDashboard />}
            {active.key === "smart-progression" && <SmartProgressDashboard />}
          </Suspense>
        ) : null}
      </section>

      {/* Keep for future nested admin routes if needed */}
      <Outlet />
    </div>
  );
}