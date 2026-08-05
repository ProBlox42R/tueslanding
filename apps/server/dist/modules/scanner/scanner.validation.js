import { z } from "zod";
export const scanTicketSchema = z.object({
    // trim() е защита срещу случайни whitespace/newline символи при ръчно
    // копиране/поставяне на token-а — самият hash lookup е точен match,
    // затова невидим whitespace около валиден token би довел до "невалиден"
    // без видима причина за потребителя.
    token: z
        .string()
        .min(1, "Липсва QR token")
        .transform((val) => val.trim()),
});
//# sourceMappingURL=scanner.validation.js.map