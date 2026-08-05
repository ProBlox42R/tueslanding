import { Router } from "express";
import { venuesRepository } from "./venues.repository.js";
import {
  createVenueSchema,
  updateVenueSchema,
  updateSeatSchema,
  addSeatSchema,
} from "./venues.validation.js";
import { requireAuth, requireRole } from "../../middleware/auth-guard.js";
import { NotFound } from "../../utils/http-error.js";

export const venuesRouter = Router();

// Всички venue операции са admin/super_admin.
venuesRouter.use(requireAuth, requireRole("ADMIN"));

venuesRouter.get("/", async (_req, res, next) => {
  try {
    const venues = await venuesRepository.listAll();
    res.json({ venues });
  } catch (err) {
    next(err);
  }
});

venuesRouter.post("/", async (req, res, next) => {
  try {
    const data = createVenueSchema.parse(req.body);
    const id = await venuesRepository.create({
      name: data.name,
      description: data.description ?? null,
      rowsCount: data.rowsCount,
      seatsPerRow: data.seatsPerRow,
    });
    await venuesRepository.generateGridSeats(id, data.rowsCount, data.seatsPerRow);
    res.status(201).json({ id, message: "Залата е създадена успешно." });
  } catch (err) {
    next(err);
  }
});

venuesRouter.get("/:id", async (req, res, next) => {
  try {
    const venue = await venuesRepository.findById(req.params.id);
    if (!venue) throw NotFound("Залата не е намерена.");
    const seats = await venuesRepository.getSeats(req.params.id);
    res.json({ venue, seats });
  } catch (err) {
    next(err);
  }
});

venuesRouter.patch("/:id", async (req, res, next) => {
  try {
    const data = updateVenueSchema.parse(req.body);
    const venue = await venuesRepository.findById(req.params.id);
    if (!venue) throw NotFound("Залата не е намерена.");
    await venuesRepository.update(req.params.id, {
      name: data.name,
      description: data.description ?? null,
    });
    res.json({ message: "Залата е обновена успешно." });
  } catch (err) {
    next(err);
  }
});

// Visual seat editor: промяна на типа на конкретно място (NORMAL/VIP/BLOCKED/AISLE).
venuesRouter.patch("/:id/seats/:seatId", async (req, res, next) => {
  try {
    const { seatType } = updateSeatSchema.parse(req.body);
    await venuesRepository.updateSeatType(req.params.seatId, req.params.id, seatType);
    res.json({ message: "Мястото е обновено успешно." });
  } catch (err) {
    next(err);
  }
});

// Добавяне на допълнително място (за нередовни схеми извън правоъгълната мрежа).
venuesRouter.post("/:id/seats", async (req, res, next) => {
  try {
    const data = addSeatSchema.parse(req.body);
    const seatId = await venuesRepository.addSeat({ venueId: req.params.id, ...data });
    res.status(201).json({ id: seatId });
  } catch (err) {
    next(err);
  }
});

venuesRouter.delete("/:id/seats/:seatId", async (req, res, next) => {
  try {
    await venuesRepository.removeSeat(req.params.seatId, req.params.id);
    res.json({ message: "Мястото е премахнато." });
  } catch (err) {
    next(err);
  }
});
