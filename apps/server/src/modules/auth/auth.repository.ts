import type { PoolConnection } from "mysql2/promise";
import { pool } from "../../config/db.js";
import type { UserRecord, UserRole } from "./auth.types.js";

export const authRepository = {
  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const [rows] = await pool.query<any[]>("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    return (rows[0] as UserRecord) ?? null;
  },

  async findUserByUsername(username: string): Promise<UserRecord | null> {
    const [rows] = await pool.query<any[]>(
      "SELECT * FROM users WHERE username = ? LIMIT 1",
      [username]
    );
    return (rows[0] as UserRecord) ?? null;
  },

  async findUserById(id: string): Promise<UserRecord | null> {
    const [rows] = await pool.query<any[]>("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
    return (rows[0] as UserRecord) ?? null;
  },

  async createUser(params: {
    id: string;
    username: string;
    email: string;
    passwordHash: string;
    role?: UserRole;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO users (id, username, email, password_hash, role)
       VALUES (:id, :username, :email, :passwordHash, :role)`,
      { ...params, role: params.role ?? "USER" }
    );
  },

  async markEmailVerified(userId: string): Promise<void> {
    await pool.query("UPDATE users SET email_verified = 1 WHERE id = ?", [userId]);
  },

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, userId]);
  },

  async createEmailVerificationToken(params: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at)
       VALUES (:id, :userId, :tokenHash, :expiresAt)`,
      params
    );
  },

  async findValidEmailVerificationToken(tokenHash: string) {
    const [rows] = await pool.query<any[]>(
      `SELECT * FROM email_verification_tokens
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW(3)
       LIMIT 1 FOR UPDATE`,
      [tokenHash]
    );
    return rows[0] ?? null;
  },

  async consumeEmailVerificationToken(id: string, conn?: PoolConnection): Promise<void> {
    const runner = conn ?? pool;
    await runner.query("UPDATE email_verification_tokens SET used_at = NOW(3) WHERE id = ?", [id]);
  },

  async createPasswordResetToken(params: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
       VALUES (:id, :userId, :tokenHash, :expiresAt)`,
      params
    );
  },

  async findValidPasswordResetToken(tokenHash: string) {
    const [rows] = await pool.query<any[]>(
      `SELECT * FROM password_reset_tokens
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW(3)
       LIMIT 1 FOR UPDATE`,
      [tokenHash]
    );
    return rows[0] ?? null;
  },

  async consumePasswordResetToken(id: string): Promise<void> {
    await pool.query("UPDATE password_reset_tokens SET used_at = NOW(3) WHERE id = ?", [id]);
  },

  async createSession(params: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<void> {
    await pool.query(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at, user_agent, ip_address)
       VALUES (:id, :userId, :tokenHash, :expiresAt, :userAgent, :ipAddress)`,
      { ...params, userAgent: params.userAgent ?? null, ipAddress: params.ipAddress ?? null }
    );
  },

  async findValidSessionByTokenHash(tokenHash: string) {
    const [rows] = await pool.query<any[]>(
      `SELECT s.*, u.role, u.email_verified, u.is_active
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > NOW(3)
       LIMIT 1`,
      [tokenHash]
    );
    return rows[0] ?? null;
  },

  async deleteSessionByTokenHash(tokenHash: string): Promise<void> {
    await pool.query("DELETE FROM sessions WHERE token_hash = ?", [tokenHash]);
  },
};
