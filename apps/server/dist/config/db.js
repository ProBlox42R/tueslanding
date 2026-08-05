import mysql from "mysql2/promise";
import { env } from "./env.js";
/**
 * Централизиран connection pool.
 * Всички repository класове минават през него — никога чрез string concatenation.
 */
export const pool = mysql.createPool({
    uri: env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 15,
    maxIdle: 10,
    idleTimeout: 60_000,
    namedPlaceholders: true,
    dateStrings: false,
});
/**
 * Изпълнява callback вътре в MySQL транзакция.
 * Гарантира ROLLBACK при грешка и освобождаване на connection-а.
 */
export async function withTransaction(fn) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        const result = await fn(conn);
        await conn.commit();
        return result;
    }
    catch (err) {
        await conn.rollback();
        throw err;
    }
    finally {
        conn.release();
    }
}
//# sourceMappingURL=db.js.map