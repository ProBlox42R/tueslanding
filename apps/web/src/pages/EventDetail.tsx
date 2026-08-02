import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { useEventRealtime } from "../hooks/useEventRealtime";

interface EventSeat {
  id: string;
  status: "AVAILABLE" | "RESERVED" | "SOLD" | "BLOCKED";
  price: string;
  row_label: string;
  seat_number: number;
  seat_type: string;
}

interface EventDetailResponse {
  event: {
    id: string;
    name: string;
    description: string | null;
    start_date: string;
    normal_price: string;
    vip_price: string | null;
    status: string;
  };
  seats: EventSeat[];
  remainingTickets: number;
}

export function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<EventDetailResponse | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [queueInfo, setQueueInfo] = useState<{ admitted: boolean; position?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const live = useEventRealtime(id);

  useEffect(() => {
    if (!id) return;
    api.get<EventDetailResponse>(`/events/${id}`).then(setData);
  }, [id]);

  const seatsByRow = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, EventSeat[]>();
    for (const seat of data.seats) {
      if (!map.has(seat.row_label)) map.set(seat.row_label, []);
      map.get(seat.row_label)!.push(seat);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([row, seats]) => [row, seats.sort((a, b) => a.seat_number - b.seat_number)] as const);
  }, [data]);

  function seatStatus(seat: EventSeat): EventSeat["status"] {
    return live.seatStatusById[seat.id] ?? seat.status;
  }

  function toggleSeat(seat: EventSeat) {
    if (!user) {
      navigate("/login");
      return;
    }
    const status = seatStatus(seat);
    if (status !== "AVAILABLE") return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seat.id)) next.delete(seat.id);
      else next.add(seat.id);
      return next;
    });
  }

  // Резервирай местата, после прати потребителя към отделната checkout
  // страница, където въвежда името за билета и потвърждава покупката —
  // без данни за карта (плащането е фиктивно/вътрешно в тази версия).
  async function onReserve() {
    if (!id || selected.size === 0) return;
    setError(null);
    setBusy(true);
    try {
      const queue = await api.post<{ admitted: boolean; position?: number }>("/queue/enter");
      if (!queue.admitted) {
        setQueueInfo(queue);
        setBusy(false);
        return;
      }
      const res = await api.post<{ reservationId: string }>(`/reservations/events/${id}/reserve`, {
        eventSeatIds: Array.from(selected),
      });
      navigate(`/checkout/${res.reservationId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Възникна грешка.");
      setBusy(false);
    }
  }

  if (!data) return <p>Зареждане...</p>;

  const remaining = live.remainingTickets || data.remainingTickets;
  const totalPrice = data.seats
    .filter((s) => selected.has(s.id))
    .reduce((sum, s) => sum + Number(s.price), 0);

  if (queueInfo && !queueInfo.admitted) {
    return <WaitingRoom position={queueInfo.position} onAdmitted={() => setQueueInfo(null)} />;
  }

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <div>
        <h1 className="text-2xl font-bold">{data.event.name}</h1>
        <p className="mt-1" style={{ color: "var(--color-text-muted)" }}>
          {new Date(data.event.start_date).toLocaleString("bg-BG", { dateStyle: "long", timeStyle: "short" })}
        </p>
        {data.event.description && <p className="mt-3">{data.event.description}</p>}
        <p className="mt-3 font-medium">Остават {remaining} билета</p>

        <div className="m3-card p-6 mt-6">
          <div className="flex items-center gap-4 mb-4 text-sm flex-wrap">
            <Legend color="var(--color-surface-variant)" label="Свободно" />
            <Legend color="var(--color-brand)" label="Избрано" />
            <Legend color="var(--color-warning-container)" label="Резервирано" />
            <Legend color="var(--color-error-container)" label="Продадено" />
            <Legend color="var(--color-outline)" label="Блокирано" />
          </div>

          <div className="overflow-x-auto">
            <div className="inline-flex flex-col gap-2 mx-auto">
              {seatsByRow.map(([row, seats]) => (
                <div key={row} className="flex items-center gap-2">
                  <span className="w-6 text-sm font-medium text-right" style={{ color: "var(--color-text-muted)" }}>
                    {row}
                  </span>
                  <div className="flex gap-1.5">
                    {seats.map((seat) => {
                      const status = seatStatus(seat);
                      const isSelected = selected.has(seat.id);
                      return (
                        <button
                          key={seat.id}
                          disabled={status !== "AVAILABLE" && !isSelected}
                          onClick={() => toggleSeat(seat)}
                          title={`Ред ${row}, място ${seat.seat_number} (${seat.seat_type === "VIP" ? "VIP" : "Нормален"})`}
                          className="w-8 h-8 rounded-md text-[10px] font-semibold flex items-center justify-center border transition-colors"
                          style={{
                            backgroundColor: isSelected
                              ? "var(--color-brand)"
                              : status === "SOLD"
                              ? "var(--color-error-container)"
                              : status === "RESERVED"
                              ? "var(--color-warning-container)"
                              : status === "BLOCKED"
                              ? "var(--color-outline)"
                              : "var(--color-surface-variant)",
                            color: isSelected ? "var(--color-brand-on)" : "var(--color-text)",
                            borderColor: "var(--color-outline-variant)",
                            cursor: status === "AVAILABLE" || isSelected ? "pointer" : "not-allowed",
                          }}
                        >
                          {seat.seat_number}
                          {seat.seat_type === "VIP" ? "★" : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <aside className="m3-card p-6 h-fit sticky top-20">
        <h2 className="font-semibold mb-4">Вашата поръчка</h2>
        {selected.size === 0 && (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Изберете места от схемата.
          </p>
        )}
        {selected.size > 0 && <p className="text-sm mb-2">Избрани места: {selected.size}</p>}
        <p className="text-lg font-bold mb-4">{totalPrice.toFixed(2)} лв.</p>

        {error && <p className="text-sm mb-3" style={{ color: "var(--color-error)" }}>{error}</p>}

        <button className="m3-btn-filled w-full" disabled={selected.size === 0 || busy} onClick={onReserve}>
          {busy ? "Резервиране..." : "Продължи към плащане"}
        </button>
      </aside>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-3.5 h-3.5 rounded-sm border" style={{ backgroundColor: color, borderColor: "var(--color-outline-variant)" }} />
      {label}
    </span>
  );
}

function WaitingRoom({ position, onAdmitted }: { position?: number; onAdmitted: () => void }) {
  useEffect(() => {
    const interval = setInterval(async () => {
      const status = await api.get<{ admitted: boolean; position?: number }>("/queue/status");
      if (status.admitted) {
        clearInterval(interval);
        onAdmitted();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [onAdmitted]);

  return (
    <div className="max-w-md mx-auto m3-card p-10 text-center">
      <h1 className="text-xl font-bold mb-3">Изчакайте, моля</h1>
      <p style={{ color: "var(--color-text-muted)" }}>
        В момента има много хора, които закупуват билети. Моля, изчакайте.
      </p>
      {position && <p className="mt-4 font-semibold">Вашата позиция: {position}</p>}
      <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
        Страницата ще се обнови автоматично, когато достигнете своя ред.
      </p>
    </div>
  );
}
