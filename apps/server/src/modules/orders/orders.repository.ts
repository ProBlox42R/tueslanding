import { randomUUID } from "node:crypto";
import type { PoolConnection } from "mysql2/promise";
import { pool } from "../../config/db.js";
import type { OrderAdminRow, OrderRecord, OrderStatus } from "./orders.types.js";

export const ordersRepository = {
  async create(
    conn: PoolConnection,
    params: {
      userId: string;
      eventId: string;
      reservationId: string;
      totalAmount: number;
      status: OrderStatus;
      buyerName: string;
    }
  ): Promise<string> {
    const id = randomUUID();
    await conn.query(
      `INSERT INTO orders (id, user_id, event_id, reservation_id, total_amount, status, buyer_name)
       VALUES (:id, :userId, :eventId, :reservationId, :totalAmount, :status, :buyerName)`,
      { id, ...params }
    );
    return id;
  },

  async findById(id: string): Promise<OrderRecord | null> {
    const [rows] = await pool.query<any[]>("SELECT * FROM orders WHERE id = ? LIMIT 1", [id]);
    return (rows[0] as OrderRecord) ?? null;
  },

  async findByIdForUpdate(conn: PoolConnection, id: string): Promise<OrderRecord | null> {
    const [rows] = await conn.query<any[]>(
      "SELECT * FROM orders WHERE id = ? LIMIT 1 FOR UPDATE",
      [id]
    );
    return (rows[0] as OrderRecord) ?? null;
  },

  async setStatus(conn: PoolConnection, id: string, status: OrderStatus): Promise<void> {
    await conn.query("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
  },

  async listForUser(userId: string): Promise<OrderRecord[]> {
    const [rows] = await pool.query<any[]>(
      "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );
    return rows as OrderRecord[];
  },

  async listForAdmin(filter: { status?: OrderStatus; search?: string }): Promise<OrderAdminRow[]> {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};
    if (filter.status) {
      conditions.push("o.status = :status");
      params.status = filter.status;
    }
    if (filter.search) {
      conditions.push("(u.username LIKE :search OR u.email LIKE :search OR e.name LIKE :search)");
      params.search = `%${filter.search}%`;
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await pool.query<any[]>(
      `SELECT o.*, u.username, u.email, e.name AS event_name,
              (SELECT COUNT(*) FROM tickets t WHERE t.order_id = o.id) AS ticket_count
       FROM orders o
       JOIN users u ON u.id = o.user_id
       JOIN events e ON e.id = o.event_id
       ${where}
       ORDER BY o.created_at DESC
       LIMIT 200`,
      params as any
    );
    return rows as OrderAdminRow[];
  },
};
