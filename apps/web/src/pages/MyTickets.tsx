import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

interface TicketRow {
  id: string;
  status: "VALID" | "USED" | "REFUNDED" | "CANCELLED";
  event_name: string;
  start_date: string;
  venue_name: string;
  row_label: string;
  seat_number: number;
  seat_type: string;
}

const statusLabel: Record<TicketRow["status"], string> = {
  VALID: "Валиден",
  USED: "Използван",
  REFUNDED: "Възстановен",
  CANCELLED: "Анулиран",
};

export function MyTickets() {
  const [tickets, setTickets] = useState<TicketRow[] | null>(null);
  const [params] = useSearchParams();
  const justPaid = params.get("justPaid");

  useEffect(() => {
    api.get<{ tickets: TicketRow[] }>("/tickets").then((res) => setTickets(res.tickets));
  }, []);

  if (tickets === null) return <p>Зареждане...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Моите билети</h1>
      {justPaid && (
        <p className="mb-4 m3-chip" style={{ color: "var(--color-success)", borderColor: "var(--color-success)" }}>
          Плащането е успешно! Билетите Ви са готови по-долу.
        </p>
      )}
      {tickets.length === 0 ? (
        <div className="m3-card p-10 text-center">
          <h2 className="text-lg font-semibold mb-2">Няма билети</h2>
          <p style={{ color: "var(--color-text-muted)" }}>
            Все още нямате закупени билети. <Link to="/events" className="m3-btn-text !p-0 underline">Разгледайте събитията</Link>.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tickets.map((t) => (
            <Link key={t.id} to={`/tickets/${t.id}`} className="m3-card p-5 hover:shadow-m3-2 transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{t.event_name}</h3>
                <span className="m3-chip" style={{
                  color: t.status === "VALID" ? "var(--color-success)" : t.status === "USED" ? "var(--color-text-muted)" : "var(--color-error)",
                }}>
                  {statusLabel[t.status]}
                </span>
              </div>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                {new Date(t.start_date).toLocaleString("bg-BG", { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <p className="text-sm mt-1">
                {t.venue_name} — Ред {t.row_label}, място {t.seat_number} {t.seat_type === "VIP" ? "(VIP)" : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
