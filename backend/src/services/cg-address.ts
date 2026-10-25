
export interface ApiResult {
  apiCode: string;
  mode: "mock" | "hha";
  data: unknown;
}

export async function executeApprovedApi(
  apiCode: string,
  input: unknown
): Promise<ApiResult> {
  // Testing only: no real HHAexchange request is made.
  if (apiCode === "cg-address") {
    const filters =
      input && typeof input === "object"
        ? (input as Record<string, unknown>)
        : {};

    const caregivers = [
      {
        caregiverId: "TEST-CG-1001",
        firstName: "Alex",
        lastName: "Morgan",
        address: {
          line1: "100 Example Street",
          line2: "Suite 2",
          city: "Testville",
          state: "NY",
          postalCode: "10001",
          country: "US"
        }
      },
      {
        caregiverId: "TEST-CG-1002",
        firstName: "Taylor",
        lastName: "Reed",
        address: {
          line1: "25 Sample Avenue",
          line2: "",
          city: "Testville",
          state: "NY",
          postalCode: "10002",
          country: "US"
        }
      }
    ];

    const caregiverId =
      typeof filters.caregiverId === "string"
        ? filters.caregiverId
        : undefined;

    const   filteredCaregivers = caregiverId
      ? caregivers.filter(
          (caregiver) =>
            caregiver.caregiverId === caregiverId
        )
      : caregivers;

    return {
      apiCode: "cg-address",
      mode: "mock",
      data: {
        operation: "cgAdd",
        sample: true,
        message:
          "Mock response only. HHAexchange was not called.",
        caregivers: filteredCaregivers
      }
    };
  }

  throw new Error(`Unsupported test API: ${apiCode}`);
}
