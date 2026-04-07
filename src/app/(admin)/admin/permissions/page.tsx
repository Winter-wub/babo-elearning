import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import {
  getPermissionsPage,
  getAllUsersForSelect,
  getAllVideosForSelect,
} from "@/actions/permission.actions";
import { PermissionsManager } from "@/components/admin/permissions-manager";
import { Spinner } from "@/components/ui/spinner";

export const metadata: Metadata = {
  title: "จัดการสิทธิ์การเข้าถึง",
};

interface PermissionsPageProps {
  searchParams: Promise<{
    search?: string;
    videoId?: string;
    status?: string;
    page?: string;
  }>;
}

async function PermissionsContent({
  searchParams,
}: PermissionsPageProps) {
  const params = await searchParams;
  const page = params.page ? Number(params.page) : 1;

  const statusFilter = params.status as "permanent" | "active" | "expired" | "not_yet_active" | undefined;

  const [permissionsResult, usersResult, videosResult] = await Promise.all([
    getPermissionsPage(page, 20, {
      search: params.search,
      videoId: params.videoId,
      status: statusFilter,
    }),
    getAllUsersForSelect(),
    getAllVideosForSelect(),
  ]);

  if (!permissionsResult.success) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {permissionsResult.error}
      </div>
    );
  }

  return (
    <PermissionsManager
      permissions={permissionsResult.data.items}
      meta={permissionsResult.data.meta}
      users={usersResult.success ? usersResult.data : []}
      videos={videosResult.success ? videosResult.data : []}
      currentSearch={params.search ?? ""}
      currentVideoFilter={params.videoId ?? ""}
      currentStatusFilter={params.status ?? ""}
    />
  );
}

export default async function AdminPermissionsPage(
  props: PermissionsPageProps
) {
  // Defence-in-depth auth check
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN" && session.user.tenantRole !== "OWNER" && session.user.tenantRole !== "ADMIN")) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          จัดการสิทธิ์การเข้าถึง
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          จัดการสิทธิ์การเข้าถึงวิดีโอของผู้ใช้ทั้งหมด ให้สิทธิ์หรือเพิกถอนแบบกลุ่ม
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        }
      >
        <PermissionsContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
