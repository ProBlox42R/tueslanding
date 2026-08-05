import { randomUUID } from "node:crypto";
import type { PoolConnection } from "mysql2/promise";
import { pool } from "../../config/db.js";

export const reservationsRepository = {
  async create(
    conn: PoolConnection,
    params: { userId: string; eventId: string; expiresAt: Date; eventSeatIds: string[] }
  ): Promise<string> {
    const id = randomUUID();
    await conn.query(
      `INSERT INTO reservations (id, user_id, event_id, status, expires_at)
       VALUES (:id, :userId, :eventId, 'ACTIVE', :expiresAt)`,
      { id, userId: params.userId, eventId: params.eventId, expiresAt: params.expiresAt }
    );
    if (params.eventSeatIds.length > 0) {
      const placeholders = params.eventSeatIds.map(() => "(?, ?)").join(", ");
      const flat = params.eventSeatIds.flatMap((seatId) => [id, seatId]);
      await conn.query(
        `INSERT INTO reservation_seats (reservation_id, event_seat_id) VALUES ${placeholders}`,
        flat
      );
    }
    return id;
  },

  async findActiveById(id: string) {
    const [rows] = await pool.query<any[]>(
      "SELECT * FROM reservations WHERE id = ? AND status = 'ACTIVE' LIMIT 1",
      [id]
    );
    return rows[0] ?? null;
  },

  async findActiveByIdForUpdate(conn: PoolConnection, id: string) {
    const [rows] = await conn.query<any[]>(
      "SELECT * FROM reservations WHERE id = ? LIMIT 1 FOR UPDATE",
      [id]
    );
    return rows[0] ?? null;
  },

  async getSeatIds(reservationId: string): Promise<string[]> {
    const [rows] = await pool.query<any[]>(
      "SELECT event_seat_id FROM reservation_seats WHERE reservation_id = ?",
      [reservationId]
    );
    return (rows as Array<{ event_seat_id: string }>).map((r) => r.event_seat_id);
  },

  async markConverted(conn: PoolConnection, id: string): Promise<void> {
    await conn.query("UPDATE reservations SET status = 'CONVERTED' WHERE id = ?", [id]);
  },

  async markCancelled(conn: PoolConnection, id: string): Promise<void> {
    await conn.query("UPDATE reservations SET status = 'CANCELLED' WHERE id = ?", [id]);
  },

  /** Намира всички изтекли активни резервации (за периодичния sweep job). */
  async findExpiredActive(conn: PoolConnection) {
    const [rows] = await conn.query<any[]>(
      "SELECT id, event_id FROM reservations WHERE status = 'ACTIVE' AND expires_at <= NOW(3) FOR UPDATE"
    );
    return rows as Array<{ id: string; event_id: string }>;
  },

  async markExpired(conn: PoolConnection, id: string): Promise<void> {
    await conn.query("UPDATE reservations SET status = 'EXPIRED' WHERE id = ?", [id]);
  },

  /** Пълна информация за checkout страницата: събитие, зала, места, цени. */
  async findCheckoutDetail(id: string) {
    const [rows] = await pool.query<any[]>(
      `SELECT r.id, r.user_id, r.status, r.expires_at,
              e.id AS event_id, e.name AS event_name, e.start_date,
              v.name AS venue_name
       FROM reservations r
       JOIN events e ON e.id = r.event_id
       JOIN venues v ON v.id = e.venue_id
       WHERE r.id = ?
       LIMIT 1`,
      [id]
    );
    const reservation = rows[0];
    if (!reservation) return null;

    const [seatRows] = await pool.query<any[]>(
      `SELECT es.id AS event_seat_id, es.price, s.row_label, s.seat_number, s.seat_type
       FROM reservation_seats rs
       JOIN event_seats es ON es.id = rs.event_seat_id
       JOIN seats s ON s.id = es.seat_id
       WHERE rs.reservation_id = ?
       ORDER BY s.row_label, s.seat_number`,
      [id]
    );

    return { reservation, seats: seatRows };
  },
};
