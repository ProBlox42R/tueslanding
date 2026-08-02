import { z } from "zod";
export const scanTicketSchema = z.object({
    token: z.string().min(1, "Липсва QR token"),
});
//# sourceMappingURL=scanner.validation.js.map