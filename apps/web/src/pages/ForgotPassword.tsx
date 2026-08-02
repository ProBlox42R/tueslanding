import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
    } finally {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto m3-card p-8">
      <h1 className="text-2xl font-bold mb-6">Забравена парола</h1>
      {sent ? (
        <p style={{ color: "var(--color-text-muted)" }}>
          Ако имейлът съществува в системата, ще получите линк за възстановяване на паролата.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Имейл</label>
            <input type="email" className="m3-input" value={email}
              onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <button type="submit" className="m3-btn-filled w-full" disabled={loading}>
            {loading ? "Изпращане..." : "Изпрати линк"}
          </button>
        </form>
      )}
      <div className="mt-4 text-sm text-center">
        <Link to="/login" className="m3-btn-text">Обратно към вход</Link>
      </div>
    </div>
  );
}
