import { authService } from "../modules/auth/auth.service.js";
import { Forbidden, Unauthorized } from "../utils/http-error.js";
export const SESSION_COOKIE_NAME = "bileti_session";
export function setSessionCookie(res, token, expiresAt) {
    res.cookie(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: expiresAt,
        path: "/",
    });
}
export function clearSessionCookie(res) {
    res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
}
/** Прикача текущия потребител към req, ако има валидна сесия. Не блокира при липса. */
export async function attachUser(req, _res, next) {
    const token = req.cookies?.[SESSION_COOKIE_NAME];
    if (token) {
        const user = await authService.getUserBySessionToken(token);
        if (user)
            req.currentUser = user;
    }
    next();
}
export function requireAuth(req, _res, next) {
    if (!req.currentUser)
        return next(Unauthorized("Моля, влезте в профила си."));
    next();
}
export function requireRole(...roles) {
    return (req, _res, next) => {
        if (!req.currentUser)
            return next(Unauthorized("Моля, влезте в профила си."));
        if (!roles.includes(req.currentUser.role)) {
            return next(Forbidden());
        }
        next();
    };
}
//# sourceMappingURL=auth-guard.js.map