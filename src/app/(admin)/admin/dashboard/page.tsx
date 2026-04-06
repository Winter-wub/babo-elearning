import type { Metadata } from "next";
import { Users, Video, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "แดชบอร์ดผู้ดูแลระบบ",
};

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}

function StatCard({ title, value, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

/**
 * Admin dashboard — server component.
 *
 * Fetches real counts from the database using parallel queries so the three
 * stat cards always reflect the current state of the platform.
 *
 * Security: the ADMIN role requirement is enforced by both the middleware
 * (auth.config.ts authorized callback) and the auth() check below.  The
 * middleware is the primary guard; the check here is defence-in-depth.
 */
export default async function AdminDashboardPage() {
  // Defence-in-depth auth check — middleware is the primary guard.
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Run all three count queries in parallel to keep Time-To-First-Byte low.
  const [totalUsers, totalVideos, activePermissions] = await Promise.all([
    // All registered users regardless of role or active status
    db.user.count(),
    // Only active (non-soft-deleted) videos
    db.video.count({ where: { isActive: true } }),
    // Total permission grants currently in effect
    db.videoPermission.count(),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">แดชบอร์ด</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of your e-learning platform.
        </p>
      </div>

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
