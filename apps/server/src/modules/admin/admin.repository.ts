import { randomUUID } from "node:crypto";
import { pool } from "../../config/db.js";
import { hashPassword } from "../../utils/password.js";

export const adminRepository = {
  async getStats() {
    const [[activeEvents]] = await pool.query<any[]>(
      "SELECT COUNT(*) as cnt FROM events WHERE status = 'PUBLISHED'"
    );
    const [[soldTickets]] = await pool.query<any[]>(
      "SELECT COUNT(*) as cnt FROM tickets WHERE status IN ('VALID','USED')"
    );
    const [[availableSeats]] = await pool.query<any[]>(
      "SELECT COUNT(*) as cnt FROM event_seats WHERE status = 'AVAILABLE'"
    );
    const [[paidOrders]] = await pool.query<any[]>(
      "SELECT COUNT(*) as cnt FROM orders WHERE status = 'PAID'"
    );
    const [[unpaidOrders]] = await pool.query<any[]>(
      "SELECT COUNT(*) as cnt FROM orders WHERE status = 'UNPAID'"
    );
    const [[usedTickets]] = await pool.query<any[]>(
      "SELECT COUNT(*) as cnt FROM tickets WHERE status = 'USED'"
    );
    const [[revenue]] = await pool.query<any[]>(
      "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = 'PAID'"
    );

    return {
      activeEvents: Number(activeEvents.cnt),
      soldTickets: Number(soldTickets.cnt),
      availableSeats: Number(availableSeats.cnt),
      paidOrders: Number(paidOrders.cnt),
      unpaidOrders: Number(unpaidOrders.cnt),
      usedTickets: Number(usedTickets.cnt),
      revenue: Number(revenue.total),
    };
  },

  async listAdmins() {
    const [rows] = await pool.query<any[]>(
      "SELECT id, username, email, role, is_active, created_at FROM users WHERE role = 'ADMIN' ORDER BY created_at DESC"
    );
    return rows;
  },

  async createAdmin(params: { username: string; email: string; password: string }) {
    const id = randomUUID();
    const passwordHash = await hashPassword(params.password);
    await pool.query(
      `INSERT INTO users (id, username, email, password_hash, email_verified, role)
       VALUES (:id, :username, :email, :passwordHash, 1, 'ADMIN')`,
      { id, username: params.username, email: params.email, passwordHash }
    );
    return id;
  },

  async setAdminActive(userId: string, isActive: boolean) {
    await pool.query(
      "UPDATE users SET is_active = ? WHERE id = ? AND role = 'ADMIN'",
      [isActive ? 1 : 0, userId]
    );
  },
};
