import { db } from "@/lib/db";

/**
 * Deployment-level tenant resolution.
 *
 * Each deployment is configured with a TENANT_SLUG env var that identifies
 * which tenant this instance serves. The tenant ID is resolved once from the
 * database and cached for the lifetime of the process.
 */

let cachedTenantId: string | null = null;
let cachedTenantSlug: string | null = null;
let cachedTenantActive: boolean | null = null;

/** Returns the TENANT_SLUG env var. Throws if not configured. */
export function getDeploymentTenantSlug(): string {
  const slug =
    process.env.TENANT_SLUG ?? process.env.NEXT_PUBLIC_TENANT_SLUG;
  if (!slug) {
    throw new Error(
      "TENANT_SLUG (or NEXT_PUBLIC_TENANT_SLUG) env var is not set"
    );
  }
  return slug;
}

/** Resolves the deployment's tenant slug to a database tenant ID. Cached after first call. */
export async function getDeploymentTenantId(): Promise<string> {
  if (cachedTenantId) return cachedTenantId;

  const slug = getDeploymentTenantSlug();
  const tenant = await db.tenant.findUnique({
    where: { slug },
    select: { id: true, isActive: true },
  });

  if (!tenant) {
    throw new Error(`Tenant not found for slug: ${slug}`);
  }

  cachedTenantId = tenant.id;
  cachedTenantSlug = slug;
  cachedTenantActive = tenant.isActive;
  return cachedTenantId;
}

/**
 * Check if the deployment's tenant is active. Throws if suspended.
 * Call this in server actions and API routes to enforce tenant suspension.
 */
export async function ensureTenantActive(): Promise<void> {
  if (cachedTenantActive === false) {
    throw new Error("เทแนนท์นี้ถูกระงับการใช้งาน");
  }

  // If not yet cached, resolve and check
  if (cachedTenantActive === null) {
    await getDeploymentTenantId(); // populates cache
    if (cachedTenantActive === false) {
      throw new Error("เทแนนท์นี้ถูกระงับการใช้งาน");
    }
  }
}

/** Invalidate the cached tenant data. Call when tenant is updated. */
export function invalidateTenantCache(): void {
  cachedTenantId = null;
  cachedTenantSlug = null;
  cachedTenantActive = null;
}

/**
 * Returns the tenant ID from the session if available, otherwise falls back
 * to the deployment-level tenant ID. Use this in server actions as a
 * defense-in-depth replacement for `session.user.activeTenantId!`.
 */
export async function resolveTenantId(
  sessionTenantId?: string | null
): Promise<string> {
  if (sessionTenantId) return sessionTenantId;
  return getDeploymentTenantId();
}
