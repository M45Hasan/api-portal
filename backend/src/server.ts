import bcrypt from "bcryptjs";
import app from "./app";
import { env } from "./config/env";
import { connectDatabase, disconnectDatabase } from "./database/connect";
import { Admin } from "./models/Admin";

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const email = env.ADMIN_EMAIL.toLowerCase();
  const existing = await Admin.findOne({ email }).select("+passwordHash");
  if (!existing) {
    const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
    await Admin.create({ email, passwordHash, role: "admin", status: "active" });
    console.log("Bootstrap admin created from environment configuration");
  } else {
    console.log("Bootstrap admin already exists; environment password was not applied");
  }

  const server = app.listen(env.PORT, () => console.log(`ApiPortal listening on port ${env.PORT}`));
  let closing = false;

  async function shutdown(signal: string): Promise<void> {
    if (closing) return;
    closing = true;
    console.log(`Received ${signal}; shutting down`);
    const timeout = setTimeout(() => process.exit(1), 10_000);
    timeout.unref();
    server.close(async (error) => {
      try { await disconnectDatabase(); } catch { process.exitCode = 1; }
      if (error) process.exitCode = 1;
      clearTimeout(timeout);
      process.exit();
    });
  }
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

bootstrap().catch((error) => {
  console.error("ApiPortal startup failed", { name: error instanceof Error ? error.name : "UnknownError" });
  process.exit(1);
});
