import { randomUUID } from "node:crypto";
import { pool } from "../../config/db.js";
export const venuesRepository = {
    async create(params) {
        const id = randomUUID();
        await pool.query(`INSERT INTO venues (id, name, description, rows_count, seats_per_row)
       VALUES (:id, :name, :description, :rowsCount, :seatsPerRow)`, { id, ...params });
        return id;
    },
    /** Генерира правоъгълна мрежа от места (по подразбиране всички NORMAL). */
    async generateGridSeats(venueId, rowsCount, seatsPerRow) {
        const rows = [];
        for (let r = 0; r < rowsCount; r++) {
            const rowLabel = indexToRowLabel(r);
            for (let n = 1; n <= seatsPerRow; n++) {
                rows.push([randomUUID(), venueId, rowLabel, String(n), String(n * 40), String(r * 40)]);
            }
        }
        if (rows.length === 0)
            return;
        const placeholders = rows.map(() => "(?, ?, ?, ?, 'NORMAL', ?, ?)").join(", ");
        const flat = rows.flatMap(([id, vId, rowLabel, num, posX, posY]) => [
            id,
            vId,
            rowLabel,
            num,
            posX,
            posY,
        ]);
        await pool.query(`INSERT INTO seats (id, venue_id, row_label, seat_number, seat_type, pos_x, pos_y)
       VALUES ${placeholders}`, flat);
    },
    async findById(id) {
        const [rows] = await pool.query("SELECT * FROM venues WHERE id = ? LIMIT 1", [id]);
        return rows[0] ?? null;
    },
    async listAll() {
        const [rows] = await pool.query("SELECT * FROM venues ORDER BY created_at DESC");
        return rows;
    },
    async getSeats(venueId) {
        const [rows] = await pool.query("SELECT * FROM seats WHERE venue_id = ? ORDER BY row_label, seat_number", [venueId]);
        return rows;
    },
    async update(id, params) {
        await pool.query("UPDATE venues SET name = ?, description = ? WHERE id = ?", [
            params.name,
            params.description,
            id,
        ]);
    },
    async updateSeatType(seatId, venueId, seatType) {
        await pool.query("UPDATE seats SET seat_type = ? WHERE id = ? AND venue_id = ?", [
            seatType,
            seatId,
            venueId,
        ]);
    },
    async addSeat(params) {
        const id = randomUUID();
        await pool.query(`INSERT INTO seats (id, venue_id, row_label, seat_number, pos_x, pos_y, seat_type)
       VALUES (:id, :venueId, :rowLabel, :seatNumber, :posX, :posY, :seatType)`, { id, ...params });
        return id;
    },
    async removeSeat(seatId, venueId) {
        await pool.query("DELETE FROM seats WHERE id = ? AND venue_id = ?", [seatId, venueId]);
    },
};
function indexToRowLabel(index) {
    // 0 -> A, 1 -> B ... 25 -> Z, 26 -> AA ...
    let label = "";
    let n = index;
    do {
        label = String.fromCharCode(65 + (n % 26)) + label;
        n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return label;
}
//# sourceMappingURL=venues.repository.js.map