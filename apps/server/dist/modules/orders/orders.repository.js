import { randomUUID } from "node:crypto";
import { pool } from "../../config/db.js";
export const ordersRepository = {
    async create(conn, params) {
        const id = randomUUID();
        await conn.query(`INSERT INTO orders (id, user_id, event_id, reservation_id, total_amount, status, buyer_name)
       VALUES (:id, :userId, :eventId, :reservationId, :totalAmount, :status, :buyerName)`, { id, ...params });
        return id;
    },
    async findById(id) {
        const [rows] = await pool.query("SELECT * FROM orders WHERE id = ? LIMIT 1", [id]);
        return rows[0] ?? null;
    },
    async findByIdForUpdate(conn, id) {
        const [rows] = await conn.query("SELECT * FROM orders WHERE id = ? LIMIT 1 FOR UPDATE", [id]);
        return rows[0] ?? null;
    },
    async setStatus(conn, id, status) {
        await conn.query("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
    },
    async listForUser(userId) {
        const [rows] = await pool.query("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", [userId]);
        return rows;
    },
    async listForAdmin(filter) {
        const conditions = [];
        const params = {};
        if (filter.status) {
            conditions.push("o.status = :status");
            params.status = filter.status;
        }
        if (filter.search) {
            conditions.push("(u.username LIKE :search OR u.email LIKE :search OR e.name LIKE :search)");
            params.search = `%${filter.search}%`;
        }
        const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const [rows] = await pool.query(`SELECT o.*, u.username, u.email, e.name AS event_name,
              (SELECT COUNT(*) FROM tickets t WHERE t.order_id = o.id) AS ticket_count
       FROM orders o
       JOIN users u ON u.id = o.user_id
       JOIN events e ON e.id = o.event_id
       ${where}
       ORDER BY o.created_at DESC
       LIMIT 200`, params);
        return rows;
    },
};
//# sourceMappingURL=orders.repository.js.map