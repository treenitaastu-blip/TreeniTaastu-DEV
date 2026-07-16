// src/components/Header.tsx
import { useEffect, useRef, useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  LogOut,
  User as UserIcon,
  Shield,
  ChevronDown,
  BarChart3,
  Users2,
  Users,
  BookOpen,
  Calculator,
  Activity,
  MessageCircle,
  Clock,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import useAccess from "@/hooks/useAccess";
import { useDropdownManager } from "@/contexts/DropdownManager";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import "@/styles/public-auth.css";

const HIDE_ON_PATHS = ["/login", "/signup"];

type NavItem = { to: string; label: string; show?: boolean };

export default function Header() {
  const { user } = useAuth();
  const { loading: accessLoading, isAdmin, canStatic } = useAccess();
  const { closeAllDropdowns } = useDropdownManager();
  const trialStatus = useTrialStatus();

  const [open, setOpen] = useState(false);           // mobile drawer
  const [adminOpen, setAdminOpen] = useState(false); // mobile "Admin" accordion
  const [ptOpen, setPtOpen] = useState(false);       // mobile "PT" accordion
  const [adminMenuOpen, setAdminMenuOpen] = useState(false); // desktop dropdown
  const [ptMenuOpen, setPtMenuOpen] = useState(false); // PT dropdown
  const [isHeaderVisible, setIsHeaderVisible] = useState(true); // mobile header visibility
  const [lastScrollY, setLastScrollY] = useState(0);
  const adminMenuRef = useRef<HTMLDivElement | null>(null);
  const ptMenuRef = useRef<HTMLDivElement | null>(null);
  const loc = useLocation();

  // Close menus on route change
  useEffect(() => {
    setOpen(false);
    setAdminOpen(false);
    setPtOpen(false);
    setAdminMenuOpen(false);
    setPtMenuOpen(false);
    closeAllDropdowns();
  }, [loc.pathname, closeAllDropdowns]);

  // Mobile header scroll behavior
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Only apply on mobile screens (width < 768px)
      if (window.innerWidth >= 768) {
        setIsHeaderVisible(true);
        return;
      }
      
      // Hide header when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsHeaderVisible(false);
      } else if (currentScrollY < lastScrollY || currentScrollY <= 100) {
        setIsHeaderVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Close dropdowns on outside click / Escape
  useEffect(() => {
    if (!adminMenuOpen && !ptMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target as Node)) {
        setAdminMenuOpen(false);
      }
      if (ptMenuRef.current && !ptMenuRef.current.contains(e.target as Node)) {
        setPtMenuOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAdminMenuOpen(false);
        setPtMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [adminMenuOpen, ptMenuOpen]);

  // Main nav (show links when access is resolved and user has access OR is admin)
  const nav: NavItem[] = [
    { to: user ? "/home" : "/", label: "Avaleht", show: true },
    ...(user
      ? [
          { to: "/programm", label: "Programm", show: !accessLoading && (canStatic || isAdmin) },
          { to: "/harjutused", label: "Harjutused", show: !accessLoading && (canStatic || isAdmin) },
          { to: "/tervisetood", label: "Tervisetõed", show: !accessLoading && (canStatic || isAdmin) },
          { to: "/mindfulness", label: "Hingamine", show: !accessLoading && (canStatic || isAdmin) },
          { to: "/pricing", label: "Hinnad", show: !accessLoading && !canStatic && !isAdmin },
        ]
      : []),
  ].filter((n) => n.show !== false);

  const linkBase = "tt-app-navlink";
  const linkActive = "is-active";
  const linkInactive = "";

  if (HIDE_ON_PATHS.includes(loc.pathname)) return null;

  if (!user && loc.pathname === "/") {
    return (
      <header className="tt-public-nav">
        <Link to="/" className="tt-public-nav__wordmark" aria-label="TreeniTaastu avaleht">
          <span className="tt-public-nav__mark">T</span>
          <span>TREENI &amp; TAASTU</span>
        </Link>
        <Link to="/login" className="tt-public-nav__action">Logi sisse</Link>
      </header>
    );
  }

  return (
    <>
      {/* Header Container - starts at very top of viewport */}
      <div className="tt-app-header">
        {/* Safe area background to prevent content bleeding */}
        <div className="tt-app-header__safe" style={{ height: 'env(safe-area-inset-top, 0px)' }} />
        
        {/* Desktop Header */}
        <header className="tt-app-header__desktop overflow-visible hidden md:block">
          <div className="tt-app-header__inner overflow-visible">
            {/* Logo → goes to /home if logged in, else / */}
            <Link
              to={user ? "/home" : "/"}
              className="tt-app-brand"
              aria-label="Avaleht"
            >
              <span className="tt-app-brand__mark">
                T
              </span>
              <span className="hidden sm:inline">
                TREENI &amp; TAASTU
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="tt-app-navlinks hidden md:flex overflow-visible" aria-label="Põhinavigatsioon" style={{ position: 'static' }}>
              {nav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.to === (user ? "/home" : "/")}
                  className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
                >
                  {n.label}
                </NavLink>
              ))}

              {user && !accessLoading && (
                <div className="relative overflow-visible" ref={ptMenuRef} style={{ zIndex: 1000 }}>
                  <button
                    type="button"
                    onClick={() => setPtMenuOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={ptMenuOpen}
                    className={`${linkBase} ${linkInactive} inline-flex items-center gap-1`}
                  >
                    <Activity className="h-4 w-4" />
                    Treeningud
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </button>
                  {ptMenuOpen && (
                    <div
                      role="menu"
                      className="tt-app-menu"
                      style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        right: 0, 
                        zIndex: 1001 
                      }}
                    >
                      <PTMenuItems onItem={() => setPtMenuOpen(false)} />
                    </div>
                  )}
                </div>
              )}

              {/* Admin dropdown (desktop) */}
              {user && isAdmin && (
                <div className="relative overflow-visible" ref={adminMenuRef} style={{ zIndex: 1000 }}>
                  <button
                    type="button"
                    onClick={() => setAdminMenuOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={adminMenuOpen}
                    className={`${linkBase} ${linkInactive} inline-flex items-center gap-1`}
                  >
                    <Shield className="h-4 w-4" />
                    Admin
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </button>
                  {adminMenuOpen && (
                    <div
                      role="menu"
                      className="tt-app-menu"
                      style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        right: 0, 
                        zIndex: 1001 
                      }}
                    >
                      <AdminMenuItems onItem={() => setAdminMenuOpen(false)} />
                    </div>
                  )}
                </div>
              )}
            </nav>

            {/* Right cluster */}
            <div className="hidden items-center gap-2 md:flex overflow-visible">
              {/* Grace Period Badge (Desktop) */}
              {user && trialStatus.isInGracePeriod && trialStatus.hoursRemainingInGrace !== null && (
                <Link
                  to="/pricing"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 hover:scale-105 motion-reduce:hover:scale-100 bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-200 border border-orange-300 dark:border-orange-700 animate-pulse"
                  title="Lisaaeg lõpeb varsti - kliki tellimiseks"
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>Lisaaeg: {trialStatus.hoursRemainingInGrace}h</span>
                </Link>
              )}
              
              {/* Trial Countdown Badge (Desktop) */}
              {user && !trialStatus.isInGracePeriod && trialStatus.isOnTrial && trialStatus.daysRemaining !== null && (
                <Link
                  to="/pricing"
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                    transition-all duration-300 hover:scale-105 motion-reduce:hover:scale-100
                    ${trialStatus.isUrgent 
                      ? 'bg-destructive/10 text-destructive border border-destructive/30 animate-pulse' 
                      : trialStatus.isWarningPeriod
                      ? 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700'
                      : 'bg-primary/10 text-primary border border-primary/20'
                    }
                  `}
                  title="Kliki, et vaadata tellimusi"
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>Proov: {trialStatus.daysRemaining} {trialStatus.daysRemaining === 1 ? 'päev' : 'päeva'}</span>
                </Link>
              )}
              
              {user ? (
                <UserMenu />
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Logi sisse
                  </Link>
                  <Link
                    to="/signup"
                    className="rounded-lg bg-gradient-primary px-3 py-2 text-sm font-semibold text-white shadow-soft transition-all duration-300 hover:scale-105 motion-reduce:hover:scale-100 hover:shadow-glow"
                  >
                    Loo konto
                  </Link>
                </>
              )}
            </div>

          </div>
        </header>

        {/* Mobile Header - Minimal Design */}
        <div className={`tt-app-header__mobile md:hidden transition-transform duration-300 ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
          <div className="tt-app-header__mobile-row">
            {/* Left: Account Icon (replaces logo) */}
            {user ? (
              <UserMenu mobileMinimal />
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <UserIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Logi sisse</span>
              </Link>
            )}

            {/* Center: TREENI & TAASTU Logo */}
            <Link
              to={user ? "/home" : "/"}
              className="tt-app-header__mobile-brand"
              onClick={() => closeAllDropdowns()}
            >
              <span>TREENI &amp; TAASTU</span>
            </Link>

            {/* Right: Burger Menu */}
            <button
              aria-label={open ? "Sulge menüü" : "Ava menüü"}
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen((v) => !v)}
              className="tt-app-icon-button"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

        </div>

        {/* Mobile drawer */}
        {open && (
          <div id="mobile-nav" className="tt-app-drawer md:hidden">
            <nav className="tt-app-drawer__nav" aria-label="Mobiilne navigatsioon">
                {/* Grace Period Badge (Mobile) */}
                {user && trialStatus.isInGracePeriod && trialStatus.hoursRemainingInGrace !== null && (
                  <Link
                    to="/pricing"
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold mb-2 transition-all duration-300 bg-orange-100 dark:bg-orange-950/30 text-orange-800 dark:text-orange-200 border-2 border-orange-300 dark:border-orange-700 animate-pulse"
                  >
                    <Clock className="h-4 w-4" />
                    <span>⏰ Lisaaeg: {trialStatus.hoursRemainingInGrace}h – Telli nüüd!</span>
                  </Link>
                )}

                {/* Trial Countdown Badge (Mobile) - only if NOT in grace period */}
                {user && !trialStatus.isInGracePeriod && trialStatus.isOnTrial && trialStatus.daysRemaining !== null && (
                  <Link
                    to="/pricing"
                    className={`
                      inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold mb-2
                      transition-all duration-300
                      ${trialStatus.isUrgent 
                        ? 'bg-destructive/10 text-destructive border-2 border-destructive/30 animate-pulse' 
                        : trialStatus.isWarningPeriod
                        ? 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-200 border-2 border-yellow-300 dark:border-yellow-700'
                        : 'bg-primary/10 text-primary border-2 border-primary/20'
                      }
                    `}
                  >
                    <Clock className="h-4 w-4" />
                    <span>
                      {trialStatus.isUrgent 
                        ? `⚠️ Proov lõpeb ${trialStatus.daysRemaining === 0 ? 'täna' : 'homme'}!` 
                        : `Tasuta proov: ${trialStatus.daysRemaining} ${trialStatus.daysRemaining === 1 ? 'päev' : 'päeva'}`
                      }
                    </span>
                  </Link>
                )}
                
                {nav.map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    end={n.to === (user ? "/home" : "/")}
                    className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
                  >
                    {n.label}
                  </NavLink>
                ))}

                {/* PT expandable section on mobile */}
                {user && !accessLoading && (
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setPtOpen((v) => !v);
                        setAdminOpen(false); // Close admin dropdown when PT opens
                      }}
                      className={`${linkBase} ${linkInactive} w-full inline-flex items-center justify-between`}
                      aria-expanded={ptOpen}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Treeningud
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${ptOpen ? "rotate-180" : ""}`} />
                    </button>
                    {ptOpen && (
                      <div className="mt-1 ml-3 grid gap-1">
                        <PTMenuItems
                          onItem={() => {
                            setOpen(false);
                            setPtOpen(false);
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Admin expandable section on mobile */}
                {user && isAdmin && (
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAdminOpen((v) => !v);
                        setPtOpen(false); // Close PT dropdown when admin opens
                      }}
                      className={`${linkBase} ${linkInactive} w-full inline-flex items-center justify-between`}
                      aria-expanded={adminOpen}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Admin
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${adminOpen ? "rotate-180" : ""}`} />
                    </button>
                    {adminOpen && (
                      <div className="mt-1 ml-3 grid gap-1">
                        <AdminMenuItems
                          onItem={() => {
                            setOpen(false);
                            setAdminOpen(false);
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Kasutajatugi button - only for logged in users */}
                {user && (
                  <div className="mt-2 pt-2 border-t">
                    <Link
                      to="/kasutajatugi"
                      onClick={() => setOpen(false)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm transition-colors shadow-sm"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Kasutajatugi
                    </Link>
                  </div>
                )}

                <div className="mt-2 border-t pt-2">
                  {!user && (
                    <div className="grid gap-2">
                      <Link
                        to="/login"
                        className="w-full rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors hover:bg-muted/50"
                      >
                        Logi sisse
                      </Link>
                      <Link
                        to="/signup"
                        className="w-full rounded-lg bg-gradient-primary px-3 py-2 text-center text-sm font-semibold text-white shadow-soft transition-all duration-300 hover:scale-105 motion-reduce:hover:scale-100 hover:shadow-glow"
                      >
                        Loo konto
                      </Link>
                    </div>
                  )}
                </div>
              </nav>
            </div>
          )}
      </div>
      
      {/* Spacer for fixed header */}
      <div className="tt-app-header-spacer" />
    </>
  );
}

