import { z } from "zod";

export const createAdminSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_.-]+$/, "Невалидно потребителско име"),
  email: z.string().email("Невалиден имейл адрес"),
  password: z.string().min(8, "Паролата трябва да е поне 8 символа").max(128),
});
