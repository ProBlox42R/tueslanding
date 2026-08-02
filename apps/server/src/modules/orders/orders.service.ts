import { randomUUID } from "node:crypto";
import { withTransaction } from "../../config/db.js";
import { ordersRepository } from "./orders.repository.js";
import { reservationsRepository } from "../reservations/reservations.repository.js";
import { eventsRepository } from "../events/events.repository.js";
import { ticketsRepository } from "../tickets/tickets.repository.js";
import { ticketService } from "../tickets/ticket.service.js";
import { emailService } from "../email/email.service.js";
import { authRepository } from "../auth/auth.repository.js";
import { publishSeatMapUpdate } from "../realtime/event-bus.js";
import { BadRequest, Forbidden, NotFound } from "../../utils/http-error.js";
import { env } from "../../config/env.js";

/**
 * "Плащане" в тази фаза е вътрешно/фиктивно: няма реален бизнес акаунт в
 * Stripe, затова checkout маркира поръчката PAID незабавно вместо да минава
 * през Stripe Checkout Session + webhook.
 *
 * Нарочно пазим същата стъпка "поръчка -> PAID -> билети -> PDF -> имейл"
 * като при реален Stripe webhook (виж finalizeOrder по-долу), така че при
 * реален бизнес акаунт единствената промяна е да се вика finalizeOrder(orderId)
 * от Stripe webhook handler-а вместо директно от checkout() тук.
 */
export const ordersService = {
  async checkout(params: {
    userId: string;
    reservationId: string;
    buyerName: string;
  }): Promise<{ orderId: string }> {
    const reservation = await reservationsRepository.findActiveById(params.reservationId);
    if (!reservation) {
      throw NotFound("Резервацията не е намерена или вече не е активна.");
    }
    if (reservation.user_id !== params.userId) {
      throw Forbidden();
    }
    if (new Date(reservation.expires_at).getTime() <= Date.now()) {
      throw BadRequest("Времето за резервацията е изтекло. Моля, изберете местата отново.");
    }

    const seatIds = await reservationsRepository.getSeatIds(params.reservationId);
    if (seatIds.length === 0) {
      throw BadRequest("Резервацията няма прикачени места.");
    }

    // Backend-ът винаги изчислява крайната цена от базата — никога от клиента.
    const eventSeats = await eventsRepository.getEventSeatsByIds(seatIds);
    const totalAmount = eventSeats.reduce((sum, s) => sum + Number(s.price), 0);

    const orderId = await withTransaction(async (conn) => {
      const freshReservation = await reservationsRepository.findActiveByIdForUpdate(
        conn,
        params.reservationId
      );
      if (!freshReservation || freshReservation.status !== "ACTIVE") {
        throw BadRequest("Резервацията вече не е активна.");
      }

      const id = await ordersRepository.create(conn, {
        userId: params.userId,
        eventId: reservation.event_id,
        reservationId: params.reservationId,
        totalAmount,
        status: "PAID", // Фиктивно плащане — маркирано платено веднага.
        buyerName: params.buyerName,
      });

      await eventsRepository.markSeatsSold(conn, seatIds);
      await reservationsRepository.markConverted(conn, params.reservationId);

      for (const seatId of seatIds) {
        const ticketId = randomUUID();
        const { hash } = ticketService.generateQrToken();
        await ticketsRepository.create(conn, {
          id: ticketId,
          orderId: id,
          userId: params.userId,
          eventId: reservation.event_id,
          eventSeatId: seatId,
          qrTokenHash: hash,
        });
      }

      return id;
    });

    // ВАЖНО: плащането/поръчката вече е потвърдена и записана по-горе.
    // Генерирането на PDF-а и изпращането на имейл никога не трябва да
    // превръща успешна покупка в грешка за потребителя — ако това стъпало
    // се провали (напр. временен проблем с R2/Resend), логваме го тук и
    // PDF-ът просто ще се генерира "лениво" при първо отваряне на билета
    // (виж tickets.routes.ts) — самата покупка остава валидна.
    try {
      await this.finalizeOrder(orderId);
    } catch (err) {
      console.error(`Грешка при финализиране на поръчка ${orderId} (PDF/имейл):`, err);
    }

    const snapshot = await eventsRepository.getSeatMapSnapshot(reservation.event_id);
    publishSeatMapUpdate({
      type: "seat_map_update",
      eventId: reservation.event_id,
      remainingTickets: snapshot.remainingTickets,
      seats: snapshot.seats as any,
    });

    return { orderId };
  },

  /**
   * Генерира PDF + качва в storage + изпраща имейл за всеки билет от
   * поръчката. Носи собствена идемпотентност (пропуска билети, които вече
   * имат pdf_object_key), затова може безопасно да бъде извикана повторно
   * (напр. от бъдещ реален Stripe webhook при повторна доставка на event).
   */
  async finalizeOrder(orderId: string): Promise<void> {
    const tickets = await ticketsRepository.listForOrder(orderId);

    for (const ticket of tickets) {
      if (ticket.pdf_object_key) continue; // вече обработен — идемпотентно
      try {
        await ticketService.generateAndUpload(ticket.id);
      } catch (err) {
        // Един неуспешен билет не трябва да блокира останалите в поръчката.
        console.error(`Грешка при генериране на PDF за билет ${ticket.id}:`, err);
      }
    }

    if (tickets.length > 0) {
      try {
        const user = await authRepository.findUserById(tickets[0].user_id);
        const detail = await ticketsRepository.findDetailById(tickets[0].id);
        if (user && detail) {
          const ticketUrl = `${env.WEB_BASE_URL}/tickets/${tickets[0].id}`;
          await emailService.sendPurchaseConfirmationEmail(
            user.email,
            user.username,
            detail.event_name,
            ticketUrl
          );
        }
      } catch (err) {
        // Неуспешен имейл не трябва да отменя вече готовите PDF билети.
        console.error(`Грешка при изпращане на потвърждение за поръчка ${orderId}:`, err);
      }
    }
  },

  async refund(params: { orderId: string }): Promise<void> {
    const order = await ordersRepository.findById(params.orderId);
    if (!order) throw NotFound("Поръчката не е намерена.");
    if (order.status !== "PAID") {
      throw BadRequest("Само платена поръчка може да бъде възстановена.");
    }

    const tickets = await ticketsRepository.listForOrder(params.orderId);
    // Използваните билети никога не се връщат в наличност — но останалите
    // (неизползвани) билети в същата поръчка се възстановяват нормално.

    await withTransaction(async (conn) => {
      await ordersRepository.setStatus(conn, params.orderId, "REFUNDED");
      for (const ticket of tickets) {
        if (ticket.status === "USED") continue; // не освобождаваме вече използвано място
        await ticketsRepository.markRefunded(conn, ticket.id);
        await eventsRepository.markSeatsAvailable(conn, [ticket.event_seat_id]);
      }
    });

    const user = await authRepository.findUserById(order.user_id);
    const detail = tickets[0] ? await ticketsRepository.findDetailById(tickets[0].id) : null;
    if (user && detail) {
      await emailService.sendRefundConfirmationEmail(user.email, user.username, detail.event_name);
    }

    const snapshot = await eventsRepository.getSeatMapSnapshot(order.event_id);
    publishSeatMapUpdate({
      type: "seat_map_update",
      eventId: order.event_id,
      remainingTickets: snapshot.remainingTickets,
      seats: snapshot.seats as any,
    });
  },
};
