import { ZodError } from "zod";
import { HttpError } from "../utils/http-error.js";
export function notFoundHandler(req, res) {
    res.status(404).json({ error: "Заявеният адрес не съществува." });
}
export function errorHandler(err, req, res, _next) {
    if (err instanceof ZodError) {
        return res.status(400).json({
            error: "Невалидни входни данни.",
            fields: err.flatten().fieldErrors,
        });
    }
    if (err instanceof HttpError) {
        if (err.status >= 500) {
            console.error(err);
        }
        return res.status(err.status).json({ error: err.message, fields: err.fields });
    }
    console.error(err);
    return res.status(500).json({ error: "Възникна вътрешна грешка. Опитайте отново по-късно." });
}
//# sourceMappingURL=error-handler.js.map