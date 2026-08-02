import { Router } from "express";
import { adminRepository } from "./admin.repository.js";
import { createAdminSchema } from "./admin.validation.js";
import { requireAuth, requireRole } from "../../middleware/auth-guard.js";
import { BadRequest } from "../../utils/http-error.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("ADMIN"));

adminRouter.get("/stats", async (_req, res, next) => {
  try {
    const stats = await adminRepository.getStats();
    res.json({ stats });
  } catch (err) {
    next(err);
  }
});

// Само едно администраторско ниво (ADMIN) — всеки админ може да управлява
// останалите администраторски акаунти.
adminRouter.get("/admins", async (_req, res, next) => {
  try {
    const admins = await adminRepository.listAdmins();
    res.json({ admins });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/admins", async (req, res, next) => {
  try {
    const data = createAdminSchema.parse(req.body);
    const id = await adminRepository.createAdmin(data);
    res.status(201).json({ id, message: "Администраторският акаунт е създаден успешно." });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/admins/:id/deactivate", async (req, res, next) => {
  try {
    if (req.params.id === req.currentUser!.id) {
      throw BadRequest("Не можете да деактивирате собствения си акаунт.");
    }
    await adminRepository.setAdminActive(req.params.id, false);
    res.json({ message: "Администраторският акаунт е деактивиран." });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/admins/:id/activate", async (req, res, next) => {
  try {
    await adminRepository.setAdminActive(req.params.id, true);
    res.json({ message: "Администраторският акаунт е активиран." });
  } catch (err) {
    next(err);
  }
});
