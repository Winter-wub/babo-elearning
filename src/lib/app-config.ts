import { getSiteContent } from "@/actions/content.actions";
import { APP_NAME as DEFAULT_APP_NAME } from "@/lib/constants";
import { getDeploymentTenantId } from "@/lib/tenant";

/**
 * Fetch the configurable app name from SiteContent CMS.
 * Falls back to the APP_NAME constant if no CMS entry exists.
 * This is a server-only function — call it in server components or layouts.
 */
export async function getAppName(tenantId?: string): Promise<string> {
  try {
    const resolvedTenantId = tenantId ?? (await getDeploymentTenantId());
    const content = await getSiteContent(["app.name"], resolvedTenantId);
    return content["app.name"] ?? DEFAULT_APP_NAME;
  } catch {
    return DEFAULT_APP_NAME;
  }
}
