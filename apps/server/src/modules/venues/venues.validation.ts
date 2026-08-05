import { z } from "zod";

export const createVenueSchema = z.object({
  name: z.string().min(2, "Името на залата трябва да е поне 2 символа").max(150),
  description: z.string().max(2000).optional().nullable(),
  rowsCount: z.number().int().min(1).max(200),
  seatsPerRow: z.number().int().min(1).max(200),
});

export const updateVenueSchema = z.object({
  name: z.string().min(2).max(150),
  description: z.string().max(2000).optional().nullable(),
});

export const updateSeatSchema = z.object({
  seatType: z.enum(["NORMAL", "VIP", "BLOCKED", "AISLE"]),
});

export const addSeatSchema = z.object({
  rowLabel: z.string().min(1).max(8),
  seatNumber: z.number().int().min(1),
  posX: z.number(),
  posY: z.number(),
  seatType: z.enum(["NORMAL", "VIP", "BLOCKED", "AISLE"]).default("NORMAL"),
});
