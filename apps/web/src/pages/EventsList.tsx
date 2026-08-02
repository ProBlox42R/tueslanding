import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

interface EventRow {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  normal_price: string;
  vip_price: string | null;
  status: string;
}

export function EventsList() {
  const [events, setEvents] = useState<EventRow[] | null>(null);

  useEffect(() => {
    api.get<{ events: EventRow[] }>("/events").then((res) => setEvents(res.events));
  }, []);

  if (events === null) return <p>Зареждане...</p>;

  if (events.length === 0) {
    return (
      <div className="m3-card p-10 text-center">
        <h2 className="text-lg font-semibold mb-2">Няма събития</h2>
        <p style={{ color: "var(--color-text-muted)" }}>В момента няма публикувани събития. Проверете отново по-късно.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Предстоящи събития</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((ev) => (
          <Link key={ev.id} to={`/events/${ev.id}`} className="m3-card p-5 hover:shadow-m3-2 transition-shadow">
            <h3 className="font-semibold text-lg mb-1">{ev.name}</h3>
            <p className="text-sm mb-3" style={{ color: "var(--color-text-muted)" }}>
              {new Date(ev.start_date).toLocaleString("bg-BG", { dateStyle: "medium", timeStyle: "short" })}
            </p>
            <div className="flex gap-2 text-sm">
              <span className="m3-chip">Нормален: {ev.normal_price} лв.</span>
              {ev.vip_price && <span className="m3-chip">VIP: {ev.vip_price} лв.</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
