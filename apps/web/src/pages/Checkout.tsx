import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

interface CheckoutSeat {
  event_seat_id: string;
  price: string;
  row_label: string;
  seat_number: number;
  seat_type: string;
}

interface CheckoutDetail {
  reservation: {
    id: string;
    expires_at: string;
    event_id: string;
    event_name: string;
    start_date: string;
    venue_name: string;
  };
  seats: CheckoutSeat[];
}

export function Checkout() {
  const { reservationId } = useParams<{ reservationId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<CheckoutDetail | null>(null);
  const [buyerName, setBuyerName] = useState(user?.username ?? "");
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!reservationId) return;
    api
      .get<CheckoutDetail>(`/reservations/${reservationId}`)
      .then(setData)
      .catch(() => setNotFound(true));
  }, [reservationId]);

  useEffect(() => {
    if (!data) return;
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(data.reservation.expires_at).getTime() - Date.now()) / 1000)
      );
      setSecondsLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [data]);

  async function onCancel() {
    if (!reservationId) return;
    setBusy(true);
    try {
      await api.delete(`/reservations/${reservationId}`);
    } finally {
      navigate(-1);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reservationId) return;
    setError(null);
    setBusy(true);
    try {
      const res = await api.post<{ orderId: string }>("/orders/checkout", {
        reservationId,
        buyerName,
      });
      navigate(`/my-tickets?justPaid=${res.orderId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Възникна грешка.");
    } finally {
      setBusy(false);
    }
  }

  if (notFound || (data && secondsLeft === 0)) {
    return (
      <div className="max-w-md mx-auto m3-card p-8 text-center">
        <h1 className="text-xl font-bold mb-3">Резервацията изтече</h1>
        <p style={{ color: "var(--color-text-muted)" }}>
          Времето за завършване на покупката е изтекло. Моля, изберете местата отново.
        </p>
        <button className="m3-btn-filled mt-6" onClick={() => navigate("/")}>
          Обратно към събитията
        </button>
      </div>
    );
  }

  if (!data) return <p>Зареждане...</p>;

  const total = data.seats.reduce((sum, s) => sum + Number(s.price), 0);

  return (
    <div className="max-w-2xl mx-auto grid gap-6">
      <div className="m3-card p-6">
        <h1 className="text-xl font-bold mb-1">{data.reservation.event_name}</h1>
        <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
          {data.reservation.venue_name} ·{" "}
          {new Date(data.reservation.start_date).toLocaleString("bg-BG", {
            dateStyle: "long",
            timeStyle: "short",
          })}
        </p>

        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="text-left border-b" style={{ borderColor: "var(--color-outline-variant)" }}>
              <th className="py-2">Място</th>
              <th className="py-2">Тип</th>
              <th className="py-2 text-right">Цена</th>
            </tr>
          </thead>
          <tbody>
            {data.seats.map((s) => (
              <tr key={s.event_seat_id} className="border-b last:border-0" style={{ borderColor: "var(--color-outline-variant)" }}>
                <td className="py-2">Ред {s.row_label}, място {s.seat_number}</td>
                <td className="py-2">{s.seat_type === "VIP" ? "VIP" : "Нормален"}</td>
                <td className="py-2 text-right">{s.price} лв.</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between items-center font-bold text-lg mb-2">
          <span>Общо</span>
          <span>{total.toFixed(2)} лв.</span>
        </div>

        <p className="text-sm" style={{ color: "var(--color-warning)" }}>
          Резервацията изтича след {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
        </p>
      </div>

      <form onSubmit={onSubmit} className="m3-card p-6">
        <h2 className="font-semibold mb-4">Данни за билета</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Име на притежателя на билета</label>
          <input
            className="m3-input"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            required
            minLength={2}
            maxLength={150}
          />
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            Това име ще бъде отпечатано на билета.
          </p>
        </div>

        {error && <p className="text-sm mb-3" style={{ color: "var(--color-error)" }}>{error}</p>}

        <div className="flex gap-2">
          <button type="submit" className="m3-btn-filled flex-1" disabled={busy}>
            {busy ? "Обработка на поръчката..." : `Купи за ${total.toFixed(2)} лв.`}
          </button>
          <button type="button" className="m3-btn-outlined" disabled={busy} onClick={onCancel}>
            Откажи
          </button>
        </div>
      </form>
    </div>
  );
}
