"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";

type TenantOption = { id: string; name: string; slug: string };

export function TenantSwitcher() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, startTransition] = useTransition();

  const activeTenantId = session?.user?.activeTenantId;

  // Fetch tenant list on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { getAllTenantsForSwitcher } = await import("@/actions/tenant.actions");
      const result = await getAllTenantsForSwitcher();
      if (!cancelled && result.success) {
        setTenants(result.data);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  function handleSelect(tenantId: string) {
    if (tenantId === activeTenantId) return;

    startTransition(async () => {
      const { switchTenantContext } = await import("@/actions/tenant.actions");
      const result = await switchTenantContext(tenantId);
      if (!result.success) return;

      await update({
        activeTenantId: result.data.tenantId,
        tenantRole: result.data.tenantRole,
      });

      router.refresh();
    });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-sidebar-border px-3 py-2 text-sm text-sidebar-foreground/60">
        <Spinner size="sm" />
        <span>กำลังโหลด...</span>
      </div>
    );
  }

  return (
    <Select
      value={activeTenantId ?? undefined}
      onValueChange={handleSelect}
      disabled={switching}
    >
      <SelectTrigger
        className="w-full border-sidebar-border bg-transparent text-sidebar-foreground"
        aria-label="เลือก Tenant"
      >
        <div className="flex items-center gap-2 truncate">
          <Building2 className="h-4 w-4 shrink-0 opacity-50" />
          <SelectValue placeholder={switching ? "กำลังเปลี่ยน..." : "เลือก Tenant"} />
        </div>
      </SelectTrigger>
      <SelectContent>
        {tenants.map((tenant) => (
          <SelectItem key={tenant.id} value={tenant.id}>
            <div className="flex flex-col">
              <span>{tenant.name}</span>
              <span className="text-xs text-muted-foreground font-mono">{tenant.slug}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
