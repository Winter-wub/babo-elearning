// ---------------------------------------------------------------------------
// Invite link status utilities
// ---------------------------------------------------------------------------

export type InviteLinkStatus = "active" | "expired" | "exhausted" | "revoked";

/**
 * Compute the display status of an invite link from its DB fields.
 */
export function getInviteLinkStatus(invite: {
  isRevoked: boolean;
  expiresAt: Date | null;
  maxRedemptions: number | null;
  currentRedemptions: number;
}, now: Date = new Date()): InviteLinkStatus {
  if (invite.isRevoked) return "revoked";
  if (invite.expiresAt && now > invite.expiresAt) return "expired";
  if (
    invite.maxRedemptions !== null &&
    invite.currentRedemptions >= invite.maxRedemptions
  ) {
    return "exhausted";
  }
  return "active";
}

/**
 * Build a human-readable Thai label for the permission time config.
 */
export function getPermissionLabel(fields: {
  timeMode: string;
  durationDays: number | null;
  validFrom: Date | null;
  validUntil: Date | null;
}): string {
  switch (fields.timeMode) {
    case "relative":
      return `เข้าถึง ${fields.durationDays} วัน`;
    case "absolute": {
      const fmt = (d: Date | null) =>
        d
          ? d.toLocaleDateString("th-TH", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "—";
      return `${fmt(fields.validFrom)} – ${fmt(fields.validUntil)}`;
    }
    default:
      return "เข้าถึงถาวร";
  }
}
