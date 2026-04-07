"use server";

import { db } from "@/lib/db";
import { requireAdmin } from "@/actions/helpers";

export type AnalyticsSummary = {
  totalUsers: number;
  totalVideos: number;
  totalPermissions: number;
  activeVideos: number;
};

export type TopVideo = {
  id: string;
  title: string;
  playCount: number;
};

export type RoleDistribution = {
  name: string;
  value: number;
};

export type AnalyticsData = {
  summary: AnalyticsSummary;
  topVideos: TopVideo[];
  usersByMonth: Record<string, number>;
  permissionsByMonth: Record<string, number>;
  roleDistribution: RoleDistribution[];
};

export async function getAnalyticsData(): Promise<AnalyticsData> {
  const { tenantId } = await requireAdmin();

  const [totalUsers, totalVideos, totalPermissions, activeVideos] =
    await Promise.all([
      db.user.count({
        where: { tenantMembers: { some: { tenantId } } },
      }),
      db.video.count({ where: { tenantId } }),
      db.videoPermission.count({ where: { tenantId } }),
      db.video.count({ where: { tenantId, isActive: true } }),
    ]);

  // Top 10 videos by play count
  const topVideos = await db.video.findMany({
    where: { tenantId },
    orderBy: { playCount: "desc" },
    take: 10,
    select: { id: true, title: true, playCount: true },
  });

  // User registrations by month (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const recentMembers = await db.tenantMember.findMany({
    where: { tenantId, createdAt: { gte: sixMonthsAgo } },
    select: { createdAt: true },
  });

  const usersByMonth: Record<string, number> = {};
  for (const member of recentMembers) {
    const key = member.createdAt.toISOString().slice(0, 7); // YYYY-MM
    usersByMonth[key] = (usersByMonth[key] || 0) + 1;
  }

  // Permissions by month (last 6 months)
  const recentPermissions = await db.videoPermission.findMany({
    where: { tenantId, grantedAt: { gte: sixMonthsAgo } },
    select: { grantedAt: true },
  });

  const permissionsByMonth: Record<string, number> = {};
  for (const p of recentPermissions) {
    const key = p.grantedAt.toISOString().slice(0, 7);
    permissionsByMonth[key] = (permissionsByMonth[key] || 0) + 1;
  }

  // Role distribution (by TenantMember role, not global role)
  const [students, admins] = await Promise.all([
    db.tenantMember.count({ where: { tenantId, role: "STUDENT" } }),
    db.tenantMember.count({ where: { tenantId, role: { in: ["ADMIN", "OWNER"] } } }),
  ]);

  return {
    summary: { totalUsers, totalVideos, totalPermissions, activeVideos },
    topVideos,
    usersByMonth,
    permissionsByMonth,
    roleDistribution: [
      { name: "Students", value: students },
      { name: "Admins", value: admins },
    ],
  };
}
