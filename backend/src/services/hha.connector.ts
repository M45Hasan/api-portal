
import { env } from "../config/env";
import { GetPatientPOCInfo } from "./GetPatientPOCInfo.service";

export interface ApiResult {
  apiCode: string;
  mode: "mock" | "hha";
  data: unknown;
}

function getFilters(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  return input as Record<string, unknown>;
}

function getPocId(input: unknown): number {
  const filters = getFilters(input);
  const raw = filters.pocId;

  // Accept a positive integer or a numeric query-string value.
  if (
    typeof raw !== "number" &&
    typeof raw !== "string"
  ) {
    throw new Error("pocId is required");
  }

  if (
    typeof raw === "string" &&
    !/^[1-9]\d*$/.test(raw)
  ) {
    throw new Error("pocId must be a positive integer");
  }

  const pocId = Number(raw);

  if (!Number.isSafeInteger(pocId) || pocId <= 0) {
    throw new Error("pocId must be a positive integer");
  }

  return pocId;
}

function mockPatientPOCInfo(pocId: number): ApiResult {
  return {
    apiCode: "get-patient-poc-info",
    mode: "mock",
    data: {
      sample: true,
      operation: "GetPatientPOCInfo",
      GetPatientPOCInfoResult: {
        POCInfo: {
          Patient: {
            ID: 101,
            AdmissionNumber: "TEST-ADM-101",
            FirstName: "Alex",
            LastName: "Morgan",
          },
          ID: pocId,
          StartDate: "2026-01-01",
          StopDate: "2026-12-31",
          POCNumber: `TEST-POC-${pocId}`,
          Notes: "Synthetic test record",
          CreatedDate: "2026-01-01",
          Tasks: {
            Task: [],
          },
        },
      },
    },
  };
}

/**
 * Executes only approved API operations.
 *
 * Mock mode: synthetic test data; no HHAexchange call.
 * Live mode: calls a fixed, reviewed operation-specific SOAP handler.
 *
 * Never accept caller-supplied endpoint URLs, SOAP actions, credentials,
 * or raw SOAP XML.
 */
export async function executeApprovedApi(
  apiCode: string,
  input: unknown,
): Promise<ApiResult> {
  // Only the approved API code can use this SOAP operation.
  if (apiCode === "get-patient-poc-info") {
    const pocId = getPocId(input);

    if (env.HHA_MODE === "mock") {
      return mockPatientPOCInfo(pocId);
    }

    // Live handler reads credentials from server-side environment variables.
    if (!env.HHA_SOAP_ENDPOINT) {
      throw new Error("Live HHA SOAP endpoint is not configured");
    }

    const data = await GetPatientPOCInfo(pocId);

    return {
      apiCode,
      mode: "hha",
      data,
    };
  }

  // Preserve synthetic mock support for other registered API codes.
  if (env.HHA_MODE === "mock") {
    return {
      apiCode,
      mode: "mock",
      data: {
        message: "Synthetic mock response. No HHAexchange request was made.",
        apiCode,
        sample: true,
        receivedFilters: input,
      },
    };
  }

  // Unknown live operations must fail closed.
  throw new Error(
    `Live operation mapping for ${apiCode} is not implemented`,
  );
}
