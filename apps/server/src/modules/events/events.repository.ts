import { randomUUID } from "node:crypto";
import type { PoolConnection } from "mysql2/promise";
import { pool } from "../../config/db.js";
import type { EventRecord, EventSeatRecord, EventStatus, SeatMapSnapshot } from "./events.types.js";

export const eventsRepository = {
  async create(params: {
    venueId: string;
    name: string;
    description: string | null;
    startDate: Date;
    endDate: Date | null;
    normalPrice: number;
    vipPrice: number | null;
  }): Promise<string> {
    const id = randomUUID();
    await pool.query(
      `INSERT INTO events (id, venue_id, name, description, start_date, end_date, normal_price, vip_price)
       VALUES (:id, :venueId, :name, :description, :startDate, :endDate, :normalPrice, :vipPrice)`,
      { id, ...params }
    );
    return id;
  },

  async findById(id: string): Promise<EventRecord | null> {
    const [rows] = await pool.query<any[]>("SELECT * FROM events WHERE id = ? LIMIT 1", [id]);
    return (rows[0] as EventRecord) ?? null;
  },

  async update(
    id: string,
    params: {
      name: string;
      description: string | null;
      startDate: Date;
      endDate: Date | null;
      normalPrice: number;
      vipPrice: number | null;
    }
  ): Promise<void> {
    await pool.query(
      `UPDATE events SET name=:name, description=:description, start_date=:startDate,
       end_date=:endDate, normal_price=:normalPrice, vip_price=:vipPrice WHERE id=:id`,
      { id, ...params }
    );
  },

  async setStatus(id: string, status: EventStatus): Promise<void> {
    await pool.query("UPDATE events SET status = ? WHERE id = ?", [status, id]);
  },

  async listPublished(): Promise<EventRecord[]> {
    const [rows] = await pool.query<any[]>(
      "SELECT * FROM events WHERE status = 'PUBLISHED' ORDER BY start_date ASC"
    );
    return rows as EventRecord[];
  },

  async listAllForAdmin(): Promise<EventRecord[]> {
    const [rows] = await pool.query<any[]>("SELECT * FROM events ORDER BY created_at DESC");
    return rows as EventRecord[];
  },

  /**
   * Генерира event_seats при публикуване на събитие: едно ред за всяко
   * продаваемо място (NORMAL/VIP) от залата, с цена спрямо типа.
   * AISLE местата се пропускат изцяло, BLOCKED местата стават BLOCKED event_seats.
   */
  async generateEventSeats(
    eventId: string,
    venueId: string,
    normalPrice: number,
    vipPrice: number | null
  ): Promise<void> {
    const [seats] = await pool.query<any[]>(
      "SELECT id, seat_type FROM seats WHERE venue_id = ?",
      [venueId]
    );
    const rows = (seats as Array<{ id: string; seat_type: string }>)
      .filter((s) => s.seat_type !== "AISLE")
      .map((s) => {
        const price =
          s.seat_type === "VIP" ? vipPrice ?? normalPrice : normalPrice;
        const status = s.seat_type === "BLOCKED" ? "BLOCKED" : "AVAILABLE";
        return [randomUUID(), eventId, s.id, status, price];
      });
    if (rows.length === 0) return;
    const placeholders = rows.map(() => "(?, ?, ?, ?, ?)").join(", ");
    await pool.query(
      `INSERT INTO event_seats (id, event_id, seat_id, status, price) VALUES ${placeholders}`,
      rows.flat()
    );
  },

  async getEventSeats(eventId: string): Promise<EventSeatRecord[]> {
    const [rows] = await pool.query<any[]>(
      `SELECT es.id, es.event_id, es.seat_id, es.status, es.price,
              s.row_label, s.seat_number, s.seat_type, s.pos_x, s.pos_y
       FROM event_seats es
       JOIN seats s ON s.id = es.seat_id
       WHERE es.event_id = ?
       ORDER BY s.row_label, s.seat_number`,
      [eventId]
    );
    return rows as EventSeatRecord[];
  },

  async getEventSeatsByIds(eventSeatIds: string[]): Promise<Array<{ id: string; price: string }>> {
    if (eventSeatIds.length === 0) return [];
    const placeholders = eventSeatIds.map(() => "?").join(", ");
    const [rows] = await pool.query<any[]>(
      `SELECT id, price FROM event_seats WHERE id IN (${placeholders})`,
      eventSeatIds
    );
    return rows as Array<{ id: string; price: string }>;
  },

  async getRemainingCount(eventId: string): Promise<number> {
    const [rows] = await pool.query<any[]>(
      "SELECT COUNT(*) as cnt FROM event_seats WHERE event_id = ? AND status = 'AVAILABLE'",
      [eventId]
    );
    return Number(rows[0]?.cnt ?? 0);
  },

  async getSeatMapSnapshot(eventId: string): Promise<SeatMapSnapshot> {
    const [rows] = await pool.query<any[]>(
      "SELECT id, status FROM event_seats WHERE event_id = ?",
      [eventId]
    );
    const seats = (rows as Array<{ id: string; status: string }>).map((r) => ({
      eventSeatId: r.id,
      status: r.status as any,
    }));
    const remainingTickets = seats.filter((s) => s.status === "AVAILABLE").length;
    return { remainingTickets, seats };
  },

  /** Заключва редовете на избраните event_seats FOR UPDATE в рамките на транзакция. */
  async lockEventSeats(conn: PoolConnection, eventSeatIds: string[]) {
    if (eventSeatIds.length === 0) return [];
    const placeholders = eventSeatIds.map(() => "?").join(", ");
    const [rows] = await conn.query<any[]>(
      `SELECT id, status FROM event_seats WHERE id IN (${placeholders}) FOR UPDATE`,
      eventSeatIds
    );
    return rows as Array<{ id: string; status: string }>;
  },

  async markSeatsReserved(conn: PoolConnection, eventSeatIds: string[]) {
    if (eventSeatIds.length === 0) return;
    const placeholders = eventSeatIds.map(() => "?").join(", ");
    await conn.query(
      `UPDATE event_seats SET status = 'RESERVED' WHERE id IN (${placeholders})`,
      eventSeatIds
    );
  },

  async markSeatsSold(conn: PoolConnection, eventSeatIds: string[]) {
    if (eventSeatIds.length === 0) return;
    const placeholders = eventSeatIds.map(() => "?").join(", ");
    await conn.query(
      `UPDATE event_seats SET status = 'SOLD' WHERE id IN (${placeholders})`,
      eventSeatIds
    );
  },

  async markSeatsAvailable(conn: PoolConnection, eventSeatIds: string[]) {
    if (eventSeatIds.length === 0) return;
    const placeholders = eventSeatIds.map(() => "?").join(", ");
    await conn.query(
      `UPDATE event_seats SET status = 'AVAILABLE' WHERE id IN (${placeholders})`,
      eventSeatIds
    );
  },
};
