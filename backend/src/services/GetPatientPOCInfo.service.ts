
import { XMLParser } from "fast-xml-parser";
import { env } from "../config/env";

const SOAP_NAMESPACE =
  "https://www.hhaexchange.com/apis/hhaws.integration";

const parser = new XMLParser({
  removeNSPrefix: true,
  ignoreAttributes: false,
  parseTagValue: true,
  trimValues: true,
});

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GetPatientPOCInfo(
  pocId: number
): Promise<unknown> {
  if (!Number.isSafeInteger(pocId) || pocId <= 0) {
    throw new Error("POCID must be a positive integer");
  }

  // MOCK MODE: synthetic data only
  if (env.HHA_MODE === "mock") {
    return {
      sample: true,
      operation: "GetPatientPOCInfo",
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
    };
  }

  // LIVE MODE: use server-side HHAexchange credentials
  const endpoint = env.HHA_SOAP_ENDPOINT;
  const hhaConfig = env as typeof env & {
    HHA_APP_NAME?: string;
    HHA_APP_SECRET?: string;
    HHA_APP_KEY?: string;
  };
  const appName = hhaConfig.HHA_APP_NAME;
  const appSecret = hhaConfig.HHA_APP_SECRET;
  const appKey = hhaConfig.HHA_APP_KEY;

  if (!endpoint || !appName || !appSecret || !appKey) {
    throw new Error("HHAexchange SOAP configuration is incomplete");
  }

  const soapAction =
    `${SOAP_NAMESPACE}/GetPatientPOCInfo`;

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetPatientPOCInfo xmlns="${SOAP_NAMESPACE}">
      <Authentication>
        <AppName>${escapeXml(appName)}</AppName>
        <AppSecret>${escapeXml(appSecret)}</AppSecret>
        <AppKey>${escapeXml(appKey)}</AppKey>
      </Authentication>
      <POCInfo>
        <POCID>${pocId}</POCID>
      </POCInfo>
    </GetPatientPOCInfo>
  </soap:Body>
</soap:Envelope>`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: `"${soapAction}"`,
    },
    body: xml,
    signal: AbortSignal.timeout(30000),
  });

  const responseXml = await response.text();
  const parsed = parser.parse(responseXml);

  const body = parsed.Envelope?.Body ?? parsed;
  if (body.Fault) {
    throw new Error("HHAexchange returned a SOAP fault");
  }

  if (!response.ok) {
    throw new Error(
      `HHAexchange HTTP error: ${response.status}`
    );
  }

  const result =
    body.GetPatientPOCInfoResponse?.GetPatientPOCInfoResult;

  if (result === undefined) {
    throw new Error("GetPatientPOCInfo result was missing");
  }

  return result;
}
