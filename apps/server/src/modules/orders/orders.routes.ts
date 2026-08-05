import { Router } from "express";
import { ordersService } from "./orders.service.js";
import { ordersRepository } from "./orders.repository.js";
import { checkoutSchema, listOrdersQuerySchema } from "./orders.validation.js";
import { requireAuth, requireRole } from "../../middleware/auth-guard.js";
import { queueService } from "../queue/queue.service.js";

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

// "Плащане" фиктивно/вътрешно — виж бележката в orders.service.ts.
// Пропуска се през queue проверка: ако >50 активни checkout сесии в момента,
// клиентът трябва първо да мине през /api/queue.
ordersRouter.post("/checkout", async (req, res, next) => {
  try {
    const { reservationId, buyerName } = checkoutSchema.parse(req.body);
    queueService.assertAdmitted(req.currentUser!.id);
    const result = await ordersService.checkout({
      userId: req.currentUser!.id,
      reservationId,
      buyerName,
    });
    queueService.leaveCheckout(req.currentUser!.id);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

ordersRouter.get("/", async (req, res, next) => {
  try {
    const orders = await ordersRepository.listForUser(req.currentUser!.id);
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

// ---- Admin ----
export const ordersAdminRouter = Router();
ordersAdminRouter.use(requireAuth, requireRole("ADMIN"));

ordersAdminRouter.get("/", async (req, res, next) => {
  try {
    const filter = listOrdersQuerySchema.parse(req.query);
    const orders = await ordersRepository.listForAdmin(filter);
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

ordersAdminRouter.post("/:id/refund", async (req, res, next) => {
  try {
    await ordersService.refund({ orderId: req.params.id });
    res.json({ message: "Плащането е възстановено успешно." });
  } catch (err) {
    next(err);
  }
});
