import { Router } from "express";
import { ticketsRepository } from "./tickets.repository.js";
import { ticketService } from "./ticket.service.js";
import { requireAuth } from "../../middleware/auth-guard.js";
import { Forbidden, NotFound } from "../../utils/http-error.js";
export const ticketsRouter = Router();
ticketsRouter.use(requireAuth);
ticketsRouter.get("/", async (req, res, next) => {
    try {
        const tickets = await ticketsRepository.listForUser(req.currentUser.id);
        res.json({ tickets });
    }
    catch (err) {
        next(err);
    }
});
ticketsRouter.get("/:id", async (req, res, next) => {
    try {
        const ticket = await ticketsRepository.findDetailById(req.params.id);
        if (!ticket)
            throw NotFound("Билетът не е намерен.");
        assertCanAccessTicket(req, ticket.user_id);
        res.json({ ticket });
    }
    catch (err) {
        next(err);
    }
});
// Защитен endpoint — не разчита на предполагаем /ticket/1 URL; изисква
// автентикация и проверка на собствеността, а самият pdf_object_key
// е генериран от непредвидим ticket id.
ticketsRouter.get("/:id/pdf", async (req, res, next) => {
    try {
        let ticket = await ticketsRepository.findDetailById(req.params.id);
        if (!ticket)
            throw NotFound("Билетът не е намерен.");
        assertCanAccessTicket(req, ticket.user_id);
        if (!ticket.pdf_object_key) {
            // PDF-ът не е бил генериран успешно при покупката (напр. временен
            // проблем със storage-а) — генерираме го сега вместо да връщаме грешка.
            await ticketService.generateAndUpload(ticket.id);
            ticket = await ticketsRepository.findDetailById(req.params.id);
            if (!ticket?.pdf_object_key)
                throw NotFound("PDF билетът все още не е готов.");
        }
        const pdf = await ticketService.getTicketPdf(ticket.pdf_object_key);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="bilet-${ticket.id}.pdf"`);
        res.send(pdf);
    }
    catch (err) {
        next(err);
    }
});
function assertCanAccessTicket(req, ticketUserId) {
    const user = req.currentUser;
    const isOwner = user.id === ticketUserId;
    const isStaff = user.role === "ADMIN";
    if (!isOwner && !isStaff)
        throw Forbidden();
}
//# sourceMappingURL=tickets.routes.js.map