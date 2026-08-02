import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";

export function Register() {
  const [form, setForm] = useState({ username: "", email: "", password: "", passwordConfirmation: "" });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      await api.post("/auth/register", form);
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fields ?? {});
      } else {
        setError("Възникна грешка.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto m3-card p-8 text-center">
        <h1 className="text-xl font-bold mb-2">Проверете имейла си</h1>
        <p style={{ color: "var(--color-text-muted)" }}>
          Изпратихме Ви линк за потвърждение на {form.email}. Отворете го, за да активирате акаунта си.
        </p>
        <button className="m3-btn-filled mt-6" onClick={() => navigate("/login")}>
          Към вход
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto m3-card p-8">
      <h1 className="text-2xl font-bold mb-6">Регистрация</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Потребителско име" value={form.username} errors={fieldErrors.username}
          onChange={(v) => setForm({ ...form, username: v })} />
        <Field label="Имейл" type="email" value={form.email} errors={fieldErrors.email}
          onChange={(v) => setForm({ ...form, email: v })} />
        <Field label="Парола" type="password" value={form.password} errors={fieldErrors.password}
          onChange={(v) => setForm({ ...form, password: v })} />
        <Field label="Потвърди парола" type="password" value={form.passwordConfirmation}
          errors={fieldErrors.passwordConfirmation}
          onChange={(v) => setForm({ ...form, passwordConfirmation: v })} />
        {error && <p style={{ color: "var(--color-error)" }} className="text-sm">{error}</p>}
        <button type="submit" className="m3-btn-filled w-full" disabled={loading}>
          {loading ? "Регистриране..." : "Регистрирай се"}
        </button>
      </form>
      <div className="mt-4 text-sm text-center">
        <Link to="/login" className="m3-btn-text">Вече имате акаунт? Влезте</Link>
      </div>
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  type?: string;
  errors?: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{props.label}</label>
      <input
        type={props.type ?? "text"}
        className="m3-input"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        required
      />
      {props.errors?.map((msg) => (
        <p key={msg} style={{ color: "var(--color-error)" }} className="text-xs mt-1">{msg}</p>
      ))}
    </div>
  );
}
