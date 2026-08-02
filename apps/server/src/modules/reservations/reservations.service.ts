import { withTransaction } from "../../config/db.js";
import { reservationsRepository } from "./reservations.repository.js";
import { eventsRepository } from "../events/events.repository.js";
import { env } from "../../config/env.js";
import { BadRequest, Conflict, Forbidden, NotFound } from "../../utils/http-error.js";
import { publishSeatMapUpdate } from "../realtime/event-bus.js";

export const reservationsService = {
  /**
   * Резервира конкретни местата за дадено събитие.
   *
   * Критична секция (спецификация, т. 21 "Concurrency / Race Conditions"):
   * - заключваме event_seats редовете чрез SELECT ... FOR UPDATE вътре в
   *   транзакция, преди да проверим наличността;
   * - ако друг request държи заключването върху някое от същите места,
   *   този request изчаква до COMMIT/ROLLBACK на другия — при MySQL InnoDB
   *   row locks това дава естествено first-come-first-served поведение;
   * - никога не разчитаме на проверка от frontend-а.
   */
  async reserveSeats(params: {
    userId: string;
    eventId: string;
    eventSeatIds: string[];
  }): Promise<{ reservationId: string; expiresAt: Date }> {
    if (params.eventSeatIds.length === 0) {
      throw BadRequest("Изберете поне едно място.");
    }

    const event = await eventsRepository.findById(params.eventId);
    if (!event || event.status !== "PUBLISHED") {
      throw NotFound("Събитието не е налично за продажба.");
    }

    const result = await withTransaction(async (conn) => {
      // Заключва редовете на избраните места — блокира до освобождаване,
      // ако друг паралелен request в момента ги обработва.
      const locked = await eventsRepository.lockEventSeats(conn, params.eventSeatIds);

      if (locked.length !== params.eventSeatIds.length) {
        throw NotFound("Едно или повече от избраните места не съществуват.");
      }
      const notAvailable = locked.filter((s) => s.status !== "AVAILABLE");
      if (notAvailable.length > 0) {
        throw Conflict(
          "За съжаление едно или повече от избраните места вече не са налични. Моля, изберете други."
        );
      }

      const expiresAt = new Date(Date.now() + env.RESERVATION_TTL_MINUTES * 60 * 1000);
      const reservationId = await reservationsRepository.create(conn, {
        userId: params.userId,
        eventId: params.eventId,
        expiresAt,
        eventSeatIds: params.eventSeatIds,
      });
      await eventsRepository.markSeatsReserved(conn, params.eventSeatIds);

      return { reservationId, expiresAt };
    });

    await broadcastEventState(params.eventId);
    return result;
  },

  async cancelReservation(params: { userId: string; reservationId: string }): Promise<void> {
    await withTransaction(async (conn) => {
      const reservation = await reservationsRepository.findActiveByIdForUpdate(
        conn,
        params.reservationId
      );
      if (!reservation) throw NotFound("Резервацията не е намерена.");
      if (reservation.user_id !== params.userId) throw Forbidden();
      if (reservation.status !== "ACTIVE") return;

      const seatIds = await reservationsRepository.getSeatIds(params.reservationId);
      await eventsRepository.markSeatsAvailable(conn, seatIds);
      await reservationsRepository.markCancelled(conn, params.reservationId);
    });
    const reservation = await reservationsRepository.findActiveById(params.reservationId);
    if (reservation) await broadcastEventState(reservation.event_id);
  },

  /**
   * Периодичен sweep за изтекли резервации (стартира се от server.ts).
   * Заключва всеки изтекъл ред, освобождава местата и маркира резервацията
   * EXPIRED, всичко в рамките на транзакция за атомарност.
   */
  async expireOverdueReservations(): Promise<void> {
    const affectedEventIds = await withTransaction(async (conn) => {
      const expired = await reservationsRepository.findExpiredActive(conn);
      const eventIds = new Set<string>();
      for (const r of expired) {
        const seatIds = await reservationsRepository.getSeatIds(r.id);
        await eventsRepository.markSeatsAvailable(conn, seatIds);
        await reservationsRepository.markExpired(conn, r.id);
        eventIds.add(r.event_id);
      }
      return eventIds;
    });
    for (const eventId of affectedEventIds) {
      await broadcastEventState(eventId);
    }
  },
};

async function broadcastEventState(eventId: string): Promise<void> {
  const snapshot = await eventsRepository.getSeatMapSnapshot(eventId);
  publishSeatMapUpdate({
    type: "seat_map_update",
    eventId,
    remainingTickets: snapshot.remainingTickets,
    seats: snapshot.seats as any,
  });
}
