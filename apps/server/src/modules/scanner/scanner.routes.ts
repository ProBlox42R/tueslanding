import { Router } from "express";
import { scannerService } from "./scanner.service.js";
import { scanTicketSchema } from "./scanner.validation.js";
import { requireAuth, requireRole } from "../../middleware/auth-guard.js";

export const scannerRouter = Router();
scannerRouter.use(requireAuth, requireRole("ADMIN"));

scannerRouter.post("/validate", async (req, res, next) => {
  try {
    const { token } = scanTicketSchema.parse(req.body);
    const outcome = await scannerService.validateAndUse({
      token,
      scannedBy: req.currentUser!.id,
    });
    res.json(outcome);
  } catch (err) {
    next(err);
  }
});
