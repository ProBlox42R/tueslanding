import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

export function Login() {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { refresh } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/login", { emailOrUsername, password });
      await refresh();
      navigate("/events");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Възникна грешка.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto m3-card p-8">
      <h1 className="text-2xl font-bold mb-6">Вход в профила</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Имейл или потребителско име</label>
          <input
            className="m3-input"
            value={emailOrUsername}
            onChange={(e) => setEmailOrUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Парола</label>
          <input
            type="password"
            className="m3-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p style={{ color: "var(--color-error)" }} className="text-sm">{error}</p>}
        <button type="submit" className="m3-btn-filled w-full" disabled={loading}>
          {loading ? "Влизане..." : "Влез"}
        </button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <Link to="/forgot-password" className="m3-btn-text !px-0">Забравена парола?</Link>
        <Link to="/register" className="m3-btn-text !px-0">Създай акаунт</Link>
      </div>
    </div>
  );
}
