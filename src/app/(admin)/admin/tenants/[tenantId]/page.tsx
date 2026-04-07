import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TenantDetailShell } from "@/components/admin/tenant-detail-shell";

interface PageProps {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tenantId } = await params;
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });
  if (!tenant) return { title: "Tenant ไม่พบ" };
  return { title: `${tenant.name} — Tenant Detail` };
}

export default async function TenantDetailPage({ params, searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/admin/dashboard");
  }

  const { tenantId } = await params;
  const { tab } = await searchParams;

  // Fetch tenant with full stats in parallel
  const [tenant, memberCount, videoCount, playlistCount, permissionCount] =
    await Promise.all([
      db.tenant.findUnique({
        where: { id: tenantId },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, isActive: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      }),
      db.tenantMember.count({ where: { tenantId } }),
      db.video.count({ where: { tenantId, isActive: true } }),
      db.playlist.count({ where: { tenantId, isActive: true } }),
      db.videoPermission.count({ where: { tenantId } }),
    ]);

  if (!tenant) notFound();

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/admin/tenants">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            กลับไปรายการ Tenants
          </Link>
        </Button>
      </div>

      <TenantDetailShell
        tenant={tenant}
        stats={{ memberCount, videoCount, playlistCount, permissionCount }}
        defaultTab={tab ?? "overview"}
      />
    </div>
  );
}
