import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { AdminNav } from "../../components/AdminNav";

interface OrderRow {
  id: string;
  username: string;
  email: string;
  event_name: string;
  ticket_count: number;
  total_amount: string;
  status: "UNPAID" | "PAID" | "REFUNDED" | "CANCELLED";
  created_at: string;
}

const statusLabel: Record<OrderRow["status"], string> = {
  UNPAID: "Неплатено",
  PAID: "Платено",
  REFUNDED: "Възстановено",
  CANCELLED: "Отказано",
};

export function AdminOrders() {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const query = new URLSearchParams();
    if (statusFilter) query.set("status", statusFilter);
    if (search) query.set("search", search);
    const res = await api.get<{ orders: OrderRow[] }>(`/admin/orders?${query.toString()}`);
    setOrders(res.orders);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function onRefund(id: string) {
    if (!confirm("Възстановяване на плащането за тази поръчка?")) return;
    setBusyId(id);
    try {
      await api.post(`/admin/orders/${id}/refund`);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <AdminNav />
      <h1 className="text-2xl font-bold mb-6">Поръчки</h1>

      <div className="flex flex-wrap gap-3 mb-4">
        <select className="m3-input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Всички статуси</option>
          <option value="PAID">Платено</option>
          <option value="UNPAID">Неплатено</option>
          <option value="REFUNDED">Възстановено</option>
        </select>
        <input
          className="m3-input flex-1 min-w-[200px]"
          placeholder="Търсене по потребител, имейл или събитие"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <button className="m3-btn-outlined" onClick={load}>Търси</button>
      </div>

      {!orders ? (
        <p>Зареждане...</p>
      ) : orders.length === 0 ? (
        <div className="m3-card p-10 text-center">
          <h2 className="text-lg font-semibold">Няма резултати</h2>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto m3-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: "var(--color-outline-variant)" }}>
                  <th className="p-3">Потребител</th>
                  <th className="p-3">Събитие</th>
                  <th className="p-3">Билети</th>
                  <th className="p-3">Сума</th>
                  <th className="p-3">Статус</th>
                  <th className="p-3">Дата</th>
                  <th className="p-3">Действия</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b last:border-0" style={{ borderColor: "var(--color-outline-variant)" }}>
                    <td className="p-3">{o.username}<br /><span style={{ color: "var(--color-text-muted)" }}>{o.email}</span></td>
                    <td className="p-3">{o.event_name}</td>
                    <td className="p-3">{o.ticket_count}</td>
                    <td className="p-3">{o.total_amount} лв.</td>
                    <td className="p-3"><span className="m3-chip">{statusLabel[o.status]}</span></td>
                    <td className="p-3">{new Date(o.created_at).toLocaleDateString("bg-BG")}</td>
                    <td className="p-3">
                      {o.status === "PAID" && (
                        <button className="m3-btn-text !px-2" disabled={busyId === o.id} onClick={() => onRefund(o.id)}>
                          Възстанови плащането
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="m3-card p-4">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div>
                    <p className="font-medium">{o.username}</p>
                    <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{o.email}</p>
                  </div>
                  <span className="m3-chip shrink-0">{statusLabel[o.status]}</span>
                </div>
                <p className="text-sm mb-1">{o.event_name}</p>
                <p className="text-sm mb-1" style={{ color: "var(--color-text-muted)" }}>
                  {o.ticket_count} билет(и) · {o.total_amount} лв. · {new Date(o.created_at).toLocaleDateString("bg-BG")}
                </p>
                {o.status === "PAID" && (
                  <button className="m3-btn-outlined w-full mt-2" disabled={busyId === o.id} onClick={() => onRefund(o.id)}>
                    Възстанови плащането
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
