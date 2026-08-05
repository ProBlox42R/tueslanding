import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <p>Зареждане...</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RequireGuest() {
  const { user, loading } = useAuth();
  if (loading) return <p>Зареждане...</p>;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}

export function RequireStaff() {
  const { user, loading } = useAuth();
  if (loading) return <p>Зареждане...</p>;
  if (!user || user.role !== "ADMIN") {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
