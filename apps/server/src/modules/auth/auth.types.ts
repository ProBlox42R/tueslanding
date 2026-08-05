export type UserRole = "USER" | "ADMIN";

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  email_verified: 0 | 1;
  role: UserRole;
  is_active: 0 | 1;
  created_at: Date;
  updated_at: Date;
}

export interface PublicUser {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
  role: UserRole;
}

export function toPublicUser(u: UserRecord): PublicUser {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    emailVerified: u.email_verified === 1,
    role: u.role,
  };
}
