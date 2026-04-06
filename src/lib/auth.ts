import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import Apple from "next-auth/providers/apple";
import bcrypt from "bcryptjs";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";
import { SESSION_MAX_AGE } from "@/lib/constants";
import {
  getEnabledOAuthProviders,
  type ResolvedOAuthProvider,
} from "@/lib/oauth-config";

// Map a resolved provider config to an Auth.js provider constructor
function buildOAuthProvider(p: ResolvedOAuthProvider) {
  switch (p.id) {
    case "google":
      return Google({ clientId: p.clientId, clientSecret: p.clientSecret });
    case "facebook":
      return Facebook({ clientId: p.clientId, clientSecret: p.clientSecret });
    case "apple":
      return Apple({ clientId: p.clientId, clientSecret: p.clientSecret });
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth(async () => {
  // Read enabled providers from DB. On any failure, fall back to
  // credentials-only so login never breaks entirely.
  let oauthProviders: ResolvedOAuthProvider[] = [];
  try {
    oauthProviders = await getEnabledOAuthProviders();
  } catch (err) {
    console.error("[auth] Failed to load OAuth providers, falling back to credentials-only:", err);
  }

  return {
    ...authConfig,

    adapter: PrismaAdapter(db),

    // Must be explicit: PrismaAdapter defaults to DB sessions, but we use JWT.
    session: {
      strategy: "jwt",
      maxAge: SESSION_MAX_AGE,
    },

    providers: [
      ...oauthProviders.map(buildOAuthProvider),
      Credentials({
        name: "credentials",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) return null;

          const user = await db.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user || !user.isActive) return null;

          if (!user.passwordHash) return null; // social-only user, no password

          const passwordValid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          );

          if (!passwordValid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        },
      }),
    ],

    callbacks: {
      // Preserve all existing callbacks from authConfig (authorized, jwt, session)
      ...authConfig.callbacks,

      // signIn callback: handles OAuth account linking.
      // Must live here (not auth.config.ts) because it uses Prisma (Node.js only).
      async signIn({ user, account, profile }) {
        // Only apply linking logic to OAuth providers
        if (account?.type !== "oauth") return true;

        const email = (user.email ?? (profile as Record<string, unknown>)?.email) as string | undefined;
        if (!email) return false; // No email (Facebook denied permission, etc.)

        const existingUser = await db.user.findUnique({ where: { email } });

        if (existingUser) {
          // Block inactive users
          if (!existingUser.isActive) return false;

          // Check if this provider is already linked
          try {
            const existingAccount = await db.account.findUnique({
              where: {
                provider_providerAccountId: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                },
              },
            });

            if (!existingAccount) {
              // First time using this provider — link it to the existing user
              await db.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  access_token: account.access_token,
                  refresh_token: account.refresh_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                },
              });
            }
          } catch (e: unknown) {
            // Handle race condition: unique constraint violation means another request already linked
            if ((e as { code?: string })?.code !== "P2002") throw e;
          }

          // Overwrite so jwt callback receives the existing DB user's id and role
          user.id = existingUser.id;
          (user as Record<string, unknown>).role = existingUser.role;
        }

        return true;
      },
    },
  };
});
