import { Router } from "express";
import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { Developer } from "../models/Developer";
import { Portal } from "../models/Portal";
import { ApiDefinition } from "../models/ApiDefinition";
import { AccessGrant } from "../models/AccessGrant";
import { AuditEvent } from "../models/AuditEvent";
import { authenticateBearer, requireAdmin } from "../middleware/auth";
import { audit } from "../services/audit";

const router = Router();
router.use(authenticateBearer, requireAdmin);

const envSchema = z.enum(["development", "staging", "production"]);

router.get("/developers", async (_req, res) => {
  const items = await Developer.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: items });
});

router.post("/developers", async (req, res) => {
  const schema = z.object({
    companyDeveloperId: z.string().trim().min(1).max(128),
    displayName: z.string().trim().max(120).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: "INVALID_INPUT", message: "Invalid developer fields" },
    });
    return;
  }
  const exists = await Developer.findOne({
    companyDeveloperId: parsed.data.companyDeveloperId,
  });
  if (exists) {
    res.status(409).json({
      success: false,
      error: {
        code: "DEVELOPER_EXISTS",
        message: "Developer ID already exists",
      },
    });
    return;
  }
  const developerKey = `dev_${randomBytes(32).toString("hex")}`;
  const developer = await Developer.create({
    ...parsed.data,
    keyHash: createHash("sha256").update(developerKey).digest("hex"),
    keyPrefix: developerKey.slice(0, 12),
  });
  await audit({
    actorType: "admin",
    actorId: req.principal!.sub,
    action: "developer.create",
    targetType: "developer",
    targetId: String(developer._id),
    outcome: "success",
    requestId: req.requestId,
  });
  res.status(201).json({
    success: true,
    data: {
      developer: {
        id: String(developer._id),
        companyDeveloperId: developer.companyDeveloperId,
        displayName: developer.displayName,
        status: developer.status,
      },
      developerKey,
      warning: "Copy this developer key now. It cannot be retrieved later.",
    },
  });
});

router.patch("/developers/:id/status", async (req, res) => {
  const parsed = z
    .object({ status: z.enum(["active", "suspended"]) })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: {
        code: "INVALID_INPUT",
        message: "Status must be active or suspended",
      },
    });
    return;
  }
  const item = await Developer.findByIdAndUpdate(
    req.params.id,
    { status: parsed.data.status },
    { new: true },
  ).lean();
  if (!item) {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Developer not found" },
    });
    return;
  }
  await audit({
    actorType: "admin",
    actorId: req.principal!.sub,
    action: "developer.status.update",
    targetType: "developer",
    targetId: String(item._id),
    outcome: "success",
    requestId: req.requestId,
    metadata: { status: item.status },
  });
  res.json({ success: true, data: item });
});

router.post("/developers/:id/rotate-key", async (req, res) => {
  const developer = await Developer.findById(req.params.id);
  if (!developer) {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Developer not found" },
    });
    return;
  }
  const developerKey = `dev_${randomBytes(32).toString("hex")}`;
  developer.set({
    keyHash: createHash("sha256").update(developerKey).digest("hex"),
    keyPrefix: developerKey.slice(0, 12),
  });
  await developer.save();
  await audit({
    actorType: "admin",
    actorId: req.principal!.sub,
    action: "developer.key.rotate",
    targetType: "developer",
    targetId: String(developer._id),
    outcome: "success",
    requestId: req.requestId,
  });
  res.json({
    success: true,
    data: {
      developerId: developer.companyDeveloperId,
      developerKey,
      warning:
        "The previous developer key is now invalid. Copy this key now; it cannot be retrieved later.",
    },
  });
});

router.get("/portals", async (_req, res) => {
  const items = await Portal.find()
    .sort({ createdAt: -1 })
    .select("-keyHash")
    .lean();
  res.json({ success: true, data: items });
});