function PTMenuItems({ onItem }: { onItem?: () => void }) {
  const Item = ({
    to,
    children,
    icon: Icon,
  }: {
    to: string;
    children: string;
    icon: React.ComponentType<{ className?: string }>;
  }) => (
    <Link
      to={to}
      onClick={onItem}
      className="tt-app-menu__item"
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );

  return (
    <>
      <Item to="/programs" icon={Users2}>
        Minu programmid
      </Item>
      <Item to="/kalkulaatorid" icon={Calculator}>
        Kalkulaatorid
      </Item>
    </>
  );
}

function AdminMenuItems({ onItem }: { onItem?: () => void }) {
  const Item = ({
    to,
    children,
    icon: Icon,
  }: {
    to: string;
    children: string;
    icon: React.ComponentType<{ className?: string }>;
  }) => (
    <Link
      to={to}
      onClick={onItem}
      className="tt-app-menu__item"
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );

  return (
    <>
      <Item to="/admin" icon={BarChart3}>
        Analytics
      </Item>
      <Item to="/admin/support" icon={MessageCircle}>
        Kliendiabi
      </Item>
      <Item to="/admin/users" icon={Users}>
        Kasutajad
      </Item>
      <Item to="/admin/programs" icon={Users2}>
        Programmid
      </Item>
      <Item to="/admin/articles" icon={BookOpen}>
        Artiklid
      </Item>
      <Item to="/admin/tt-beta" icon={Zap}>
        TT Beta
      </Item>
    </>
  );
}

