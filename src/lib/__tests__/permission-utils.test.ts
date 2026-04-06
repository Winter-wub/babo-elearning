import { describe, it, expect } from "vitest";
import {
  getPermissionTimeStatus,
  isPermissionCurrentlyValid,
  resolveTimeFields,
} from "../permission-utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE = new Date("2026-04-06T12:00:00.000Z");
const PAST = new Date("2026-04-01T00:00:00.000Z");
const FUTURE = new Date("2026-04-20T00:00:00.000Z");
const FAR_FUTURE = new Date("2026-12-31T23:59:59.000Z");

// ---------------------------------------------------------------------------
// getPermissionTimeStatus
// ---------------------------------------------------------------------------

describe("getPermissionTimeStatus", () => {
  it("returns 'permanent' when both validFrom and validUntil are null", () => {
    expect(
      getPermissionTimeStatus({ validFrom: null, validUntil: null }, BASE),
    ).toBe("permanent");
  });

  it("returns 'active' when now is between validFrom and validUntil", () => {
    expect(
      getPermissionTimeStatus({ validFrom: PAST, validUntil: FUTURE }, BASE),
    ).toBe("active");
  });

  it("returns 'not_yet_active' when now is before validFrom", () => {
    expect(
      getPermissionTimeStatus({ validFrom: FUTURE, validUntil: FAR_FUTURE }, BASE),
    ).toBe("not_yet_active");
  });

  it("returns 'expired' when now is after validUntil", () => {
    expect(
      getPermissionTimeStatus({ validFrom: PAST, validUntil: PAST }, BASE),
    ).toBe("expired");
  });

  it("returns 'active' when validFrom is null and validUntil is in the future", () => {
    expect(
      getPermissionTimeStatus({ validFrom: null, validUntil: FUTURE }, BASE),
    ).toBe("active");
  });

  it("returns 'expired' when validFrom is null and validUntil is in the past", () => {
    expect(
      getPermissionTimeStatus({ validFrom: null, validUntil: PAST }, BASE),
    ).toBe("expired");
  });

  it("returns 'active' when validFrom is in the past and validUntil is null", () => {
    expect(
      getPermissionTimeStatus({ validFrom: PAST, validUntil: null }, BASE),
    ).toBe("active");
  });

  it("returns 'not_yet_active' when validFrom is in the future and validUntil is null", () => {
    expect(
      getPermissionTimeStatus({ validFrom: FUTURE, validUntil: null }, BASE),
    ).toBe("not_yet_active");
  });

  // Boundary: now === validFrom → active (access starts at validFrom)
  it("returns 'active' at the exact validFrom boundary", () => {
    const exact = new Date("2026-04-06T12:00:00.000Z");
    expect(
      getPermissionTimeStatus({ validFrom: exact, validUntil: FUTURE }, exact),
    ).toBe("active");
  });

  // Boundary: now === validUntil → expired (past the deadline)
  it("returns 'expired' at the exact validUntil boundary", () => {
    // now > validUntil is false when equal, but we defined expired as now > validUntil
    // So at exact boundary, now is NOT > validUntil → still active
    const exact = new Date("2026-04-06T12:00:00.000Z");
    // 1ms past the deadline
    const justAfter = new Date(exact.getTime() + 1);
    expect(
      getPermissionTimeStatus({ validFrom: PAST, validUntil: exact }, justAfter),
    ).toBe("expired");
  });

  it("returns 'active' when now equals validUntil exactly (not yet past)", () => {
    const exact = new Date("2026-04-06T12:00:00.000Z");
    expect(
      getPermissionTimeStatus({ validFrom: PAST, validUntil: exact }, exact),
    ).toBe("active");
  });
});

// ---------------------------------------------------------------------------
// isPermissionCurrentlyValid
// ---------------------------------------------------------------------------

describe("isPermissionCurrentlyValid", () => {
  it("returns true for permanent permissions", () => {
    expect(
      isPermissionCurrentlyValid({ validFrom: null, validUntil: null }, BASE),
    ).toBe(true);
  });

  it("returns true for active permissions", () => {
    expect(
      isPermissionCurrentlyValid({ validFrom: PAST, validUntil: FUTURE }, BASE),
    ).toBe(true);
  });

  it("returns false for expired permissions", () => {
    expect(
      isPermissionCurrentlyValid({ validFrom: PAST, validUntil: PAST }, BASE),
    ).toBe(false);
  });

  it("returns false for not_yet_active permissions", () => {
    expect(
      isPermissionCurrentlyValid({ validFrom: FUTURE, validUntil: FAR_FUTURE }, BASE),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// resolveTimeFields
// ---------------------------------------------------------------------------

describe("resolveTimeFields", () => {
  const grantedAt = new Date("2026-04-06T10:00:00.000Z");

  it("returns all nulls for permanent mode", () => {
    const result = resolveTimeFields({ mode: "permanent" }, grantedAt);
    expect(result).toEqual({
      validFrom: null,
      validUntil: null,
      durationDays: null,
    });
  });

  it("computes validUntil from durationDays for relative mode", () => {
    const result = resolveTimeFields({ mode: "relative", durationDays: 7 }, grantedAt);
    expect(result.validFrom).toBeNull();
    expect(result.durationDays).toBe(7);

    const expectedUntil = new Date(grantedAt);
    expectedUntil.setDate(expectedUntil.getDate() + 7);
    expect(result.validUntil?.getTime()).toBe(expectedUntil.getTime());
  });

  it("computes validUntil for 30-day duration", () => {
    const result = resolveTimeFields({ mode: "relative", durationDays: 30 }, grantedAt);
    const expectedUntil = new Date(grantedAt);
    expectedUntil.setDate(expectedUntil.getDate() + 30);
    expect(result.validUntil?.getTime()).toBe(expectedUntil.getTime());
    expect(result.durationDays).toBe(30);
  });

  it("passes through validFrom and validUntil for absolute mode", () => {
    const from = new Date("2026-01-11T18:00:00.000Z");
    const until = new Date("2026-05-03T06:00:00.000Z");
    const result = resolveTimeFields(
      { mode: "absolute", validFrom: from, validUntil: until },
      grantedAt,
    );
    expect(result).toEqual({
      validFrom: from,
      validUntil: until,
      durationDays: null,
    });
  });
});
