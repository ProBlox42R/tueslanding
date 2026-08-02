import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { AdminNav } from "../../components/AdminNav";

interface Stats {
  activeEvents: number;
  soldTickets: number;
  availableSeats: number;
  paidOrders: number;
  unpaidOrders: number;
  usedTickets: number;
  revenue: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get<{ stats: Stats }>("/admin/stats").then((res) => setStats(res.stats));
  }, []);

  return (
    <div>
      <AdminNav />
      <h1 className="text-2xl font-bold mb-6">Табло</h1>
      {!stats ? (
        <p>Зареждане...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Активни събития" value={stats.activeEvents} />
          <StatCard label="Продадени билети" value={stats.soldTickets} />
          <StatCard label="Налични места" value={stats.availableSeats} />
          <StatCard label="Платени поръчки" value={stats.paidOrders} />
          <StatCard label="Неплатени поръчки" value={stats.unpaidOrders} />
          <StatCard label="Използвани билети" value={stats.usedTickets} />
          <StatCard label="Приходи" value={`${stats.revenue.toFixed(2)} лв.`} />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="m3-card p-5">
      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{label}</p>
      <p className="text-2xl font-bold mt-1" style={{ color: "var(--color-brand)" }}>{value}</p>
    </div>
  );
}
