import { AuditEvent } from "../models/AuditEvent";

export async function audit(input: {
  actorType: string;
  actorId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  apiCode?: string;
  environment?: string;
  outcome: "success" | "denied" | "failure";
  requestId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await AuditEvent.create(input);
  } catch {
    // Never log payloads or secrets as a fallback. Audit failure is visible
    // operationally; high-risk production operations should fail closed.
    console.error("Audit event write failed", { action: input.action, outcome: input.outcome });
  }
}
