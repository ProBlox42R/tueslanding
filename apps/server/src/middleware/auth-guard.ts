import type { NextFunction, Request, Response } from "express";
import { authService } from "../modules/auth/auth.service.js";
import type { PublicUser, UserRole } from "../modules/auth/auth.types.js";
import { Forbidden, Unauthorized } from "../utils/http-error.js";

export const SESSION_COOKIE_NAME = "bileti_session";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      currentUser?: PublicUser;
    }
  }
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
}

/** Прикача текущия потребител към req, ако има валидна сесия. Не блокира при липса. */
export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (token) {
    const user = await authService.getUserBySessionToken(token);
    if (user) req.currentUser = user;
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.currentUser) return next(Unauthorized("Моля, влезте в профила си."));
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.currentUser) return next(Unauthorized("Моля, влезте в профила си."));
    if (!roles.includes(req.currentUser.role)) {
      return next(Forbidden());
    }
    next();
  };
}