router.post("/portals", async (req, res) => {
  const schema = z.object({
    portalCode: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9_-]+$/),
    name: z.string().trim().min(1).max(120),
    environment: envSchema,
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: "INVALID_INPUT", message: "Invalid portal fields" },
    });
    return;
  }
  if (
    await Portal.findOne({ portalCode: parsed.data.portalCode.toUpperCase() })
  ) {
    res.status(409).json({
      success: false,
      error: { code: "PORTAL_EXISTS", message: "Portal code already exists" },
    });
    return;
  }
  const key = `ap_${randomBytes(32).toString("hex")}`;
  const portal = await Portal.create({
    ...parsed.data,
    portalCode: parsed.data.portalCode.toUpperCase(),
    keyHash: createHash("sha256").update(key).digest("hex"),
    keyPrefix: key.slice(0, 12),
  });
  await audit({
    actorType: "admin",
    actorId: req.principal!.sub,
    action: "portal.create",
    targetType: "portal",
    targetId: String(portal._id),
    outcome: "success",
    requestId: req.requestId,
  });
  res.status(201).json({
    success: true,
    data: {
      portal: {
        id: String(portal._id),
        portalCode: portal.portalCode,
        name: portal.name,
        environment: portal.environment,
        status: portal.status,
      },
      serviceKey: key,
      warning: "Copy this key now. It cannot be retrieved later.",
    },
  });
});

router.patch("/portals/:id/status", async (req, res) => {
  const parsed = z
    .object({ status: z.enum(["active", "suspended"]) })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: {
        code: "INVALID_INPUT",
        message: "Status must be active or suspended",
      },
    });
    return;
  }
  const item = await Portal.findByIdAndUpdate(
    req.params.id,
    { status: parsed.data.status },
    { new: true },
  )
    .select("-keyHash")
    .lean();
  if (!item) {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Portal not found" },
    });
    return;
  }
  await audit({
    actorType: "admin",
    actorId: req.principal!.sub,
    action: "portal.status.update",
    targetType: "portal",
    targetId: String(item._id),
    outcome: "success",
    requestId: req.requestId,
  });
  res.json({ success: true, data: item });
});

router.get("/apis", async (_req, res) => {
  res.json({
    success: true,
    data: await ApiDefinition.find().sort({ code: 1 }).lean(),
  });
});

router.post("/apis", async (req, res) => {
  const parsed = z
    .object({
      code: z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-z0-9][a-z0-9_-]{0,63}$/),
      name: z.string().trim().min(1).max(120),
      description: z.string().max(500).optional(),
      enabled: z.boolean().optional(),
      mode: z.enum(["mock", "hha"]).optional(),
      risk: z.enum(["low", "medium", "high"]).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: "INVALID_INPUT", message: "Invalid API definition" },
    });
    return;
  }
  if (await ApiDefinition.findOne({ code: parsed.data.code })) {
    res.status(409).json({
      success: false,
      error: { code: "API_EXISTS", message: "API code already exists" },
    });
    return;
  }
  const api = await ApiDefinition.create(parsed.data);
  await audit({
    actorType: "admin",
    actorId: req.principal!.sub,
    action: "api.create",
    targetType: "api",
    targetId: String(api._id),
    apiCode: api.code,
    outcome: "success",
    requestId: req.requestId,
  });
  res.status(201).json({ success: true, data: api });
});

router.patch("/apis/:id", async (req, res) => {
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(120).optional(),
      description: z.string().max(500).optional(),
      enabled: z.boolean().optional(),
      mode: z.enum(["mock", "hha"]).optional(),
      risk: z.enum(["low", "medium", "high"]).optional(),
    })
    .strict()
    .safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data || {}).length === 0) {
    res.status(400).json({
      success: false,
      error: { code: "INVALID_INPUT", message: "Invalid API update" },
    });
    return;
  }
  const api = await ApiDefinition.findByIdAndUpdate(
    req.params.id,
    parsed.data,
    { new: true, runValidators: true },
  ).lean();
  if (!api) {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "API not found" },
    });
    return;
  }
  await audit({
    actorType: "admin",
    actorId: req.principal!.sub,
    action: "api.update",
    targetType: "api",
    targetId: String(api._id),
    apiCode: api.code,
    outcome: "success",
    requestId: req.requestId,
  });
  res.json({ success: true, data: api });
});