function UserMenu({ mobile = false, mobileMinimal = false }: { mobile?: boolean; mobileMinimal?: boolean }) {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const popRef = useRef<HTMLDivElement | null>(null);
  const email = user?.email ?? "Kasutaja";

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      if (typeof signOut === "function") signOut();
    }
  };

  // Close on outside click / escape (desktop only)
  useEffect(() => {
    if (mobile || !open) return;
    const onDoc = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [mobile, open]);

  const itemBase = "tt-app-menu__item";

  if (mobile) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 px-1 py-1.5 text-sm text-muted-foreground">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-primary text-white">
            <UserIcon className="h-4 w-4" />
          </div>
          <span className="truncate">{email}</span>
        </div>
        <Link to="/konto" className={itemBase}>
          <UserIcon className="h-4 w-4" />
          Konto
        </Link>
        <button onClick={handleSignOut} className={itemBase}>
          <LogOut className="h-4 w-4" />
          Logi välja
        </button>
      </div>
    );
  }

  if (mobileMinimal) {
    return (
      <div className="relative overflow-visible" ref={popRef} style={{ zIndex: 1000 }}>
        <button
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="tt-app-icon-button"
        >
          <UserIcon className="h-5 w-5" />
        </button>
        {open && (
          <div
            role="menu"
            className="tt-app-menu"
            style={{ 
              position: 'absolute', 
              top: '100%', 
              left: 0, 
              zIndex: 1001 
            }}
          >
            <Link to="/konto" className={itemBase} onClick={() => setOpen(false)}>
              <UserIcon className="h-4 w-4" />
              Konto
            </Link>
            <button onClick={() => { handleSignOut(); setOpen(false); }} className={itemBase}>
              <LogOut className="h-4 w-4" />
              Logi välja
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative overflow-visible" ref={popRef} style={{ zIndex: 1000 }}>
      <button
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="tt-app-user-button"
      >
        <div className="tt-app-user-button__icon">
          <UserIcon className="h-4 w-4" />
        </div>
        <span className="hidden max-w-[180px] truncate text-sm sm:inline">
          {email}
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="tt-app-menu"
          style={{ 
            position: 'absolute', 
            top: '100%', 
            right: 0, 
            zIndex: 1001 
          }}
        >
          <Link to="/konto" className={itemBase}>
            <UserIcon className="h-4 w-4" />
            Konto
          </Link>
          <button onClick={handleSignOut} className={itemBase}>
            <LogOut className="h-4 w-4" />
            Logi välja
          </button>
        </div>
      )}
    </div>
  );
}
