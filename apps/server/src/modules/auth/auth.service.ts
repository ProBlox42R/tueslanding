import { randomUUID } from "node:crypto";
import { authRepository } from "./auth.repository.js";
import { emailService } from "../email/email.service.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";
import { generateSecureToken, hashToken } from "../../utils/tokens.js";
import { toPublicUser, type PublicUser } from "./auth.types.js";
import { BadRequest, Conflict, Unauthorized } from "../../utils/http-error.js";
import { env } from "../../config/env.js";

const EMAIL_VERIFICATION_TTL_HOURS = 24;
const PASSWORD_RESET_TTL_MINUTES = 30;
const SESSION_TTL_DAYS = 30;

export const authService = {
  async register(params: { username: string; email: string; password: string }): Promise<void> {
    const existingByEmail = await authRepository.findUserByEmail(params.email);
    if (existingByEmail) {
      // Не разкриваме дали конкретен email вече съществува, за да пазим формулировката еднаква.
      throw Conflict("Възникна проблем с регистрацията. Проверете данните и опитайте отново.");
    }
    const existingByUsername = await authRepository.findUserByUsername(params.username);
    if (existingByUsername) {
      throw Conflict("Потребителското име вече е заето.");
    }

    const userId = randomUUID();
    const passwordHash = await hashPassword(params.password);
    await authRepository.createUser({
      id: userId,
      username: params.username,
      email: params.email,
      passwordHash,
    });

    await this.issueEmailVerificationToken(userId, params.email, params.username);
  },

  async issueEmailVerificationToken(userId: string, email: string, username: string): Promise<void> {
    const { token, hash } = generateSecureToken();
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000);
    await authRepository.createEmailVerificationToken({
      id: randomUUID(),
      userId,
      tokenHash: hash,
      expiresAt,
    });
    const verifyUrl = `${env.WEB_BASE_URL}/verify-email?token=${token}`;
    await emailService.sendVerificationEmail(email, username, verifyUrl);
  },

  async verifyEmail(token: string): Promise<void> {
    const hash = hashToken(token);
    const record = await authRepository.findValidEmailVerificationToken(hash);
    if (!record) {
      throw BadRequest("Линкът за потвърждение е невалиден или е изтекъл.");
    }
    await authRepository.markEmailVerified(record.user_id);
    await authRepository.consumeEmailVerificationToken(record.id);
  },

  async login(params: {
    emailOrUsername: string;
    password: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<{ user: PublicUser; sessionToken: string; expiresAt: Date }> {
    const isEmail = params.emailOrUsername.includes("@");
    const user = isEmail
      ? await authRepository.findUserByEmail(params.emailOrUsername)
      : await authRepository.findUserByUsername(params.emailOrUsername);

    if (!user || !user.is_active) {
      throw Unauthorized("Грешен имейл/потребителско име или парола.");
    }

    const valid = await verifyPassword(user.password_hash, params.password);
    if (!valid) {
      throw Unauthorized("Грешен имейл/потребителско име или парола.");
    }

    const { token, hash } = generateSecureToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
    await authRepository.createSession({
      id: randomUUID(),
      userId: user.id,
      tokenHash: hash,
      expiresAt,
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
    });

    return { user: toPublicUser(user), sessionToken: token, expiresAt };
  },

  async logout(sessionToken: string): Promise<void> {
    await authRepository.deleteSessionByTokenHash(hashToken(sessionToken));
  },

  async getUserBySessionToken(sessionToken: string): Promise<PublicUser | null> {
    const session = await authRepository.findValidSessionByTokenHash(hashToken(sessionToken));
    if (!session) return null;
    const user = await authRepository.findUserById(session.user_id);
    if (!user || !user.is_active) return null;
    return toPublicUser(user);
  },

  async forgotPassword(email: string): Promise<void> {
    const user = await authRepository.findUserByEmail(email);
    // Винаги отговаряме еднакво, независимо дали email-ът съществува.
    if (!user) return;

    const { token, hash } = generateSecureToken();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
    await authRepository.createPasswordResetToken({
      id: randomUUID(),
      userId: user.id,
      tokenHash: hash,
      expiresAt,
    });
    const resetUrl = `${env.WEB_BASE_URL}/reset-password?token=${token}`;
    await emailService.sendPasswordResetEmail(user.email, user.username, resetUrl);
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const hash = hashToken(token);
    const record = await authRepository.findValidPasswordResetToken(hash);
    if (!record) {
      throw BadRequest("Линкът за възстановяване на парола е невалиден или е изтекъл.");
    }
    const passwordHash = await hashPassword(newPassword);
    await authRepository.updatePasswordHash(record.user_id, passwordHash);
    await authRepository.consumePasswordResetToken(record.id);
  },
};
