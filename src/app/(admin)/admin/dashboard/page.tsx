import type { Metadata } from "next";
import { Users, Video, Shield, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { resolveTenantId } from "@/lib/tenant";

export const metadata: Metadata = {
  title: "แดชบอร์ดผู้ดูแลระบบ",
};

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  valueClassName?: string;
}

function StatCard({ title, value, icon: Icon, valueClassName }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-bold tracking-tight ${valueClassName ?? ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN" && session.user.tenantRole !== "OWNER" && session.user.tenantRole !== "ADMIN")) {
    redirect("/dashboard");
  }

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  const tenantId = await resolveTenantId(session.user.activeTenantId);

  // ── Tenant-scoped stats (shown to all admins) ──────────────
  const [totalUsers, totalVideos, activePermissions] = await Promise.all([
    db.user.count({ where: { tenantMembers: { some: { tenantId } } } }),
    db.video.count({ where: { tenantId, isActive: true } }),
    db.videoPermission.count({ where: { tenantId } }),
  ]);

  // ── Platform-wide stats (SUPER_ADMIN only) ─────────────────
  let platformStats: { totalTenants: number; activeTenants: number; totalUsersGlobal: number } | null = null;
  if (isSuperAdmin) {
    const [totalTenants, activeTenants, totalUsersGlobal] = await Promise.all([
      db.tenant.count(),
      db.tenant.count({ where: { isActive: true } }),
      db.user.count(),
    ]);
    platformStats = { totalTenants, activeTenants, totalUsersGlobal };
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">แดชบอร์ด</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your e-learning platform.
        </p>
      </div>

      {/* Platform Overview — SUPER_ADMIN only */}
      {platformStats && (
        <div className="mb-6">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Platform Overview
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              title="Tenants ทั้งหมด"
              value={platformStats.totalTenants.toLocaleString()}
              icon={Building2}
            />
            <StatCard
              title="Tenants ที่ใช้งาน"
              value={platformStats.activeTenants.toLocaleString()}
              icon={Building2}
              valueClassName="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              title="ผู้ใช้ทั้งแพลตฟอร์ม"
              value={platformStats.totalUsersGlobal.toLocaleString()}
              icon={Users}
            />
          </div>
        </div>
      )}

      {/* Tenant-scoped stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="ผู้ใช้ทั้งหมด"
          value={totalUsers.toLocaleString()}
          icon={Users}
        />
        <StatCard
          title="วิดีโอที่ใช้งาน"
          value={totalVideos.toLocaleString()}
          icon={Video}
        />
        <StatCard
          title="สิทธิ์ที่ใช้งาน"
          value={activePermissions.toLocaleString()}
          icon={Shield}
        />
      </div>
    </div>
  );
}
