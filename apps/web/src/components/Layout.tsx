import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { ThemeToggle } from "./ThemeToggle";

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isStaff = user?.role === "ADMIN";
  const [menuOpen, setMenuOpen] = useState(false);

  // Затвори мобилното меню автоматично при всяка смяна на страницата.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  async function onLogout() {
    await logout();
    setMenuOpen(false);
    navigate("/login");
  }

  return (
    <div className="min-h-full flex flex-col">
      <header
        className="sticky top-0 z-30 border-b"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-outline-variant)" }}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0" onClick={() => setMenuOpen(false)}>
            <img src="/logo.svg" alt="Билети" className="h-8 w-8" />
            <span className="text-lg font-bold" style={{ color: "var(--color-brand)" }}>
              Билети
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <NavItem to="/events">Събития</NavItem>
            {user && <NavItem to="/my-tickets">Моите билети</NavItem>}
            {isStaff && <NavItem to="/admin">Табло</NavItem>}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <button className="m3-btn-outlined text-sm" onClick={onLogout}>
                Изход
              </button>
            ) : (
              <Link to="/login" className="m3-btn-filled text-sm">
                Вход
              </Link>
            )}
          </div>

          {/* Мобилно меню бутон */}
          <button
            className="md:hidden p-2 -mr-2 rounded-m3"
            aria-label={menuOpen ? "Затвори менюто" : "Отвори менюто"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text)" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>

        {/* Мобилно меню панел */}
        {menuOpen && (
          <div
            className="md:hidden border-t px-4 py-3 flex flex-col gap-1"
            style={{ borderColor: "var(--color-outline-variant)", backgroundColor: "var(--color-surface)" }}
          >
            <MobileNavItem to="/events">Събития</MobileNavItem>
            {user && <MobileNavItem to="/my-tickets">Моите билети</MobileNavItem>}
            {isStaff && <MobileNavItem to="/admin">Табло</MobileNavItem>}
            <div className="flex items-center justify-between pt-3 mt-2 border-t" style={{ borderColor: "var(--color-outline-variant)" }}>
              <ThemeToggle />
              {user ? (
                <button className="m3-btn-outlined text-sm" onClick={onLogout}>
                  Изход
                </button>
              ) : (
                <Link to="/login" className="m3-btn-filled text-sm" onClick={() => setMenuOpen(false)}>
                  Вход
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 sm:py-8">
        <Outlet />
      </main>

      <footer
        className="border-t py-6 text-center text-sm px-4"
        style={{ borderColor: "var(--color-outline-variant)", color: "var(--color-text-muted)" }}
      >
        Билети — система за продажба и управление на билети
      </footer>
    </div>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className="px-4 py-2 rounded-m3-full transition-colors"
      style={({ isActive }) => ({
        color: isActive ? "var(--color-brand-on)" : "var(--color-text)",
        backgroundColor: isActive ? "var(--color-brand)" : "transparent",
        fontWeight: isActive ? 600 : 500,
      })}
    >
      {children}
    </NavLink>
  );
}

function MobileNavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className="px-3 py-3 rounded-m3 text-sm font-medium transition-colors"
      style={({ isActive }) => ({
        color: isActive ? "var(--color-brand-on)" : "var(--color-text)",
        backgroundColor: isActive ? "var(--color-brand)" : "transparent",
      })}
    >
      {children}
    </NavLink>
  );
}
