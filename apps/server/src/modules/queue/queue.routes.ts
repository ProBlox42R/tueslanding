import { Router } from "express";
import { queueService } from "./queue.service.js";
import { requireAuth } from "../../middleware/auth-guard.js";

export const queueRouter = Router();
queueRouter.use(requireAuth);

// Клиентът вика това преди да продължи към избор на места/checkout.
// Ако admitted=false, показва waiting room екран и polls /status.
queueRouter.post("/enter", (req, res) => {
  const result = queueService.tryEnter(req.currentUser!.id);
  res.json(result);
});

queueRouter.get("/status", (req, res) => {
  const result = queueService.getStatus(req.currentUser!.id);
  res.json(result);
});

queueRouter.post("/leave", (req, res) => {
  queueService.leaveCheckout(req.currentUser!.id);
  res.json({ message: "Излязохте от процеса на покупка." });
});
