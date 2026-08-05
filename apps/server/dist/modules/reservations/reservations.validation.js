import { z } from "zod";
export const reserveSeatsSchema = z.object({
    eventSeatIds: z
        .array(z.string().uuid())
        .min(1, "Изберете поне едно място.")
        .max(20, "Може да резервирате най-много 20 места наведнъж."),
});
//# sourceMappingURL=reservations.validation.js.map