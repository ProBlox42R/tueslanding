export class HttpError extends Error {
  status: number;
  fields?: Record<string, string[]>;

  constructor(status: number, message: string, fields?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export const BadRequest = (msg: string, fields?: Record<string, string[]>) =>
  new HttpError(400, msg, fields);
export const Unauthorized = (msg = "Не сте оторизирани") => new HttpError(401, msg);
export const Forbidden = (msg = "Нямате права за това действие") => new HttpError(403, msg);
export const NotFound = (msg = "Ресурсът не е намерен") => new HttpError(404, msg);
export const Conflict = (msg: string) => new HttpError(409, msg);
export const TooMany = (msg = "Твърде много опити. Опитайте по-късно.") => new HttpError(429, msg);
