import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";

interface TicketDetailResponse {
  ticket: {
    id: string;
    status: "VALID" | "USED" | "REFUNDED" | "CANCELLED";
    event_name: string;
    start_date: string;
    venue_name: string;
    row_label: string;
    seat_number: number;
    seat_type: string;
    price: string;
  };
}

const statusLabel: Record<string, string> = {
  VALID: "Валиден",
  USED: "Използван",
  REFUNDED: "Възстановен",
  CANCELLED: "Анулиран",
};

export function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<TicketDetailResponse | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get<TicketDetailResponse>(`/tickets/${id}`).then(setData);
  }, [id]);

  if (!data) return <p>Зареждане...</p>;
  const t = data.ticket;

  return (
    <div className="max-w-lg mx-auto m3-card p-8">
      <div className="flex justify-between items-start mb-4">
        <h1 className="text-xl font-bold">{t.event_name}</h1>
        <span className="m3-chip" style={{
          color: t.status === "VALID" ? "var(--color-success)" : "var(--color-text-muted)",
        }}>
          {statusLabel[t.status]}
        </span>
      </div>
      <dl className="space-y-2 text-sm mb-6">
        <Row label="Дата" value={new Date(t.start_date).toLocaleString("bg-BG", { dateStyle: "long", timeStyle: "short" })} />
        <Row label="Зала" value={t.venue_name} />
        <Row label="Ред" value={t.row_label} />
        <Row label="Място" value={String(t.seat_number)} />
        <Row label="Тип билет" value={t.seat_type === "VIP" ? "VIP" : "Нормален"} />
        <Row label="Цена" value={`${t.price} лв.`} />
        <Row label="Номер на билета" value={t.id} />
      </dl>
      <a href={`/api/tickets/${t.id}/pdf`} target="_blank" rel="noreferrer" className="m3-btn-filled w-full block text-center">
        Отвори PDF билет с QR код
      </a>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b pb-2" style={{ borderColor: "var(--color-outline-variant)" }}>
      <dt style={{ color: "var(--color-text-muted)" }}>{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
