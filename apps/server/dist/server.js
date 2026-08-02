import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { reservationsService } from "./modules/reservations/reservations.service.js";
const app = createApp();
app.listen(env.PORT, () => {
    console.log(`[Билети] Сървърът работи на порт ${env.PORT} (${env.NODE_ENV})`);
});
// Периодично освобождава местата на изтекли резервации (спецификация т. 20).
// На всеки 15 секунди е достатъчно често за TTL от няколко минути и не
// натоварва базата при десетки едновременни потребители.
const SWEEP_INTERVAL_MS = 15_000;
setInterval(() => {
    reservationsService.expireOverdueReservations().catch((err) => {
        console.error("Грешка при обработка на изтекли резервации:", err);
    });
}, SWEEP_INTERVAL_MS);
//# sourceMappingURL=server.js.map