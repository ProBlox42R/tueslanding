import fs from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../../config/env.js";
/**
 * Storage за PDF билетите.
 *
 * Ако R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME
 * са зададени в .env, качва в Cloudflare R2 (S3-съвместимо API).
 * Ако не са зададени, пише на локалния диск (storage/tickets/) — удобно за
 * локална разработка без R2 акаунт. Интерфейсът (put/get/remove) е еднакъв
 * и за двата случая, така че останалият код не знае и не го интересува кое
 * от двете се използва.
 */
const LOCAL_STORAGE_ROOT = path.resolve(process.cwd(), "storage", "tickets");
const usingR2 = env.R2_ENABLED &&
    Boolean(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME);
if (env.R2_ENABLED && !usingR2) {
    console.warn("[storage] R2_ENABLED=true, но липсват R2 credentials в .env — пада се обратно на локален диск.");
}
let s3Client = null;
function getR2Client() {
    if (!s3Client) {
        s3Client = new S3Client({
            region: "auto",
            endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            credentials: {
                accessKeyId: env.R2_ACCESS_KEY_ID,
                secretAccessKey: env.R2_SECRET_ACCESS_KEY,
            },
        });
    }
    return s3Client;
}
export const storageService = {
    isUsingR2() {
        return usingR2;
    },
    async put(objectKey, data, contentType = "application/pdf") {
        if (usingR2) {
            await getR2Client().send(new PutObjectCommand({
                Bucket: env.R2_BUCKET_NAME,
                Key: objectKey,
                Body: data,
                ContentType: contentType,
            }));
            return;
        }
        const filePath = path.join(LOCAL_STORAGE_ROOT, objectKey);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, data);
    },
    async get(objectKey) {
        if (usingR2) {
            const res = await getR2Client().send(new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: objectKey }));
            const bytes = await res.Body?.transformToByteArray();
            if (!bytes)
                throw new Error(`Празен обект в R2: ${objectKey}`);
            return Buffer.from(bytes);
        }
        const filePath = path.join(LOCAL_STORAGE_ROOT, objectKey);
        return fs.readFile(filePath);
    },
    /**
     * Signed URL с ограничен живот — за случаите, когато искаме да пратим
     * директен линк (напр. в имейл), вместо да streamваме през нашия backend.
     * В момента приложението сервира PDF-а през защитен backend endpoint
     * (виж tickets.routes.ts), затова това е налично, но не е задължително.
     */
    async getSignedReadUrl(objectKey, expiresInSeconds = 3600) {
        if (!usingR2)
            return null;
        return getSignedUrl(getR2Client(), new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: objectKey }), { expiresIn: expiresInSeconds });
    },
    async remove(objectKey) {
        if (usingR2) {
            await getR2Client().send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: objectKey }));
            return;
        }
        const filePath = path.join(LOCAL_STORAGE_ROOT, objectKey);
        await fs.rm(filePath, { force: true });
    },
};
//# sourceMappingURL=storage.service.js.map