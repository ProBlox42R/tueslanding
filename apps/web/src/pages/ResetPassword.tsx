import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";

export function ResetPassword() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = params.get("token") ?? "";
      await api.post("/auth/reset-password", { token, password, passwordConfirmation });
      navigate("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Възникна грешка.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto m3-card p-8">
      <h1 className="text-2xl font-bold mb-6">Нова парола</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Нова парола</label>
          <input type="password" className="m3-input" value={password}
            onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Потвърди парола</label>
          <input type="password" className="m3-input" value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)} required />
        </div>
        {error && <p style={{ color: "var(--color-error)" }} className="text-sm">{error}</p>}
        <button type="submit" className="m3-btn-filled w-full" disabled={loading}>
          {loading ? "Запазване..." : "Задай нова парола"}
        </button>
      </form>
    </div>
  );
}
