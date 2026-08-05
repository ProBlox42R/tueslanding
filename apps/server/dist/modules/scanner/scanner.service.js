import { randomUUID } from "node:crypto";
import { withTransaction } from "../../config/db.js";
import { ticketsRepository } from "../tickets/tickets.repository.js";
import { hashToken } from "../../utils/tokens.js";
/**
 * Валидира и (ако е валиден) маркира билет като използван — атомарно.
 * Заключва реда на билета FOR UPDATE вътре в транзакция, за да не могат
 * двама scanner администратори едновременно да "приемат" същия билет
 * (спецификация т. 35 "Duplicate scan").
 */
export const scannerService = {
    async validateAndUse(params) {
        const hash = hashToken(params.token);
        return withTransaction(async (conn) => {
            const ticket = await ticketsRepository.findDetailByQrTokenHashForUpdate(conn, hash);
            if (!ticket) {
                return { result: "INVALID" };
            }
            if (ticket.status === "USED") {
                await ticketsRepository.insertScanLog(conn, {
                    id: randomUUID(),
                    ticketId: ticket.id,
                    scannedBy: params.scannedBy,
                    result: "ALREADY_USED",
                });
                return { result: "ALREADY_USED", ticket };
            }
            if (ticket.status !== "VALID") {
                await ticketsRepository.insertScanLog(conn, {
                    id: randomUUID(),
                    ticketId: ticket.id,
                    scannedBy: params.scannedBy,
                    result: "INVALID",
                });
                return { result: "INVALID" };
            }
            await ticketsRepository.markUsed(conn, ticket.id);
            await ticketsRepository.insertScanLog(conn, {
                id: randomUUID(),
                ticketId: ticket.id,
                scannedBy: params.scannedBy,
                result: "VALID",
            });
            return { result: "VALID", ticket: { ...ticket, status: "USED" } };
        });
    },
};
//# sourceMappingURL=scanner.service.js.map