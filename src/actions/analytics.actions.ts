"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("ไม่มีสิทธิ์");
  }
  return session;
}

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
  await requireAdmin();

  const [totalUsers, totalVideos, totalPermissions, activeVideos] =
    await Promise.all([
      db.user.count(),
      db.video.count(),
      db.videoPermission.count(),
      db.video.count({ where: { isActive: true } }),
    ]);

  // Top 10 videos by play count
  const topVideos = await db.video.findMany({
    orderBy: { playCount: "desc" },
    take: 10,
    select: { id: true, title: true, playCount: true },
  });

  // User registrations by month (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const recentUsers = await db.user.findMany({
    where: { createdAt: { gte: sixMonthsAgo } },
    select: { createdAt: true },
  });

  const usersByMonth: Record<string, number> = {};
  for (const user of recentUsers) {
    const key = user.createdAt.toISOString().slice(0, 7); // YYYY-MM
    usersByMonth[key] = (usersByMonth[key] || 0) + 1;
  }

  // Permissions by month (last 6 months)
  const recentPermissions = await db.videoPermission.findMany({
    where: { grantedAt: { gte: sixMonthsAgo } },
    select: { grantedAt: true },
  });

  const permissionsByMonth: Record<string, number> = {};
  for (const p of recentPermissions) {
    const key = p.grantedAt.toISOString().slice(0, 7);
    permissionsByMonth[key] = (permissionsByMonth[key] || 0) + 1;
  }

  // Role distribution
  const [students, admins] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }),
    db.user.count({ where: { role: "ADMIN" } }),
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
