"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getSiteContent, bulkUpdateSiteContent } from "@/actions/content.actions";
import { encrypt, decrypt, maskSecret } from "@/lib/crypto";
import {
  OAUTH_KEYS,
  OAUTH_PROVIDER_IDS,
  OAUTH_ENV_KEYS,
  type OAuthProviderId,
} from "@/lib/constants";
import type { ActionResult } from "@/types";

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("ไม่มีสิทธิ์");
  }
  return session;
}

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export type OAuthProviderConfig = {
  id: OAuthProviderId;
  enabled: boolean;
  clientId: string;
  clientSecretMasked: string;
  hasSecret: boolean;
};

// -----------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------

const UpdateProviderSchema = z.object({
  id: z.enum(OAUTH_PROVIDER_IDS),
  enabled: z.boolean(),
  clientId: z.string().max(500),
  clientSecret: z.string().max(2000).optional(),
});

// -----------------------------------------------------------------------
// Public — read enabled providers for login page (no auth required)
// -----------------------------------------------------------------------

/**
 * Returns the list of enabled OAuth provider IDs.
 * Called by login/register pages to show/hide social login buttons.
 */
export async function getEnabledOAuthProviders(): Promise<OAuthProviderId[]> {
  try {
    const enabledKeys = OAUTH_PROVIDER_IDS.map(
      (id) => OAUTH_KEYS[id].enabled
    );
    const raw = await getSiteContent(enabledKeys);
    return OAUTH_PROVIDER_IDS.filter(
      (id) => raw[OAUTH_KEYS[id].enabled] === "true"
    );
  } catch {
    return [];
  }
}

// -----------------------------------------------------------------------
// Admin — read provider configs (with masked secrets)
// -----------------------------------------------------------------------

/**
 * Fetch all OAuth provider configurations for the admin editor.
 * On first load with no DB config, pre-fills clientId from env vars
 * for easy migration.
 */
export async function getOAuthProviderConfigs(): Promise<OAuthProviderConfig[]> {
  await requireAdmin();

  const allKeys = Object.values(OAUTH_KEYS).flatMap((k) => [
    k.enabled,
    k.clientId,
    k.clientSecret,
  ]);
  const raw = await getSiteContent(allKeys);

  return OAUTH_PROVIDER_IDS.map((id) => {
    const keys = OAUTH_KEYS[id];
    const encryptedSecret = raw[keys.clientSecret] || "";
    const decryptedSecret = encryptedSecret ? decrypt(encryptedSecret) : "";

    // Seed clientId from env vars if no DB value exists yet
    const dbClientId = raw[keys.clientId];
    const clientId =
      dbClientId !== undefined && dbClientId !== ""
        ? dbClientId
        : process.env[OAUTH_ENV_KEYS[id].id] || "";

    return {
      id,
      enabled: raw[keys.enabled] === "true",
      clientId,
      clientSecretMasked: maskSecret(decryptedSecret),
      hasSecret: !!decryptedSecret,
    };
  });
}

// -----------------------------------------------------------------------
// Admin — update provider config
// -----------------------------------------------------------------------

/**
 * Validate and save an OAuth provider configuration (admin-only).
 * - `clientSecret` is optional: omit or send empty string to keep existing.
 * - When `enabled: true`, `clientId` must be non-empty.
 * - When `enabled: true` and no existing secret, `clientSecret` is required.
 */
export async function updateOAuthProvider(
  input: z.input<typeof UpdateProviderSchema>
): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin();
    const parsed = UpdateProviderSchema.parse(input);

    // Extra validation: non-empty credentials when enabling
    if (parsed.enabled) {
      if (!parsed.clientId.trim()) {
        return {
          success: false,
          error: "กรุณากรอก Client ID ก่อนเปิดใช้งาน",
        };
      }

      // Check if secret already exists in DB
      const existingKeys = await getSiteContent([
        OAUTH_KEYS[parsed.id].clientSecret,
      ]);
      const hasExistingSecret =
        !!existingKeys[OAUTH_KEYS[parsed.id].clientSecret];

      if (
        !hasExistingSecret &&
        (!parsed.clientSecret || !parsed.clientSecret.trim())
      ) {
        return {
          success: false,
          error: "กรุณากรอก Client Secret ก่อนเปิดใช้งาน",
        };
      }
    }

    const keys = OAUTH_KEYS[parsed.id];
    const entries: { key: string; value: string }[] = [
      { key: keys.enabled, value: String(parsed.enabled) },
      { key: keys.clientId, value: parsed.clientId },
    ];

    // Only update secret if a new one was provided
    if (parsed.clientSecret && parsed.clientSecret.trim()) {
      entries.push({
        key: keys.clientSecret,
        value: encrypt(parsed.clientSecret),
      });
    }

    const result = await bulkUpdateSiteContent(entries);
    if (!result.success) return result;

    revalidatePath("/", "layout");
    return { success: true, data: undefined };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof z.ZodError
          ? err.issues.map((i) => i.message).join(", ")
          : err instanceof Error
            ? err.message
            : "ไม่สามารถบันทึกการตั้งค่าผู้ให้บริการได้",
    };
  }
}