router.get("/grants", async (_req, res) => {
  const grants = await AccessGrant.find().sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: grants });
});

router.post("/grants", async (req, res) => {
  const parsed = z
    .object({
      principalType: z.enum(["developer", "portal"]),
      principalId: z.string().regex(/^[a-f\d]{24}$/i),
      apiCode: z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-z0-9][a-z0-9_-]{0,63}$/),
      environment: envSchema,
      expiresAt: z.string().datetime().optional(),
      reason: z.string().max(500).optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: { code: "INVALID_INPUT", message: "Invalid grant fields" },
    });
    return;
  }
  console.log(parsed.data);
  const api = await ApiDefinition.findOne({
    code: parsed.data.apiCode,
    enabled: true,
  }).lean();
  if (!api) {
    res.status(400).json({
      success: false,
      error: {
        code: "API_NOT_AVAILABLE",
        message: "API is unknown or disabled",
      },
    });
    return;
  }
  const portal = await Portal.findById(parsed.data.principalId).lean();
  if (parsed.data.principalType === "developer") {
    const developer = await Developer.findById(parsed.data.principalId).lean();
    if (!developer || developer.status !== "active") {
      res.status(400).json({
        success: false,
        error: {
          code: "DEVELOPER_NOT_ACTIVE",
          message: "Developer must exist and be active",
        },
      });
      return;
    }
  } else {
    if (!portal || portal.status !== "active") {
      res.status(400).json({
        success: false,
        error: {
          code: "PORTAL_NOT_ACTIVE",
          message: "Portal must exist and be active",
        },
      });
      return;
    }
    if (portal.environment !== parsed.data.environment) {
      res.status(400).json({
        success: false,
        error: {
          code: "ENVIRONMENT_MISMATCH",
          message: "Grant environment must match the portal environment",
        },
      });
      return;
    }
  }

  const filter = {
    principalType: parsed.data.principalType,
    principalId: parsed.data.principalId,
    apiCode: parsed.data.apiCode,
    environment: parsed.data.environment,
  };
  const grant = await AccessGrant.findOneAndUpdate(
    filter,
    {
      $set: {
        status: "active",
        approvedBy: req.principal!.sub,
        approvedAt: new Date(),
        expiresAt: parsed.data.expiresAt
          ? new Date(parsed.data.expiresAt)
          : null,
        reason: parsed.data.reason || "",
      },
    },
    { upsert: true, new: true, runValidators: true },
  );

  await audit({
    actorType: "admin",
    actorId: req.principal!.sub,
    action: "grant.create_or_update",
    targetType: "grant",
    targetId: String(grant._id),
    apiCode: grant.apiCode,
    environment: grant.environment,
    outcome: "success",
    requestId: req.requestId,
  });
  res.status(201).json({
    success: true,
    data: {
      ...grant.toObject(),
      name:
        parsed.data.principalType === "portal" ? (portal?.name ?? null) : null,
    },
  });
});

router.delete("/grants/:id", async (req, res) => {
  const grant = await AccessGrant.findByIdAndUpdate(
    req.params.id,
    { status: "revoked" },
    { new: true },
  ).lean();
  if (!grant) {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Grant not found" },
    });
    return;
  }
  await audit({
    actorType: "admin",
    actorId: req.principal!.sub,
    action: "grant.revoke",
    targetType: "grant",
    targetId: String(grant._id),
    apiCode: grant.apiCode,
    environment: grant.environment,
    outcome: "success",
    requestId: req.requestId,
  });
  res.json({ success: true, data: grant });
});

router.get("/audit", async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const events = await AuditEvent.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  res.json({ success: true, data: events });
});

export default router;
