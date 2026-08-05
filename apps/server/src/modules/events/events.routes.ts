import { Router } from "express";
import { eventsRepository } from "./events.repository.js";
import { eventsService } from "./events.service.js";
import { createEventSchema, updateEventSchema } from "./events.validation.js";
import { requireAuth, requireRole } from "../../middleware/auth-guard.js";
import { NotFound } from "../../utils/http-error.js";

export const eventsRouter = Router();

// ---- Публични endpoints ----

eventsRouter.get("/", async (_req, res, next) => {
  try {
    const events = await eventsRepository.listPublished();
    res.json({ events });
  } catch (err) {
    next(err);
  }
});

eventsRouter.get("/:id", async (req, res, next) => {
  try {
    const detail = await eventsService.getPublicEventDetail(req.params.id);
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

// ---- Admin endpoints ----

const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("ADMIN"));

adminRouter.get("/", async (_req, res, next) => {
  try {
    const events = await eventsRepository.listAllForAdmin();
    res.json({ events });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/", async (req, res, next) => {
  try {
    const data = createEventSchema.parse(req.body);
    const id = await eventsRepository.create({
      venueId: data.venueId,
      name: data.name,
      description: data.description ?? null,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      normalPrice: data.normalPrice,
      vipPrice: data.vipPrice ?? null,
    });
    res.status(201).json({ id, message: "Събитието е създадено успешно като чернова." });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch("/:id", async (req, res, next) => {
  try {
    const data = updateEventSchema.parse(req.body);
    const event = await eventsRepository.findById(req.params.id);
    if (!event) throw NotFound("Събитието не е намерено.");
    await eventsRepository.update(req.params.id, {
      name: data.name,
      description: data.description ?? null,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      normalPrice: data.normalPrice,
      vipPrice: data.vipPrice ?? null,
    });
    res.json({ message: "Събитието е обновено успешно." });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/:id/publish", async (req, res, next) => {
  try {
    await eventsService.publish(req.params.id);
    res.json({ message: "Събитието е публикувано успешно." });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/:id/stop-sales", async (req, res, next) => {
  try {
    await eventsService.stopSales(req.params.id);
    res.json({ message: "Продажбите са спрени." });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/:id/archive", async (req, res, next) => {
  try {
    await eventsService.archive(req.params.id);
    res.json({ message: "Събитието е архивирано." });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/:id/seats", async (req, res, next) => {
  try {
    const seats = await eventsRepository.getEventSeats(req.params.id);
    res.json({ seats });
  } catch (err) {
    next(err);
  }
});

export const eventsAdminRouter = adminRouter;
