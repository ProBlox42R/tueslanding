import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { AdminNav } from "../../components/AdminNav";

interface Venue {
  id: string;
  name: string;
  description: string | null;
  rows_count: number;
  seats_per_row: number;
}

interface Seat {
  id: string;
  row_label: string;
  seat_number: number;
  seat_type: "NORMAL" | "VIP" | "BLOCKED" | "AISLE";
}

const seatTypeCycle: Seat["seat_type"][] = ["NORMAL", "VIP", "BLOCKED", "AISLE"];
const seatTypeLabel: Record<Seat["seat_type"], string> = {
  NORMAL: "Нормално",
  VIP: "VIP",
  BLOCKED: "Блокирано",
  AISLE: "Коридор",
};
const seatTypeColor: Record<Seat["seat_type"], string> = {
  NORMAL: "var(--color-surface-variant)",
  VIP: "var(--color-brand-container, #FFDAD8)",
  BLOCKED: "var(--color-outline)",
  AISLE: "transparent",
};

export function AdminVenues() {
  const [venues, setVenues] = useState<Venue[] | null>(null);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function loadVenues() {
    const res = await api.get<{ venues: Venue[] }>("/venues");
    setVenues(res.venues);
  }

  useEffect(() => {
    loadVenues();
  }, []);

  return (
    <div>
      <AdminNav />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Зали</h1>
        <button className="m3-btn-filled" onClick={() => setShowCreate(true)}>Нова зала</button>
      </div>

      {showCreate && (
        <CreateVenueForm
          onCreated={async () => {
            setShowCreate(false);
            await loadVenues();
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {!venues ? (
        <p>Зареждане...</p>
      ) : venues.length === 0 ? (
        <div className="m3-card p-10 text-center">
          <h2 className="text-lg font-semibold mb-2">Няма зали</h2>
          <p style={{ color: "var(--color-text-muted)" }}>Създайте първата си зала, за да можете да добавяте събития.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {venues.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedVenueId(v.id)}
              className="m3-card p-5 text-left hover:shadow-m3-2 transition-shadow"
            >
              <h3 className="font-semibold">{v.name}</h3>
              <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
                {v.rows_count} реда × {v.seats_per_row} места
              </p>
            </button>
          ))}
        </div>
      )}

      {selectedVenueId && (
        <SeatEditor venueId={selectedVenueId} onClose={() => setSelectedVenueId(null)} />
      )}
    </div>
  );
}

function CreateVenueForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ name: "", description: "", rowsCount: 10, seatsPerRow: 12 });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/venues", {
        name: form.name,
        description: form.description || null,
        rowsCount: Number(form.rowsCount),
        seatsPerRow: Number(form.seatsPerRow),
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
        <label className="block text-sm font-medium mb-1">Име на залата</label>
        <input className="m3-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium mb-1">Описание</label>
        <input className="m3-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Редове</label>
        <input type="number" min={1} className="m3-input" value={form.rowsCount} onChange={(e) => setForm({ ...form, rowsCount: Number(e.target.value) })} required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Места на ред</label>
        <input type="number" min={1} className="m3-input" value={form.seatsPerRow} onChange={(e) => setForm({ ...form, seatsPerRow: Number(e.target.value) })} required />
      </div>
      {error && <p className="sm:col-span-2 text-sm" style={{ color: "var(--color-error)" }}>{error}</p>}
      <div className="sm:col-span-2 flex gap-2">
        <button type="submit" className="m3-btn-filled" disabled={loading}>{loading ? "Създаване..." : "Създай зала"}</button>
        <button type="button" className="m3-btn-outlined" onClick={onCancel}>Отказ</button>
      </div>
    </form>
  );
}

function SeatEditor({ venueId, onClose }: { venueId: string; onClose: () => void }) {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);

  async function load() {
    const res = await api.get<{ venue: Venue; seats: Seat[] }>(`/venues/${venueId}`);
    setVenue(res.venue);
    setSeats(res.seats);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  const seatsByRow = useMemo(() => {
    const map = new Map<string, Seat[]>();
    for (const seat of seats) {
      if (!map.has(seat.row_label)) map.set(seat.row_label, []);
      map.get(seat.row_label)!.push(seat);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([row, list]) => [row, list.sort((a, b) => a.seat_number - b.seat_number)] as const);
  }, [seats]);

  async function cycleSeatType(seat: Seat) {
    const currentIndex = seatTypeCycle.indexOf(seat.seat_type);
    const nextType = seatTypeCycle[(currentIndex + 1) % seatTypeCycle.length];
    setSeats((prev) => prev.map((s) => (s.id === seat.id ? { ...s, seat_type: nextType } : s)));
    await api.patch(`/venues/${venueId}/seats/${seat.id}`, { seatType: nextType });
  }

  if (!venue) return <p>Зареждане...</p>;

  return (
    <div className="m3-card p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Редактор на места — {venue.name}</h2>
        <button className="m3-btn-text" onClick={onClose}>Затвори</button>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
        Кликнете върху място, за да превключите типа му: Нормално → VIP → Блокирано → Коридор.
      </p>
      <div className="flex gap-4 mb-4 text-sm flex-wrap">
        {seatTypeCycle.map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-sm border" style={{ backgroundColor: seatTypeColor[t], borderColor: "var(--color-outline-variant)" }} />
            {seatTypeLabel[t]}
          </span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-2">
          {seatsByRow.map(([row, list]) => (
            <div key={row} className="flex items-center gap-2">
              <span className="w-6 text-sm text-right font-medium" style={{ color: "var(--color-text-muted)" }}>{row}</span>
              <div className="flex gap-1.5">
                {list.map((seat) => (
                  <button
                    key={seat.id}
                    onClick={() => cycleSeatType(seat)}
                    className="w-8 h-8 rounded-md text-[10px] font-semibold border flex items-center justify-center"
                    style={{
                      backgroundColor: seatTypeColor[seat.seat_type],
                      borderColor: "var(--color-outline-variant)",
                      color: "var(--color-text)",
                    }}
                  >
                    {seat.seat_type !== "AISLE" ? seat.seat_number : ""}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
