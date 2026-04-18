import { db } from "@/lib/db";
import type { Session } from "next-auth";
import type { Prisma } from "@prisma/client";

interface AuditEntry {
  userId: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Fire-and-forget audit log writer.
 * Never blocks the calling action; failures are logged to stderr.
 */
export function logAudit(entry: AuditEntry): void {
  db.auditLog
    .create({
      data: {
        userId: entry.userId,
        userEmail: entry.userEmail,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        metadata: entry.metadata ?? undefined,
      },
    })
    .catch((err) => {
      console.error("[audit] Failed to write audit log:", err);
    });
}

/**
 * Convenience wrapper — extracts user info from the session
 * that every admin action already holds after `requireAdmin()`.
 */
export function logAdminAction(
  session: Session,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Prisma.InputJsonValue,
): void {
  logAudit({
    userId: session.user.id,
    userEmail: session.user.email!,
    action,
    entityType,
    entityId,
    metadata,
  });
}
