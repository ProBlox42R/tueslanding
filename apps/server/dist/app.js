import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { attachUser } from "./middleware/auth-guard.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { venuesRouter } from "./modules/venues/venues.routes.js";
import { eventsRouter, eventsAdminRouter } from "./modules/events/events.routes.js";
import { reservationsRouter } from "./modules/reservations/reservations.routes.js";
import { ordersRouter, ordersAdminRouter } from "./modules/orders/orders.routes.js";
import { ticketsRouter } from "./modules/tickets/tickets.routes.js";
import { scannerRouter } from "./modules/scanner/scanner.routes.js";
import { queueRouter } from "./modules/queue/queue.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { realtimeRouter } from "./modules/realtime/realtime.routes.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// След `npm run build --workspace=apps/web` статичните файлове са тук.
// Ако папката липсва (напр. активна разработка с `npm run dev`, където
// Vite сервира фронтенда отделно с hot-reload), просто пропускаме тази
// част — API-то работи по същия начин и в двата случая.
const WEB_DIST_DIR = path.resolve(__dirname, "../../web/dist");
const hasWebBuild = fs.existsSync(path.join(WEB_DIST_DIR, "index.html"));
export function createApp() {
    const app = express();
    app.set("trust proxy", 1);
    app.use(helmet({
        contentSecurityPolicy: false, // конфигурира се детайлно според фронтенда
    }));
    app.use(cors({
        origin: env.WEB_BASE_URL,
        credentials: true,
    }));
    app.use(express.json({ limit: "1mb" }));
    app.use(cookieParser());
    app.use(attachUser);
    app.get("/health", (_req, res) => res.json({ status: "ok" }));
    app.use("/api/auth", authRouter);
    app.use("/api/venues", venuesRouter);
    app.use("/api/events", eventsRouter);
    app.use("/api/admin/events", eventsAdminRouter);
    app.use("/api/reservations", reservationsRouter);
    app.use("/api/orders", ordersRouter);
    app.use("/api/admin/orders", ordersAdminRouter);
    app.use("/api/tickets", ticketsRouter);
    app.use("/api/scanner", scannerRouter);
    app.use("/api/queue", queueRouter);
    app.use("/api/admin", adminRouter);
    app.use("/api/realtime", realtimeRouter);
    if (hasWebBuild) {
        // Едно приложение, един порт: сервираме готовия React build директно
        // от същия Express сървър. Всичко извън /api/... и /health пада към
        // index.html, за да работи client-side routing-ът (React Router) при
        // директно отваряне/презареждане на произволен адрес (напр. /events/123).
        app.use(express.static(WEB_DIST_DIR, { index: false }));
        app.get(/^(?!\/api|\/health).*/, (_req, res) => {
            res.sendFile(path.join(WEB_DIST_DIR, "index.html"));
        });
    }
    app.use("/api", notFoundHandler);
    app.use(errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map