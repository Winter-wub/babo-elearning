import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import {
  OAUTH_KEYS,
  OAUTH_PROVIDER_IDS,
  type OAuthProviderId,
} from "@/lib/constants";

export type ResolvedOAuthProvider = {
  id: OAuthProviderId;
  clientId: string;
  clientSecret: string;
};

/**
 * Read enabled OAuth providers from the database.
 * Returns only providers that are enabled AND have valid credentials.
 * No in-memory cache — DB reads for 9 rows are cheap and avoids
 * stale config across multi-instance deployments (Fly.io).
 * No env var fallback — the DB `enabled` flag is the single source of truth.
 */
export async function getEnabledOAuthProviders(): Promise<
  ResolvedOAuthProvider[]
> {
  const allKeys = Object.values(OAUTH_KEYS).flatMap((k) => [
    k.enabled,
    k.clientId,
    k.clientSecret,
  ]);

  const items = await db.siteContent.findMany({
    where: { key: { in: allKeys } },
  });

  const raw: Record<string, string> = {};
  for (const item of items) {
    raw[item.key] = item.value;
  }

  const providers: ResolvedOAuthProvider[] = [];

  for (const id of OAUTH_PROVIDER_IDS) {
    const keys = OAUTH_KEYS[id];
    if (raw[keys.enabled] !== "true") continue;

    const clientId = raw[keys.clientId] || "";
    const encryptedSecret = raw[keys.clientSecret] || "";
    const clientSecret = encryptedSecret ? decrypt(encryptedSecret) : "";

    if (clientId && clientSecret) {
      providers.push({ id, clientId, clientSecret });
    }
  }

  return providers;
}
