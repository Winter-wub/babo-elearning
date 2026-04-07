import type { Role, TenantRole } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role?: Role;
    activeTenantId?: string | null;
    tenantRole?: TenantRole | null;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      activeTenantId?: string | null;
      tenantRole?: TenantRole | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    activeTenantId?: string | null;
    tenantRole?: TenantRole | null;
  }
}
