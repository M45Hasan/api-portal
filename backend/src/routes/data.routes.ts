
import { Router, Request, Response, NextFunction } from "express";
import { authenticateApiIdentity } from "../middleware/auth";
import { ApiDefinition } from "../models/ApiDefinition";
import { AccessGrant } from "../models/AccessGrant";
import { GetPatientPOCInfoCController } from "../controller/GetPatientPOCInfo.con";
import { executeApprovedApi } from "../services/hha.connector";

const router = Router();

const allowedEnvironments = [
  "development",
  "staging",
  "production",
] as const;

type ApiEnvironment = (typeof allowedEnvironments)[number];

function getEnvironment(req: Request): ApiEnvironment | null {
  const value = req.header("X-Api-Environment") ?? "development";

  return allowedEnvironments.includes(value as ApiEnvironment)
    ? (value as ApiEnvironment)
    : null;
}

/**
 * Authenticate the calling portal/developer, then check:
 * 1. API definition is enabled.
 * 2. Principal has an active grant for this API/environment.
 */
async function authorizeApi(
  req: Request,
  res: Response,
  next: NextFunction,
  apiCode: string,
): Promise<void> {
  try {
    const identity = (req as any).apiIdentity as
      | {
          type: "portal" | "developer";
          id: string;
        }
      | undefined;

    if (!identity) {
      res.status(401).json({
        success: false,
        error: {
          code: "AUTH_REQUIRED",
          message: "Portal or developer authentication required",
        },
      });
      return;
    }

    const environment = getEnvironment(req);

    if (!environment) {
      res.status(400).json({
        success: false,
        error: {
          code: "INVALID_ENVIRONMENT",
          message: "Invalid API environment",
        },
      });
      return;
    }

    const api = await ApiDefinition.findOne({
      code: apiCode,
      enabled: true,
    }).lean();

    if (!api) {
      res.status(404).json({
        success: false,
        error: {
          code: "API_NOT_AVAILABLE",
          message: "API is unknown or disabled",
        },
      });
      return;
    }

    const grant = await AccessGrant.findOne({
      principalType: identity.type,
      principalId: identity.id,
      apiCode,
      environment,
      status: "active",
      $or: [
        { expiresAt: null },
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } },
      ],
    }).lean();

    if (!grant) {
      res.status(403).json({
        success: false,
        error: {
          code: "API_ACCESS_DENIED",
          message: "No active grant for this API and environment",
        },
      });
      return;
    }

    // Keep the selected environment available to downstream handlers.
    res.locals.apiEnvironment = environment;
    next();
  } catch (error) {
    next(error);
  }
}

// GetPatientPOCInfo: dedicated controller and service.
router.get(
  "/GetPatientPOCInfo",
  authenticateApiIdentity,
  (req, res, next) =>
    authorizeApi(req, res, next, "GetPatientPOCInfo"),
  GetPatientPOCInfoCController,
);

// cg-address: generic connector.
router.get(
  "/cg-address",
  authenticateApiIdentity,
  (req, res, next) =>
    authorizeApi(req, res, next, "cg-address"),
  async (req: Request, res: Response) => {
    try {
      const result = await executeApprovedApi(
        "cg-address",
        req.query,
      );

      res.status(200).json({
        success: true,
        api: result.apiCode,
        environment: res.locals.apiEnvironment,
        data: result.data,
      });
    } catch (error) {
      console.error("cg-address request failed");

      res.status(502).json({
        success: false,
        error: {
          code: "API_REQUEST_FAILED",
          message: "API request failed",
        },
      });
    }
  },
);

export default router;
