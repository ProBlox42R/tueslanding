import argon2 from "argon2";
/**
 * Хеширане на пароли с Argon2id. Никога не съхранявай plaintext пароли.
 */
export async function hashPassword(plain) {
    return argon2.hash(plain, { type: argon2.argon2id });
}
export async function verifyPassword(hash, plain) {
    try {
        return await argon2.verify(hash, plain);
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=password.js.map