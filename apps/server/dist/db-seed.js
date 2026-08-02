import { randomUUID } from "node:crypto";
import { pool } from "./config/db.js";
import { hashPassword } from "./utils/password.js";
import { venuesRepository } from "./modules/venues/venues.repository.js";
import { eventsRepository } from "./modules/events/events.repository.js";
/**
 * Seed данни само за development среда.
 * ВНИМАНИЕ: паролите тук са само за локална разработка — никога не ги
 * използвайте в production.
 */
async function main() {
    if (process.env.NODE_ENV === "production") {
        console.error("Отказ: seed скриптът не трябва да се изпълнява в production.");
        process.exit(1);
    }
    const [[existingVenue]] = await pool.query("SELECT id FROM venues LIMIT 1");
    if (existingVenue) {
        console.log("Seed данните вече изглеждат заредени (намерена е зала) — пропускане.");
        await pool.end();
        return;
    }
    const adminId = randomUUID();
    const userId = randomUUID();
    const adminPass = await hashPassword("Admin123!");
    const userPass = await hashPassword("Parola123!");
    await pool.query(`INSERT IGNORE INTO users (id, username, email, password_hash, email_verified, role)
     VALUES
     (:adminId, 'admin', 'admin@example.com', :adminPass, 1, 'ADMIN'),
     (:userId, 'demo_user', 'user@example.com', :userPass, 1, 'USER')`, { adminId, adminPass, userId, userPass });
    const venueId = await venuesRepository.create({
        name: "Демо зала",
        description: "Примерна зала за тестове — 5 реда по 10 места, с два коридора и VIP редица.",
        rowsCount: 5,
        seatsPerRow: 10,
    });
    await venuesRepository.generateGridSeats(venueId, 5, 10);
    // Направи първия ред VIP и блокирай две места, за демонстрация на editor-а.
    const seats = await venuesRepository.getSeats(venueId);
    for (const seat of seats) {
        if (seat.row_label === "A") {
            await venuesRepository.updateSeatType(seat.id, venueId, "VIP");
        }
        if (seat.row_label === "C" && (seat.seat_number === 5 || seat.seat_number === 6)) {
            await venuesRepository.updateSeatType(seat.id, venueId, "BLOCKED");
        }
    }
    const eventId = await eventsRepository.create({
        venueId,
        name: "Демо концерт — Билети Live",
        description: "Примерно събитие за тестване на цялата система от край до край.",
        startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        endDate: null,
        normalPrice: 25,
        vipPrice: 60,
    });
    await eventsRepository.generateEventSeats(eventId, venueId, 25, 60);
    await eventsRepository.setStatus(eventId, "PUBLISHED");
    console.log("Seed данните са добавени успешно.");
    console.log("--------------------------------------------------");
    console.log("Демо акаунти (само за development):");
    console.log("  ADMIN       -> admin@example.com / Admin123!");
    console.log("  USER        -> user@example.com / Parola123!");
    console.log("Демо събитие -> публикувано, готово за резервация/покупка.");
    console.log("--------------------------------------------------");
    await pool.end();
}
main().catch((err) => {
    console.error("Грешка при seed-ване:", err);
    process.exit(1);
});
//# sourceMappingURL=db-seed.js.map