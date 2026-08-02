import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/http-error.js";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: "Заявеният адрес не съществува." });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Невалидни входни данни.",
      fields: err.flatten().fieldErrors,
    });
  }

  if (err instanceof HttpError) {
    if (err.status >= 500) {
      console.error(err);
    }
    return res.status(err.status).json({ error: err.message, fields: err.fields });
  }

  console.error(err);
  return res.status(500).json({ error: "Възникна вътрешна грешка. Опитайте отново по-късно." });
}
