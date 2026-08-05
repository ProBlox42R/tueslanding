import { eventsRepository } from "./events.repository.js";
import { venuesRepository } from "../venues/venues.repository.js";
import { BadRequest, NotFound } from "../../utils/http-error.js";

export const eventsService = {
  async publish(eventId: string): Promise<void> {
    const event = await eventsRepository.findById(eventId);
    if (!event) throw NotFound("Събитието не е намерено.");
    if (event.status !== "DRAFT") {
      throw BadRequest("Само събитие в статус чернова може да бъде публикувано.");
    }
    const venue = await venuesRepository.findById(event.venue_id);
    if (!venue) throw NotFound("Залата за това събитие не е намерена.");

    await eventsRepository.generateEventSeats(
      eventId,
      event.venue_id,
      Number(event.normal_price),
      event.vip_price ? Number(event.vip_price) : null
    );
    await eventsRepository.setStatus(eventId, "PUBLISHED");
  },

  async stopSales(eventId: string): Promise<void> {
    const event = await eventsRepository.findById(eventId);
    if (!event) throw NotFound("Събитието не е намерено.");
    if (event.status !== "PUBLISHED") {
      throw BadRequest("Само публикувано събитие може да спре продажбите.");
    }
    await eventsRepository.setStatus(eventId, "SALES_STOPPED");
  },

  async archive(eventId: string): Promise<void> {
    const event = await eventsRepository.findById(eventId);
    if (!event) throw NotFound("Събитието не е намерено.");
    await eventsRepository.setStatus(eventId, "ARCHIVED");
  },

  async getPublicEventDetail(eventId: string) {
    const event = await eventsRepository.findById(eventId);
    if (!event || (event.status !== "PUBLISHED" && event.status !== "SALES_STOPPED")) {
      throw NotFound("Събитието не е намерено.");
    }
    const seats = await eventsRepository.getEventSeats(eventId);
    const remaining = seats.filter((s) => s.status === "AVAILABLE").length;
    return { event, seats, remainingTickets: remaining };
  },
};
