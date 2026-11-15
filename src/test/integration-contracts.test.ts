import { describe, expect, it } from "vitest";
import { acknowledgementSchema, unavailableAdapter } from "@/lib/integration-contracts";
describe("Integration authority boundaries", () => {
  it("AT-16 an unavailable RMS adapter returns Unknown without invented data", async () => {
    const result = await unavailableAdapter("RMS").exactRevision("REC-LEMON-02");
    expect(result.status).toBe("UNKNOWN"); expect(result.data).toBeNull(); expect(result.updatedAt).toBeNull();
  });
  it("AT-23 technical receipt cannot be submitted as business acceptance", () => {
    expect(acknowledgementSchema.safeParse({ eventId: "11111111-1111-4111-8111-111111111111", organizationId: "22222222-2222-4222-8222-222222222222", siteId: null, consumer: "MES", revisionId: "33333333-3333-4333-8333-333333333333", contentHash: "a".repeat(64), status: "TECHNICAL_RECEIPT", reason: "Transport receipt", sourceTimestamp: "2026-11-15T11:00:00Z" }).success).toBe(false);
  });
  it("AT-25 missing or malformed hashes cannot enter the acknowledgement contract", () => {
    expect(acknowledgementSchema.safeParse({ eventId: "11111111-1111-4111-8111-111111111111", organizationId: "22222222-2222-4222-8222-222222222222", siteId: null, consumer: "MES", revisionId: "33333333-3333-4333-8333-333333333333", contentHash: "random-uuid", status: "BUSINESS_ACCEPTED", reason: "Accept exact revision", sourceTimestamp: "2026-11-15T11:00:00Z" }).success).toBe(false);
  });
});