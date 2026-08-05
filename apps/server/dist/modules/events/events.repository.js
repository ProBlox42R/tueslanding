import { randomUUID } from "node:crypto";
import { pool } from "../../config/db.js";
export const eventsRepository = {
    async create(params) {
        const id = randomUUID();
        await pool.query(`INSERT INTO events (id, venue_id, name, description, start_date, end_date, normal_price, vip_price)
       VALUES (:id, :venueId, :name, :description, :startDate, :endDate, :normalPrice, :vipPrice)`, { id, ...params });
        return id;
    },
    async findById(id) {
        const [rows] = await pool.query("SELECT * FROM events WHERE id = ? LIMIT 1", [id]);
        return rows[0] ?? null;
    },
    async update(id, params) {
        await pool.query(`UPDATE events SET name=:name, description=:description, start_date=:startDate,
       end_date=:endDate, normal_price=:normalPrice, vip_price=:vipPrice WHERE id=:id`, { id, ...params });
    },
    async setStatus(id, status) {
        await pool.query("UPDATE events SET status = ? WHERE id = ?", [status, id]);
    },
    async listPublished() {
        const [rows] = await pool.query("SELECT * FROM events WHERE status = 'PUBLISHED' ORDER BY start_date ASC");
        return rows;
    },
    async listAllForAdmin() {
        const [rows] = await pool.query("SELECT * FROM events ORDER BY created_at DESC");
        return rows;
    },
    /**
     * Генерира event_seats при публикуване на събитие: едно ред за всяко
     * продаваемо място (NORMAL/VIP) от залата, с цена спрямо типа.
     * AISLE местата се пропускат изцяло, BLOCKED местата стават BLOCKED event_seats.
     */
    async generateEventSeats(eventId, venueId, normalPrice, vipPrice) {
        const [seats] = await pool.query("SELECT id, seat_type FROM seats WHERE venue_id = ?", [venueId]);
        const rows = seats
            .filter((s) => s.seat_type !== "AISLE")
            .map((s) => {
            const price = s.seat_type === "VIP" ? vipPrice ?? normalPrice : normalPrice;
            const status = s.seat_type === "BLOCKED" ? "BLOCKED" : "AVAILABLE";
            return [randomUUID(), eventId, s.id, status, price];
        });
        if (rows.length === 0)
            return;
        const placeholders = rows.map(() => "(?, ?, ?, ?, ?)").join(", ");
        await pool.query(`INSERT INTO event_seats (id, event_id, seat_id, status, price) VALUES ${placeholders}`, rows.flat());
    },
    async getEventSeats(eventId) {
        const [rows] = await pool.query(`SELECT es.id, es.event_id, es.seat_id, es.status, es.price,
              s.row_label, s.seat_number, s.seat_type, s.pos_x, s.pos_y
       FROM event_seats es
       JOIN seats s ON s.id = es.seat_id
       WHERE es.event_id = ?
       ORDER BY s.row_label, s.seat_number`, [eventId]);
        return rows;
    },
    async getEventSeatsByIds(eventSeatIds) {
        if (eventSeatIds.length === 0)
            return [];
        const placeholders = eventSeatIds.map(() => "?").join(", ");
        const [rows] = await pool.query(`SELECT id, price FROM event_seats WHERE id IN (${placeholders})`, eventSeatIds);
        return rows;
    },
    async getRemainingCount(eventId) {
        const [rows] = await pool.query("SELECT COUNT(*) as cnt FROM event_seats WHERE event_id = ? AND status = 'AVAILABLE'", [eventId]);
        return Number(rows[0]?.cnt ?? 0);
    },
    async getSeatMapSnapshot(eventId) {
        const [rows] = await pool.query("SELECT id, status FROM event_seats WHERE event_id = ?", [eventId]);
        const seats = rows.map((r) => ({
            eventSeatId: r.id,
            status: r.status,
        }));
        const remainingTickets = seats.filter((s) => s.status === "AVAILABLE").length;
        return { remainingTickets, seats };
    },
    /** Заключва редовете на избраните event_seats FOR UPDATE в рамките на транзакция. */
    async lockEventSeats(conn, eventSeatIds) {
        if (eventSeatIds.length === 0)
            return [];
        const placeholders = eventSeatIds.map(() => "?").join(", ");
        const [rows] = await conn.query(`SELECT id, status FROM event_seats WHERE id IN (${placeholders}) FOR UPDATE`, eventSeatIds);
        return rows;
    },
    async markSeatsReserved(conn, eventSeatIds) {
        if (eventSeatIds.length === 0)
            return;
        const placeholders = eventSeatIds.map(() => "?").join(", ");
        await conn.query(`UPDATE event_seats SET status = 'RESERVED' WHERE id IN (${placeholders})`, eventSeatIds);
    },
    async markSeatsSold(conn, eventSeatIds) {
        if (eventSeatIds.length === 0)
            return;
        const placeholders = eventSeatIds.map(() => "?").join(", ");
        await conn.query(`UPDATE event_seats SET status = 'SOLD' WHERE id IN (${placeholders})`, eventSeatIds);
    },
    async markSeatsAvailable(conn, eventSeatIds) {
        if (eventSeatIds.length === 0)
            return;
        const placeholders = eventSeatIds.map(() => "?").join(", ");
        await conn.query(`UPDATE event_seats SET status = 'AVAILABLE' WHERE id IN (${placeholders})`, eventSeatIds);
    },
};
//# sourceMappingURL=events.repository.js.map