import rateLimit from "express-rate-limit";

const bulgarianMessage = { error: "Твърде много опити. Моля, изчакайте и опитайте отново." };

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: bulgarianMessage,
});

export const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: bulgarianMessage,
});

export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: bulgarianMessage,
});
