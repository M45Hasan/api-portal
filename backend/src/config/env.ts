import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: z.string().min(1),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default("15m"),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(12),
  HHA_MODE: z.enum(["mock", "live"]).default("mock"),
  HHA_SOAP_ENDPOINT: z.string().default(""),
  HHA_AUTH_TOKEN: z.string().default("")
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.issues);
  process.exit(1);
}
export const env = parsed.data;
