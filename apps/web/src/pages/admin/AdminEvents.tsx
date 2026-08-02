import { useEffect, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { AdminNav } from "../../components/AdminNav";

interface Venue {
  id: string;
  name: string;
}

interface EventRow {
  id: string;
  name: string;
  venue_id: string;
  start_date: string;
  normal_price: string;
  vip_price: string | null;
  status: "DRAFT" | "PUBLISHED" | "SALES_STOPPED" | "ARCHIVED";
}

const statusLabel: Record<EventRow["status"], string> = {
  DRAFT: "Чернова",
  PUBLISHED: "Публикувано",
  SALES_STOPPED: "Продажби спрени",
  ARCHIVED: "Архивирано",
};

export function AdminEvents() {
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const [eventsRes, venuesRes] = await Promise.all([
      api.get<{ events: EventRow[] }>("/admin/events"),
      api.get<{ venues: Venue[] }>("/venues"),
    ]);
    setEvents(eventsRes.events);
    setVenues(venuesRes.venues);
  }

  useEffect(() => {
    load();
  }, []);

  async function runAction(id: string, action: "publish" | "stop-sales" | "archive") {
    setBusyId(id);
    try {
      await api.post(`/admin/events/${id}/${action}`);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <AdminNav />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Събития</h1>
        <button className="m3-btn-filled" onClick={() => setShowCreate(true)} disabled={venues.length === 0}>
          Ново събитие
        </button>
      </div>
      {venues.length === 0 && (
        <p className="mb-4 text-sm" style={{ color: "var(--color-warning)" }}>
          Създайте първо зала, преди да добавите събитие.
        </p>
      )}

      {showCreate && (
        <CreateEventForm
          venues={venues}
          onCreated={async () => {
            setShowCreate(false);
            await load();
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {!events ? (
        <p>Зареждане...</p>
      ) : events.length === 0 ? (
        <div className="m3-card p-10 text-center">
          <h2 className="text-lg font-semibold mb-2">Няма събития</h2>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto m3-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: "var(--color-outline-variant)" }}>
                  <th className="p-3">Име</th>
                  <th className="p-3">Дата</th>
                  <th className="p-3">Цени</th>
                  <th className="p-3">Статус</th>
                  <th className="p-3">Действия</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id} className="border-b last:border-0" style={{ borderColor: "var(--color-outline-variant)" }}>
                    <td className="p-3 font-medium">{ev.name}</td>
                    <td className="p-3">{new Date(ev.start_date).toLocaleDateString("bg-BG")}</td>
                    <td className="p-3">
                      {ev.normal_price} лв.{ev.vip_price ? ` / VIP ${ev.vip_price} лв.` : ""}
                    </td>
                    <td className="p-3">
                      <span className="m3-chip">{statusLabel[ev.status]}</span>
                    </td>
                    <td className="p-3 space-x-2">
                      {ev.status === "DRAFT" && (
                        <button className="m3-btn-text !px-2" disabled={busyId === ev.id} onClick={() => runAction(ev.id, "publish")}>
                          Публикувай
                        </button>
                      )}
                      {ev.status === "PUBLISHED" && (
                        <button className="m3-btn-text !px-2" disabled={busyId === ev.id} onClick={() => runAction(ev.id, "stop-sales")}>
                          Спри продажби
                        </button>
                      )}
                      {ev.status !== "ARCHIVED" && (
                        <button className="m3-btn-text !px-2" disabled={busyId === ev.id} onClick={() => runAction(ev.id, "archive")}>
                          Архивирай
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {events.map((ev) => (
              <div key={ev.id} className="m3-card p-4">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <p className="font-medium">{ev.name}</p>
                  <span className="m3-chip shrink-0">{statusLabel[ev.status]}</span>
                </div>
                <p className="text-sm mb-1" style={{ color: "var(--color-text-muted)" }}>
                  {new Date(ev.start_date).toLocaleDateString("bg-BG")}
                </p>
                <p className="text-sm mb-3">
                  {ev.normal_price} лв.{ev.vip_price ? ` / VIP ${ev.vip_price} лв.` : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  {ev.status === "DRAFT" && (
                    <button className="m3-btn-outlined text-sm" disabled={busyId === ev.id} onClick={() => runAction(ev.id, "publish")}>
                      Публикувай
                    </button>
                  )}
                  {ev.status === "PUBLISHED" && (
                    <button className="m3-btn-outlined text-sm" disabled={busyId === ev.id} onClick={() => runAction(ev.id, "stop-sales")}>
                      Спри продажби
                    </button>
                  )}
                  {ev.status !== "ARCHIVED" && (
                    <button className="m3-btn-outlined text-sm" disabled={busyId === ev.id} onClick={() => runAction(ev.id, "archive")}>
                      Архивирай
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CreateEventForm({
  venues,
  onCreated,
  onCancel,
}: {
  venues: Venue[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    venueId: venues[0]?.id ?? "",
    name: "",
    description: "",
    startDate: "",
    normalPrice: "20",
    vipPrice: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/admin/events", {
        venueId: form.venueId,
        name: form.name,
        description: form.description || null,
        startDate: new Date(form.startDate).toISOString(),
        normalPrice: Number(form.normalPrice),
        vipPrice: form.vipPrice ? Number(form.vipPrice) : null,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Възникна грешка.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="m3-card p-6 mb-8 grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium mb-1">Зала</label>
        <select className="m3-input" value={form.venueId} onChange={(e) => setForm({ ...form, venueId: e.target.value })}>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium mb-1">Име на събитието</label>
        <input className="m3-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium mb-1">Описание</label>
        <textarea className="m3-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Дата и час</label>
        <input type="datetime-local" className="m3-input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Нормална цена (лв.)</label>
        <input type="number" step="0.01" min={0} className="m3-input" value={form.normalPrice} onChange={(e) => setForm({ ...form, normalPrice: e.target.value })} required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">VIP цена (лв., по избор)</label>
        <input type="number" step="0.01" min={0} className="m3-input" value={form.vipPrice} onChange={(e) => setForm({ ...form, vipPrice: e.target.value })} />
      </div>
      {error && <p className="sm:col-span-2 text-sm" style={{ color: "var(--color-error)" }}>{error}</p>}
      <div className="sm:col-span-2 flex gap-2">
        <button type="submit" className="m3-btn-filled" disabled={loading}>{loading ? "Създаване..." : "Създай събитие"}</button>
        <button type="button" className="m3-btn-outlined" onClick={onCancel}>Отказ</button>
      </div>
    </form>
  );
}
