import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { env } from "./config/env.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(__dirname, "../../../database/migrations");
async function main() {
    const conn = await mysql.createConnection({ uri: env.DATABASE_URL, multipleStatements: true });
    await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(191) NOT NULL PRIMARY KEY,
      applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
    const files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith(".sql"))
        .sort();
    const [appliedRows] = await conn.query("SELECT id FROM schema_migrations");
    const applied = new Set(appliedRows.map((r) => r.id));
    for (const file of files) {
        if (applied.has(file)) {
            console.log(`(пропусната, вече приложена) ${file}`);
            continue;
        }
        const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
        console.log(`Прилагане на миграция: ${file}`);
        await conn.query(sql);
        await conn.query("INSERT INTO schema_migrations (id) VALUES (?)", [file]);
    }
    console.log("Всички миграции са приложени успешно.");
    await conn.end();
}
main().catch((err) => {
    console.error("Грешка при изпълнение на миграциите:", err);
    process.exit(1);
});
//# sourceMappingURL=db-migrate.js.map