import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { requestIdMiddleware } from "./middleware/requestId";
import { notFound, errorHandler } from "./middleware/errors";
import healthRoutes from "./routes/health.routes";
import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import dataRoutes from "./routes/data.routes";

const app = express();
if (env.TRUST_PROXY === "true") app.set("trust proxy", 1);

const allowedOrigins = new Set(env.CORS_ORIGINS.split(",").map((v) => v.trim()).filter(Boolean));
app.disable("x-powered-by");
app.use(requestIdMiddleware);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed"));
  },
  credentials: false
}));
app.use(express.json({ limit: "100kb", strict: true }));
app.use(rateLimit({ windowMs: 60_000, limit: 100, standardHeaders: true, legacyHeaders: false }));

app.get("/", (_req, res) => res.json({ name: "ApiPortal", version: "1.0.0", mode: env.HHA_MODE }));
app.use("/health", healthRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/data", dataRoutes);
app.use(notFound);
app.use(errorHandler);
export default app;
