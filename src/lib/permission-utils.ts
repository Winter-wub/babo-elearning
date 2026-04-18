// ---------------------------------------------------------------------------
// Time-based permission validation utilities
// ---------------------------------------------------------------------------

export type PermissionTimeStatus =
  | "permanent"
  | "active"
  | "expired"
  | "not_yet_active";

/**
 * Determine the current temporal status of a permission.
 *
 * Rules:
 *  - Both null → permanent (never expires, immediately valid)
 *  - validFrom in the future → not_yet_active
 *  - validUntil in the past → expired
 *  - Otherwise → active
 *
 * The `now` parameter is injectable for deterministic testing.
 */
export function getPermissionTimeStatus(
  permission: { validFrom: Date | null; validUntil: Date | null },
  now: Date = new Date(),
): PermissionTimeStatus {
  if (!permission.validFrom && !permission.validUntil) return "permanent";
  if (permission.validFrom && now < permission.validFrom) return "not_yet_active";
  if (permission.validUntil && now > permission.validUntil) return "expired";
  return "active";
}

/**
 * Returns true if the permission is currently valid (permanent or active).
 */
export function isPermissionCurrentlyValid(
  permission: { validFrom: Date | null; validUntil: Date | null },
  now: Date = new Date(),
): boolean {
  const status = getPermissionTimeStatus(permission, now);
  return status === "active" || status === "permanent";
}

// ---------------------------------------------------------------------------
// Time config resolution (mode → DB fields)
// ---------------------------------------------------------------------------

export type PermissionTimeConfig =
  | { mode: "permanent" }
  | { mode: "relative"; durationDays: number; durationHours: number }
  | { mode: "absolute"; validFrom: Date; validUntil: Date };

export type ResolvedTimeFields = {
  validFrom: Date | null;
  validUntil: Date | null;
  durationDays: number | null;
  durationHours: number | null;
};

/**
 * Convert a UI-facing time config into the flat DB fields.
 *
 * For "relative" mode, `validUntil` is computed as `grantedAt + durationDays`.
 */
export function resolveTimeFields(
  timeConfig: PermissionTimeConfig,
  grantedAt: Date = new Date(),
): ResolvedTimeFields {
  switch (timeConfig.mode) {
    case "permanent":
      return { validFrom: null, validUntil: null, durationDays: null, durationHours: null };
    case "relative": {
      const validUntil = new Date(grantedAt);
      validUntil.setDate(validUntil.getDate() + timeConfig.durationDays);
      validUntil.setHours(validUntil.getHours() + timeConfig.durationHours);
      return {
        validFrom: null,
        validUntil,
        durationDays: timeConfig.durationDays,
        durationHours: timeConfig.durationHours,
      };
    }
    case "absolute":
      return {
        validFrom: timeConfig.validFrom,
        validUntil: timeConfig.validUntil,
        durationDays: null,
        durationHours: null,
      };
  }
}

// ---------------------------------------------------------------------------
// Reconstruct time config from stored DB fields
// ---------------------------------------------------------------------------

/**
 * Reconstruct a `PermissionTimeConfig` from decomposed DB fields.
 * Used when redeeming an invite link whose time config was stored as flat columns.
 */
export function reconstructTimeConfig(fields: {
  timeMode: string;
  durationDays: number | null;
  durationHours: number | null;
  validFrom: Date | null;
  validUntil: Date | null;
}): PermissionTimeConfig {
  switch (fields.timeMode) {
    case "relative":
      return { mode: "relative", durationDays: fields.durationDays ?? 0, durationHours: fields.durationHours ?? 0 };
    case "absolute":
      return {
        mode: "absolute",
        validFrom: fields.validFrom ?? new Date(),
        validUntil: fields.validUntil ?? new Date(),
      };
    default:
      return { mode: "permanent" };
  }
}
