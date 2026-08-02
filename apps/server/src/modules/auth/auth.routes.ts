import { Router } from "express";
import { authService } from "./auth.service.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.validation.js";
import { loginRateLimit, registerRateLimit, passwordResetRateLimit } from "../../middleware/rate-limit.js";
import { setSessionCookie, clearSessionCookie, requireAuth, SESSION_COOKIE_NAME } from "../../middleware/auth-guard.js";

export const authRouter = Router();

authRouter.post("/register", registerRateLimit, async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    await authService.register(data);
    res.status(201).json({
      message: "Регистрацията е успешна. Проверете имейла си, за да потвърдите акаунта.",
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/verify-email", async (req, res, next) => {
  try {
    const { token } = verifyEmailSchema.parse(req.body);
    await authService.verifyEmail(token);
    res.json({ message: "Имейлът е потвърден успешно. Вече можете да влезете в профила си." });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login", loginRateLimit, async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const { user, sessionToken, expiresAt } = await authService.login({
      ...data,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip,
    });
    setSessionCookie(res, sessionToken, expiresAt);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", requireAuth, async (req, res, next) => {
  try {
    const token = req.cookies?.[SESSION_COOKIE_NAME];
    if (token) await authService.logout(token);
    clearSessionCookie(res);
    res.json({ message: "Излязохте успешно от профила си." });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.currentUser });
});

authRouter.post("/forgot-password", passwordResetRateLimit, async (req, res, next) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    await authService.forgotPassword(email);
    // Еднакъв отговор независимо дали email-ът съществува в системата.
    res.json({
      message: "Ако имейлът съществува в системата, ще получите линк за възстановяване на паролата.",
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/reset-password", passwordResetRateLimit, async (req, res, next) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(token, password);
    res.json({ message: "Паролата е сменена успешно. Вече можете да влезете с новата парола." });
  } catch (err) {
    next(err);
  }
});
