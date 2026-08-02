import { Router } from "express";
import { reservationsService } from "./reservations.service.js";
import { reservationsRepository } from "./reservations.repository.js";
import { reserveSeatsSchema } from "./reservations.validation.js";
import { requireAuth } from "../../middleware/auth-guard.js";
import { queueService } from "../queue/queue.service.js";
import { Forbidden, NotFound } from "../../utils/http-error.js";

export const reservationsRouter = Router();

reservationsRouter.use(requireAuth);

reservationsRouter.post("/events/:eventId/reserve", async (req, res, next) => {
  try {
    const { eventSeatIds } = reserveSeatsSchema.parse(req.body);
    queueService.assertAdmitted(req.currentUser!.id);
    const result = await reservationsService.reserveSeats({
      userId: req.currentUser!.id,
      eventId: req.params.eventId,
      eventSeatIds,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// Резюме за checkout страницата — събитие, зала, места, цени, оставащо време.
reservationsRouter.get("/:reservationId", async (req, res, next) => {
  try {
    const detail = await reservationsRepository.findCheckoutDetail(req.params.reservationId);
    if (!detail) throw NotFound("Резервацията не е намерена.");
    if (detail.reservation.user_id !== req.currentUser!.id) throw Forbidden();
    if (detail.reservation.status !== "ACTIVE") {
      throw NotFound("Резервацията вече не е активна.");
    }
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

reservationsRouter.delete("/:reservationId", async (req, res, next) => {
  try {
    await reservationsService.cancelReservation({
      userId: req.currentUser!.id,
      reservationId: req.params.reservationId,
    });
    queueService.leaveCheckout(req.currentUser!.id);
    res.json({ message: "Резервацията е отказана и местата са освободени." });
  } catch (err) {
    next(err);
  }
});
