import { Router } from "express";
import { subscribeToEvent } from "./event-bus.js";
import { eventsRepository } from "../events/events.repository.js";
export const realtimeRouter = Router();
/**
 * Server-Sent Events поток за конкретно събитие.
 * Изпраща:
 *  - веднага текущото състояние (snapshot) — за resync след reconnect
 *  - последващи update-и при промяна на местата/наличността
 */
realtimeRouter.get("/events/:eventId/stream", async (req, res) => {
    const { eventId } = req.params;
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
    });
    res.write("retry: 3000\n\n");
    // Snapshot веднага при връзка/reconnect, за да не пропусне клиентът нищо.
    const snapshot = await eventsRepository.getSeatMapSnapshot(eventId);
    res.write(`data: ${JSON.stringify({ type: "snapshot", ...snapshot })}\n\n`);
    const unsubscribe = subscribeToEvent(eventId, (payload) => {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
    });
    const heartbeat = setInterval(() => {
        res.write(": heartbeat\n\n");
    }, 25_000);
    req.on("close", () => {
        clearInterval(heartbeat);
        unsubscribe();
    });
});
//# sourceMappingURL=realtime.routes.js.map