import { auth } from "@/lib/auth";
import { resolveTenantId, ensureTenantActive } from "@/lib/tenant";

/**
 * Require the current user to be a tenant admin (OWNER or ADMIN via TenantRole)
 * or a global ADMIN/SUPER_ADMIN. Returns the session and resolved tenantId.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("ไม่มีสิทธิ์");
  }

  const { role, tenantRole } = session.user;

  const isGlobalAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  const isTenantAdmin = tenantRole === "OWNER" || tenantRole === "ADMIN";

  if (!isGlobalAdmin && !isTenantAdmin) {
    throw new Error("ไม่มีสิทธิ์");
  }

  const tenantId = await resolveTenantId(session.user.activeTenantId);

  // Enforce tenant suspension — all admin actions fail on suspended tenants
  await ensureTenantActive();

  return { session, tenantId };
}

/**
 * Require the current user to be a SUPER_ADMIN (global role).
 * Used for cross-tenant operations like tenant management.
 */
export async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("ไม่มีสิทธิ์");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    throw new Error("ไม่มีสิทธิ์ — ต้องเป็น Super Admin");
  }

  return { session };
}
