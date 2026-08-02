import { z } from "zod";
export const registerSchema = z
    .object({
    username: z
        .string()
        .min(3, "Потребителското име трябва да е поне 3 символа")
        .max(32, "Потребителското име трябва да е най-много 32 символа")
        .regex(/^[a-zA-Z0-9_.-]+$/, "Потребителското име съдържа непозволени символи"),
    email: z.string().email("Невалиден имейл адрес").max(255),
    password: z
        .string()
        .min(8, "Паролата трябва да е поне 8 символа")
        .max(128, "Паролата е твърде дълга"),
    passwordConfirmation: z.string(),
})
    .refine((data) => data.password === data.passwordConfirmation, {
    message: "Паролите не съвпадат",
    path: ["passwordConfirmation"],
});
export const loginSchema = z.object({
    emailOrUsername: z.string().min(1, "Въведете имейл или потребителско име"),
    password: z.string().min(1, "Въведете парола"),
});
export const forgotPasswordSchema = z.object({
    email: z.string().email("Невалиден имейл адрес"),
});
export const resetPasswordSchema = z
    .object({
    token: z.string().min(1),
    password: z.string().min(8, "Паролата трябва да е поне 8 символа").max(128),
    passwordConfirmation: z.string(),
})
    .refine((data) => data.password === data.passwordConfirmation, {
    message: "Паролите не съвпадат",
    path: ["passwordConfirmation"],
});
export const verifyEmailSchema = z.object({
    token: z.string().min(1, "Липсва token за потвърждение"),
});
//# sourceMappingURL=auth.validation.js.map