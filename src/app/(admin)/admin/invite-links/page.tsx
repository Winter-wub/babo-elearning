import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { listInviteLinks, getVideosForInviteSelect } from "@/actions/invite.actions";
import { InviteLinksManager } from "@/components/admin/invite-links-manager";
import { Spinner } from "@/components/ui/spinner";

export const metadata: Metadata = {
  title: "ลิงก์เชิญ",
};

interface InviteLinksPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
  }>;
}

async function InviteLinksContent({ searchParams }: InviteLinksPageProps) {
  const params = await searchParams;
  const page = params.page ? Number(params.page) : 1;

  const [invitesResult, videosResult] = await Promise.all([
    listInviteLinks({
      page,
      pageSize: 20,
      search: params.search,
      status: params.status,
    }),
    getVideosForInviteSelect(),
  ]);

  if (!invitesResult.success) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {invitesResult.error}
      </div>
    );
  }

  return (
    <InviteLinksManager
      invites={invitesResult.data.items}
      meta={invitesResult.data.meta}
      videos={videosResult.success ? videosResult.data : []}
      currentSearch={params.search ?? ""}
      currentStatusFilter={params.status ?? ""}
    />
  );
}

export default async function AdminInviteLinksPage(props: InviteLinksPageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">ลิงก์เชิญ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          สร้างลิงก์สำหรับให้นักเรียนสมัครและได้รับสิทธิ์วิดีโอโดยอัตโนมัติ
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        }
      >
        <InviteLinksContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
