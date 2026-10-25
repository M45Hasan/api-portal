import type { ErrorRequestHandler, RequestHandler } from "express";

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Resource not found" } });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error("Request failed", { name: err instanceof Error ? err.name : "UnknownError" });
  if (res.headersSent) return;
  res.status(500).json({ success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" } });
};
