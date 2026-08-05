import { randomUUID } from "node:crypto";
import { pool } from "./config/db.js";
import { hashPassword } from "./utils/password.js";

/**
 * Създава ЕДИН реален ADMIN акаунт — безопасно за production, за разлика
 * от db-seed.ts (който създава демо данни с известни пароли и затова
 * отказва да се изпълни при NODE_ENV=production).
 *
 * Употреба:
 *   npm run create-admin --workspace=apps/server -- \
 *     --username=admin --email=admin@yourdomain.com --password='ИзбериСигурнаПарола123!'
 *
 * Или чрез environment variables (удобно за CI/deploy скриптове):
 *   ADMIN_USERNAME=admin ADMIN_EMAIL=admin@yourdomain.com ADMIN_PASSWORD='...' \
 *     npm run create-admin --workspace=apps/server
 */

function readArg(flag: string): string | undefined {
  const prefix = `--${flag}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found?.slice(prefix.length);
}

async function main() {
  const username = readArg("username") ?? process.env.ADMIN_USERNAME;
  const email = readArg("email") ?? process.env.ADMIN_EMAIL;
  const password = readArg("password") ?? process.env.ADMIN_PASSWORD;

  if (!username || !email || !password) {
    console.error(
      "Липсват данни. Употреба:\n" +
        "  npm run create-admin --workspace=apps/server -- \\\n" +
        "    --username=admin --email=admin@yourdomain.com --password='СигурнаПарола123!'\n" +
        "Или чрез ADMIN_USERNAME / ADMIN_EMAIL / ADMIN_PASSWORD environment variables."
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Паролата трябва да е поне 8 символа.");
    process.exit(1);
  }

  const [existing] = await pool.query<any[]>(
    "SELECT id FROM users WHERE email = ? OR username = ? LIMIT 1",
    [email, username]
  );
  if (existing.length > 0) {
    console.error("Вече съществува потребител с този email или username.");
    process.exit(1);
  }

  const id = randomUUID();
  const passwordHash = await hashPassword(password);
  await pool.query(
    `INSERT INTO users (id, username, email, password_hash, email_verified, role)
     VALUES (:id, :username, :email, :passwordHash, 1, 'ADMIN')`,
    { id, username, email, passwordHash }
  );

  console.log(`Администраторският акаунт е създаден успешно: ${email}`);
  await pool.end();
}

main().catch((err) => {
  console.error("Грешка при създаване на администратор:", err);
  process.exit(1);
});
