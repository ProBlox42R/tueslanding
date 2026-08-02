import type { PoolConnection } from "mysql2/promise";
import { pool } from "../../config/db.js";
import type { TicketDetail, TicketRecord } from "./tickets.types.js";

const DETAIL_JOIN = `
  SELECT t.*, e.name AS event_name, e.start_date, v.name AS venue_name,
         s.row_label, s.seat_number, s.seat_type, es.price,
         u.username, u.email, o.buyer_name
  FROM tickets t
  JOIN events e ON e.id = t.event_id
  JOIN venues v ON v.id = e.venue_id
  JOIN event_seats es ON es.id = t.event_seat_id
  JOIN seats s ON s.id = es.seat_id
  JOIN users u ON u.id = t.user_id
  JOIN orders o ON o.id = t.order_id
`;

export const ticketsRepository = {
  async create(
    conn: PoolConnection,
    params: {
      id: string;
      orderId: string;
      userId: string;
      eventId: string;
      eventSeatId: string;
      qrTokenHash: string;
    }
  ): Promise<void> {
    await conn.query(
      `INSERT INTO tickets (id, order_id, user_id, event_id, event_seat_id, qr_token_hash)
       VALUES (:id, :orderId, :userId, :eventId, :eventSeatId, :qrTokenHash)`,
      params
    );
  },

  async setPdfObjectKey(ticketId: string, key: string): Promise<void> {
    await pool.query("UPDATE tickets SET pdf_object_key = ? WHERE id = ?", [key, ticketId]);
  },

  async findDetailById(id: string): Promise<TicketDetail | null> {
    const [rows] = await pool.query<any[]>(`${DETAIL_JOIN} WHERE t.id = ? LIMIT 1`, [id]);
    return (rows[0] as TicketDetail) ?? null;
  },

  async findDetailByQrTokenHashForUpdate(
    conn: PoolConnection,
    qrTokenHash: string
  ): Promise<TicketDetail | null> {
    const [rows] = await conn.query<any[]>(
      `${DETAIL_JOIN} WHERE t.qr_token_hash = ? LIMIT 1 FOR UPDATE`,
      [qrTokenHash]
    );
    return (rows[0] as TicketDetail) ?? null;
  },

  async markUsed(conn: PoolConnection, id: string): Promise<void> {
    await conn.query("UPDATE tickets SET status = 'USED', used_at = NOW(3) WHERE id = ?", [id]);
  },

  async markRefunded(conn: PoolConnection, id: string): Promise<void> {
    await conn.query("UPDATE tickets SET status = 'REFUNDED' WHERE id = ?", [id]);
  },

  async listForUser(userId: string): Promise<TicketDetail[]> {
    const [rows] = await pool.query<any[]>(
      `${DETAIL_JOIN} WHERE t.user_id = ? ORDER BY e.start_date DESC`,
      [userId]
    );
    return rows as TicketDetail[];
  },

  async listForOrder(orderId: string): Promise<TicketRecord[]> {
    const [rows] = await pool.query<any[]>("SELECT * FROM tickets WHERE order_id = ?", [orderId]);
    return rows as TicketRecord[];
  },

  async insertScanLog(params: {
    id: string;
    ticketId: string;
    scannedBy: string;
    result: "VALID" | "ALREADY_USED" | "INVALID";
  }): Promise<void> {
    await pool.query(
      `INSERT INTO ticket_scan_log (id, ticket_id, scanned_by, result)
       VALUES (:id, :ticketId, :scannedBy, :result)`,
      params
    );
  },
};
