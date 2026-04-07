import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TenantsTable } from "@/components/admin/tenants-table";

export const metadata: Metadata = {
  title: "จัดการผู้เช่า (Tenants)",
};

interface TenantsPageProps {
  searchParams: Promise<{
    search?: string;
    isActive?: string;
    page?: string;
  }>;
}

// ---------------------------------------------------------------------------
// Stats cards — parallel queries
// ---------------------------------------------------------------------------

async function TenantStats() {
  const [total, active, suspended] = await Promise.all([
    db.tenant.count(),
    db.tenant.count({ where: { isActive: true } }),
    db.tenant.count({ where: { isActive: false } }),
  ]);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard title="ผู้เช่าทั้งหมด" value={total} icon={Building2} />
      <StatCard
        title="ใช้งานอยู่"
        value={active}
        icon={Building2}
        valueClassName="text-emerald-600 dark:text-emerald-400"
      />
      <StatCard
        title="ระงับการใช้งาน"
        value={suspended}
        icon={Building2}
        valueClassName="text-destructive"
      />
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
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
        <p className={`text-3xl font-bold tracking-tight ${valueClassName ?? ""}`}>
          {value.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tenant list — server-fetched, passed to client table
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

async function TenantsContent({ searchParams }: TenantsPageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const search = params.search ?? "";
  const isActiveFilter =
    params.isActive === "true"
      ? true
      : params.isActive === "false"
      ? false
      : undefined;

  const where = {
    ...(isActiveFilter !== undefined ? { isActive: isActiveFilter } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { slug: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [tenants, total] = await Promise.all([
    db.tenant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: {
          select: {
            members: true,
            videos: { where: { isActive: true } },
          },
        },
      },
    }),
    db.tenant.count({ where }),
  ]);

  return (
    <TenantsTable
      tenants={tenants}
      meta={{
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminTenantsPage(props: TenantsPageProps) {
  const session = await auth();
  // SUPER_ADMIN only
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/admin/dashboard");
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">จัดการผู้เช่า</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            สร้างและจัดการ tenants ทั้งหมดบนแพลตฟอร์ม
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/admin/tenants/new">
            <Plus className="mr-2 h-4 w-4" />
            เพิ่ม Tenant
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <Suspense
        fallback={
          <div className="grid gap-4 sm:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="flex h-24 items-center justify-center">
                  <Spinner />
                </CardContent>
              </Card>
            ))}
          </div>
        }
      >
        <TenantStats />
      </Suspense>

      {/* Table */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        }
      >
        <TenantsContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
