import { EventEmitter } from "node:events";
/**
 * Централен in-process event bus за realtime съобщения.
 * За единичен Node процес (какъвто е този проект) това е достатъчно;
 * ако някога се стартират няколко инстанции на сървъра, тук се сменя
 * с Redis pub/sub без да се пипа останалият код, защото модулите
 * извикват само publish()/subscribe() от този файл.
 */
class RealtimeBus extends EventEmitter {
}
export const realtimeBus = new RealtimeBus();
realtimeBus.setMaxListeners(0);
export function publishSeatMapUpdate(payload) {
    realtimeBus.emit(`event:${payload.eventId}`, payload);
}
export function publishQueueAdmission(payload) {
    realtimeBus.emit(`event:${payload.eventId}`, payload);
}
export function subscribeToEvent(eventId, listener) {
    realtimeBus.on(`event:${eventId}`, listener);
    return () => realtimeBus.off(`event:${eventId}`, listener);
}
//# sourceMappingURL=event-bus.js.map