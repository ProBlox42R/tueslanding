import { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { AdminNav } from "../../components/AdminNav";
import { useAuth } from "../../hooks/useAuth";

interface AdminRow {
  id: string;
  username: string;
  email: string;
  role: "ADMIN";
  is_active: 0 | 1;
}

export function AdminManagement() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminRow[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await api.get<{ admins: AdminRow[] }>("/admin/admins");
    setAdmins(res.admins);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(admin: AdminRow) {
    setBusyId(admin.id);
    try {
      await api.post(`/admin/admins/${admin.id}/${admin.is_active ? "deactivate" : "activate"}`);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <AdminNav />
      <div className="flex flex-wrap gap-3 justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Администратори</h1>
        <button className="m3-btn-filled" onClick={() => setShowCreate(true)}>Нов администратор</button>
      </div>

      {showCreate && (
        <CreateAdminForm
          onCreated={async () => {
            setShowCreate(false);
            await load();
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {!admins ? (
        <p>Зареждане...</p>
      ) : (
        <>
          {/* Таблица за по-широки екрани */}
          <div className="hidden sm:block overflow-x-auto m3-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: "var(--color-outline-variant)" }}>
                  <th className="p-3">Потребител</th>
                  <th className="p-3">Статус</th>
                  <th className="p-3">Действия</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.id} className="border-b last:border-0" style={{ borderColor: "var(--color-outline-variant)" }}>
                    <td className="p-3">{a.username}<br /><span style={{ color: "var(--color-text-muted)" }}>{a.email}</span></td>
                    <td className="p-3">
                      <span className="m3-chip" style={{ color: a.is_active ? "var(--color-success)" : "var(--color-error)" }}>
                        {a.is_active ? "Активен" : "Деактивиран"}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        className="m3-btn-text !px-2"
                        disabled={busyId === a.id || a.id === user?.id}
                        title={a.id === user?.id ? "Не можете да деактивирате собствения си акаунт" : undefined}
                        onClick={() => toggleActive(a)}
                      >
                        {a.is_active ? "Деактивирай" : "Активирай"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Карти за мобилни екрани */}
          <div className="sm:hidden space-y-3">
            {admins.map((a) => (
              <div key={a.id} className="m3-card p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{a.username}</p>
                    <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{a.email}</p>
                  </div>
                  <span className="m3-chip shrink-0" style={{ color: a.is_active ? "var(--color-success)" : "var(--color-error)" }}>
                    {a.is_active ? "Активен" : "Деактивиран"}
                  </span>
                </div>
                <button
                  className="m3-btn-outlined w-full mt-2"
                  disabled={busyId === a.id || a.id === user?.id}
                  onClick={() => toggleActive(a)}
                >
                  {a.is_active ? "Деактивирай" : "Активирай"}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CreateAdminForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/admin/admins", form);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Възникна грешка.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="m3-card p-6 mb-8 grid gap-4 sm:grid-cols-2">
      <div>
        <label className="block text-sm font-medium mb-1">Потребителско име</label>
        <input className="m3-input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Имейл</label>
        <input type="email" className="m3-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium mb-1">Парола</label>
        <input type="password" className="m3-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
      </div>
      {error && <p className="sm:col-span-2 text-sm" style={{ color: "var(--color-error)" }}>{error}</p>}
      <div className="sm:col-span-2 flex gap-2">
        <button type="submit" className="m3-btn-filled" disabled={loading}>{loading ? "Създаване..." : "Създай"}</button>
        <button type="button" className="m3-btn-outlined" onClick={onCancel}>Отказ</button>
      </div>
    </form>
  );
}
