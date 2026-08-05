import { z } from "zod";

export const checkoutSchema = z.object({
  reservationId: z.string().uuid("Невалидна резервация"),
  buyerName: z
    .string()
    .min(2, "Името трябва да е поне 2 символа")
    .max(150, "Името е твърде дълго"),
});

export const listOrdersQuerySchema = z.object({
  status: z.enum(["UNPAID", "PAID", "REFUNDED", "CANCELLED"]).optional(),
  search: z.string().max(200).optional(),
});
