import { z } from "zod";
export const createEventSchema = z.object({
    venueId: z.string().uuid("Невалидна зала"),
    name: z.string().min(2, "Името на събитието трябва да е поне 2 символа").max(200),
    description: z.string().max(4000).optional().nullable(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional().nullable(),
    normalPrice: z.number().min(0, "Цената не може да е отрицателна"),
    vipPrice: z.number().min(0).optional().nullable(),
});
export const updateEventSchema = createEventSchema.omit({ venueId: true });
//# sourceMappingURL=events.validation.js.map