import crypto from "node:crypto";

/**
 * Генерира криптографски сигурен случаен token (за email verification,
 * password reset, session id, QR ticket token и т.н.).
 * Връща суровия token (изпраща се на клиента / в линк / в QR) и неговия
 * SHA-256 hash (единственото, което пазим в базата данни).
 */
export function generateSecureToken(bytes = 32): { token: string; hash: string } {
  const token = crypto.randomBytes(bytes).toString("base64url");
  const hash = hashToken(token);
  return { token, hash };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
