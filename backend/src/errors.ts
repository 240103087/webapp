import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { fieldErrors, type ApiErrorBody } from "@moveeasy/shared";

/** Any error a route throws on purpose. Becomes `ApiErrorBody` with this status. */
export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public extra: Partial<Omit<ApiErrorBody, "code" | "message">> = {},
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new HttpError(404, "not_found", `${what} not found`);

export function validationError(err: ZodError): HttpError {
  const fields = fieldErrors(err);
  return new HttpError(422, "validation", Object.values(fields)[0] ?? "Some fields are not valid", { fields });
}

/** Unknown `/api` routes. */
export const apiNotFound: RequestHandler = (req, res) => {
  res.status(404).json({ code: "not_found", message: `No route ${req.method} ${req.originalUrl.split("?")[0]}` } satisfies ApiErrorBody);
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) err = validationError(err);
  if (err instanceof HttpError) {
    res.status(err.status).json({ code: err.code, message: err.message, ...err.extra } satisfies ApiErrorBody);
    return;
  }
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ code: "bad_json", message: "The request body is not valid JSON" });
    return;
  }
  if (err?.type === "entity.too.large") {
    res.status(413).json({ code: "too_big", message: "The request is too large" });
    return;
  }
  console.error(err);
  res.status(500).json({ code: "internal", message: "Something went wrong on the server" });
};
