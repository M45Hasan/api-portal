import type { RequestHandler } from "express";
import { verifyToken } from "../services/token.service";
import { Admin } from "../models/Admin";
import { Developer } from "../models/Developer";
import { Portal } from "../models/Portal";
import { createHash, timingSafeEqual } from "node:crypto";

export const authenticateBearer: RequestHandler = (req, res, next) => {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: { code: "AUTH_REQUIRED", message: "Bearer token required" } });
    return;
  }
  try {
    req.principal = verifyToken(header.slice(7).trim());
    next();
  } catch {
    res.status(401).json({ success: false, error: { code: "INVALID_TOKEN", message: "Invalid or expired token" } });
  }
};

export const requireAdmin: RequestHandler = async (req, res, next) => {
  if (!req.principal || req.principal.principalType !== "admin") {
    res.status(403).json({ success: false, error: { code: "ADMIN_REQUIRED", message: "Administrator access required" } });
    return;
  }
  const admin = await Admin.findById(req.principal.sub).select("_id status role").lean();
  if (!admin || admin.status !== "active" || admin.role === "read-only") {
    res.status(403).json({ success: false, error: { code: "ADMIN_INACTIVE", message: "Administrator access unavailable" } });
    return;
  }
  next();
};

export type AuthIdentity =
  | { type: "developer"; id: string; companyDeveloperId: string }
  | { type: "portal"; id: string; portalCode: string };

function matchesKey(storedHex: string, suppliedKey: string): boolean {
  const stored = Buffer.from(storedHex, "hex");
  const supplied = createHash("sha256").update(suppliedKey).digest();
  return stored.length === supplied.length && timingSafeEqual(stored, supplied);
}

export const authenticateApiIdentity: RequestHandler = async (req, res, next) => {
  const portalKey = req.header("x-portal-key");
  const developerKey = req.header("x-developer-key");

  if (portalKey && developerKey) {
    res.status(400).json({ success: false, error: { code: "AMBIGUOUS_IDENTITY", message: "Send only one identity credential" } });
    return;
  }

  if (portalKey) {
    if (portalKey.length > 512) {
      res.status(401).json({ success: false, error: { code: "INVALID_PORTAL_KEY", message: "Invalid portal credential" } });
      return;
    }
    const candidates = await Portal.find({ keyPrefix: portalKey.slice(0, 12), status: "active" }).select("+keyHash").lean();
    const portal = candidates.find((item) => matchesKey(item.keyHash, portalKey));
    if (!portal) {
      res.status(401).json({ success: false, error: { code: "INVALID_PORTAL_KEY", message: "Invalid portal credential" } });
      return;
    }
    (req as any).apiIdentity = { type: "portal", id: String(portal._id), portalCode: portal.portalCode } satisfies AuthIdentity;
    next();
    return;
  }

  if (developerKey) {
    if (developerKey.length > 512) {
      res.status(401).json({ success: false, error: { code: "INVALID_DEVELOPER_KEY", message: "Invalid developer credential" } });
      return;
    }
    const candidates = await Developer.find({ keyPrefix: developerKey.slice(0, 12), status: "active" }).select("+keyHash").lean();
    const developer = candidates.find((item) => matchesKey(item.keyHash, developerKey));
    if (!developer) {
      res.status(401).json({ success: false, error: { code: "INVALID_DEVELOPER_KEY", message: "Invalid developer credential" } });
      return;
    }
    (req as any).apiIdentity = { type: "developer", id: String(developer._id), companyDeveloperId: developer.companyDeveloperId } satisfies AuthIdentity;
    next();
    return;
  }

  res.status(401).json({ success: false, error: { code: "AUTH_REQUIRED", message: "Developer key or portal key required" } });
};
